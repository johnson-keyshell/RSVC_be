const RolesModel = require('../models/roles');

/**
 * Function to get one row from the table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findOne = async (params) => {
  try {
    params = params ? params() : [];
    const data = await RolesModel.findOne(...params);
    return data?.toJSON();
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to get rows from the table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findMany = async (params) => {
  try {
    params = params ? params() : [];
    let data = await RolesModel.findAll(...params);
    data = data?.map((entry) => entry.toJSON()) ?? [];
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to save one row in the table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const create = async (data) => {
  try {
    if (data?.RoleID) {
      const [row, created] = await RolesModel.update(data, {
        where: { RoleID: data?.RoleID ?? null },
      });

      return await findOne(() => [{ where: { RoleID: data.RoleID } }]);
    } else {
      let row = await RolesModel.create(data);
      return row?.toJSON();
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to update one row in the roles table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const update = async (params) => {
  try {
    params = params ? params() : [];
    const [affectedRows, updatedRows] = await RolesModel.update(...params);
    return [affectedRows, updatedRows];
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to delete rows in the table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const deleteRow = async (query) => {
  try {
    return await RolesModel.destroy(query);
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
