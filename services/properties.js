const PropertiesModel = require('../models/properties');
const config = require('../config/config');
const bcrypt = require('bcrypt');

/**
 * Function to get one row from the property table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findOne = async (params) => {
  try {
    params = params ? params() : [];
    let data = await PropertiesModel.findOne(...params);
    data = data?.toJSON();
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to get rows from the property table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findMany = async (params) => {
  try {
    params = params ? params() : [];
    let data = await PropertiesModel.findAll(...params);
    data = data?.map((entry) => entry.toJSON()) ?? [];
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to save one row in the property table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const create = async (data) => {
  try {
    if (data?.PropertyID) {
      const [row, created] = await PropertiesModel.update(data, {
        where: { PropertyID: data?.PropertyID ?? null },
      });

      return await findOne(() => [{ where: { PropertyID: data.PropertyID } }]);
    } else {
      let row = await PropertiesModel.create(data);
      return row?.toJSON();
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to update one row in the propety table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const update = async (params) => {
  try {
    params = params ? params() : [];
    const [affectedRows, updatedRows] = await PropertiesModel.update(...params);
    return [affectedRows, updatedRows];
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to delete rows in the property table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const deleteRow = async (query) => {
  try {
    return await PropertiesModel.destroy(query);
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
