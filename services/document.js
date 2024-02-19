const DocumentModel = require('../models/documents');
const config = require('../config/config');
const bcrypt = require('bcrypt');

/**
 * Function to get one row from the document table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findOne = async (params) => {
  try {
    params = params ? params() : [];
    let data = await DocumentModel.findOne(...params);
    data = data?.toJSON();
    if (!data.DocumentLink) {
      data.DocumentLink = `/document/${data.DocumentID}`;
    }
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to get rows from the document table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findMany = async (params) => {
  try {
    params = params ? params() : [];
    let data = await DocumentModel.findAll(...params);
    data = data?.map((entry) => entry.toJSON()) ?? [];
    for (const item of data) {
      if (!item.DocumentLink) {
        item.DocumentLink = `/document/${item.DocumentID}`;
      }
    }
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to save one row in the document table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const create = async (data) => {
  try {
    if (data?.DocumentID) {
      const [row, created] = await DocumentModel.update(data, {
        where: { DocumentID: data?.DocumentID ?? null },
      });

      return await findOne(() => [{ where: { DocumentID: data.DocumentID } }]);
    } else {
      let row = await DocumentModel.create(data);
      return row.toJSON();
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to update one row in the document table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const update = async (params) => {
  try {
    params = params ? params() : [];
    const [affectedRows, updatedRows] = await DocumentModel.update(...params);
    return [affectedRows, updatedRows];
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to delete rows in the document table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const deleteRow = async (query) => {
  try {
    return await DocumentModel.destroy(query);
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
