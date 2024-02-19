const FloorsModel = require('../models/floors');
const apartmentService = require('../services/apartments');
const imageService = require('../services/images');
const config = require('../config/config');
const bcrypt = require('bcrypt');

/**
 * Function to get one row from the floor table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findOne = async (params) => {
  try {
    params = params ? params() : [];
    let data = await FloorsModel.findOne(...params);
    data = data?.toJSON();
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to get rows from the floor table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findMany = async (params) => {
  try {
    params = params ? params() : [];
    let data = await FloorsModel.findAll(...params);
    data = data?.map((entry) => entry.toJSON()) ?? [];
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to save one row in the floor table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const create = async (data) => {
  try {
    if (data?.FloorID) {
      const [row, created] = await FloorsModel.update(data, {
        where: { FloorID: data?.FloorID ?? null },
      });

      return await findOne(() => [{ where: { FloorID: data.FloorID } }]);
    } else {
      let row = await FloorsModel.create(data);
      return row?.toJSON();
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to update one row in the floor table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const update = async (params) => {
  try {
    params = params ? params() : [];
    const [affectedRows, updatedRows] = await FloorsModel.update(...params);
    return [affectedRows, updatedRows];
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to delete rows in the floor table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const deleteRow = async (query) => {
  try {
    let floorsToBeDeleted = await findMany(() => [query]);

    for (let floor of floorsToBeDeleted) {
      // Remove the images linked to the floor
      floor?.LayoutImage && (await imageService.deleteRow({ where: { ImageID: floor.LayoutImage } }));

      // lets remove all the apartments linked to this floor
      await apartmentService.deleteRow({
        where: { Floor: floor.FloorID },
      });
    }

    return await FloorsModel.destroy(query);
  } catch (error) {
    console.error(error);
    return null;
  }
};

module.exports = {
  findOne,
  findMany,
  update,
  deleteRow,
  create,
};
