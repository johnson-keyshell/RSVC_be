const ApartmentsModel = require('../models/apartment');
const amenitiesService = require('../services/amenities');
const imageService = require('../services/images');
const config = require('../config/config');
const constants = require('../constants/constants');
const bcrypt = require('bcrypt');
const customFiledsService = require('../services/customFields');

/**
 * Function to get one row from the apartment table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findOne = async (params) => {
  try {
    params = params ? params() : [];
    let data = await ApartmentsModel.findOne(...params);
    data = data?.toJSON();
    data.Status = constants.ApartmentStatus[data?.Status ?? 0];
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to get rows from the apartment table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findMany = async (params) => {
  try {
    params = params ? params() : [];
    let data = await ApartmentsModel.findAll(...params);
    data = data?.map((entry) => entry.toJSON()) ?? [];
    for (const item of data) {
      item.Status = constants.ApartmentStatus[item?.Status ?? 0];
    }
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to save one row in the apartment table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const create = async (data) => {
  try {
    if (data?.ApartmentID) {
      const [row, created] = await ApartmentsModel.update(data, {
        where: { ApartmentID: data?.ApartmentID ?? null },
      });

      return await findOne(() => [{ where: { ApartmentID: data.ApartmentID } }]);
    } else {
      let row = await ApartmentsModel.create(data);
      return row?.toJSON();
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to update one row in the apartment table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const update = async (params) => {
  try {
    params = params ? params() : [];
    const [affectedRows, updatedRows] = await ApartmentsModel.update(...params);
    return [affectedRows, updatedRows];
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to delete rows in the apartment table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const deleteRow = async (query) => {
  try {
    let apartmentsToBeDeleted = await findMany(() => [query]);

    for (let apartment of apartmentsToBeDeleted) {
      // Remove the images linked to the apartment
      apartment?.Image && (await imageService.deleteRow({ where: { ImageID: apartment.Image } }));

      // delete all the additional fields added for this apartment
      await customFiledsService.deleteRow({
        where: {
          LinkedTo: apartment.ApartmentID,
        },
      });

      // lets remove all the amenities linked to this apartment
      await amenitiesService.deleteRow({
        where: { ReferenceID: apartment.ApartmentID },
      });
    }

    return await ApartmentsModel.destroy(query);
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
