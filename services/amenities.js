const AmenitiesModel = require('../models/amenities');
const { AmenityTypes } = require('../constants/constants');
const imageService = require('../services/images');
const config = require('../config/config');

/**
 * Function to get one row from the amenity table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findOne = async (params) => {
  try {
    params = params ? params() : [];
    let data = await AmenitiesModel.findOne(...params);
    data = data?.toJSON();
    data = { ...data, iconLink: AmenityTypes?.[data.AmenityType] ?? 'default_amenity_icon.jpg' };
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to get rows from the amenity table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findMany = async (params) => {
  try {
    params = params ? params() : [];
    let data = await AmenitiesModel.findAll(...params);
    data = data?.map((entry) => entry.toJSON()) ?? [];
    data = data.map((entry) => ({ ...entry, iconLink: AmenityTypes?.[entry.AmenityType] ?? 'default_amenity_icon.jpg' }));
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to save one row in the amenity table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const create = async (data) => {
  try {
    if (data?.AmenityID) {
      const [row, created] = await AmenitiesModel.update(data, {
        where: { AmenityID: data?.AmenityID ?? null },
      });

      return await findOne(() => [{ where: { AmenityID: data.AmenityID } }]);
    } else {
      let row = await AmenitiesModel.create(data);
      return row?.toJSON();
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to update one row in the amenities table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const update = async (params) => {
  try {
    params = params ? params() : [];
    const [affectedRows, updatedRows] = await AmenitiesModel.update(...params);
    return [affectedRows, updatedRows];
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to delete rows in the amenity table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const deleteRow = async (query) => {
  try {
    let amenitiesToBeDeleted = await findMany(() => [query]);

    for (let amenity of amenitiesToBeDeleted) {
      // Remove the images linked to the amenity
      amenity?.Image && (await imageService.deleteRow({ where: { ImageID: amenity.Image } }));
    }

    return await AmenitiesModel.destroy(query);
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
