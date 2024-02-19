const SailRecordModel = require('../models/sailrecords');
const config = require('../config/config');
const bcrypt = require('bcrypt');

/**
 * Function to get one row from the sail record table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findOne = async (params) => {
  try {
    params = params ? params() : [];
    let data = await SailRecordModel.findOne(...params);
    data = data?.toJSON();
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to get rows from the sail record table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findMany = async (params) => {
  try {
    params = params ? params() : [];
    let data = await SailRecordModel.findAll(...params);
    data = data?.map((entry) => entry.toJSON()) ?? [];
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to count rows from the sail record table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const countRecords = async (params) => {
  try {
    params = params ? params() : [];
    let data = await SailRecordModel.count(...params);
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to save one row in the sail record table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const create = async (data) => {
  try {
    if (data?.SailID) {
      const [row, created] = await SailRecordModel.update(data, {
        where: { SailID: data?.SailID ?? null },
      });

      return await findOne(() => [{ where: { SailID: data.SailID } }]);
    } else {
      let row = await SailRecordModel.create(data);
      return row?.toJSON();
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to update one row in the sail record table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const update = async (params) => {
  try {
    params = params ? params() : [];
    const [affectedRows, updatedRows] = await SailRecordModel.update(...params);
    return [affectedRows, updatedRows];
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to delete rows in the sail record table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const deleteRow = async (query) => {
  try {
    return await SailRecordModel.destroy(query);
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
  countRecords,
  create,
};
