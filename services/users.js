const UserModel = require('../models/users');
const bcrypt = require('bcrypt');
const Roles = require('../models/roles');

/**
 * Function to get one row from the user table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findOne = async (params) => {
  try {
    params = params ? params() : [];
    const data = await UserModel.findOne(...params);
    return data?.toJSON();
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to get rows from the user table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findMany = async (params) => {
  try {
    params = params ? params() : [];
    let data = await UserModel.findAll(...params);
    data = data?.map((entry) => entry.toJSON()) ?? [];
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const getAllAgents = async (params) => {
  try {
    let query = [{ RoleName: 'agent' }];
    const roleId = await Roles.findOne({ where: { RoleName: 'agent' } });
    let agents = [];
    agents = await UserModel.findAll({
      where: {
        Role: roleId?.RoleID,
      },
    });
    return agents;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const getAllBuyers = async (params) => {
  try {
    let query = [{ RoleName: 'buyer' }];
    const roleId = await Roles.findOne({ where: { RoleName: 'buyer' } });
    console.log('ROLE ID----------', roleId);
    let buyers = [];
    buyers = await UserModel.findAll({
      where: {
        Role: roleId?.RoleID,
      },
    });
    return buyers;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to save one row in the user table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const create = async (data) => {
  try {
    if (data?.UserName) {
      let user = await findOne(() => [{ where: { UserName: data.UserName } }]);
      if (user) {
        const [row, created] = await UserModel.update(data, {
          where: { UserName: data?.UserName ?? null },
        });
        return await findOne(() => [{ where: { UserName: data.UserName } }]);
      } else {
        let row = await UserModel.create(data);
        return row?.toJSON();
      }
    } else {
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

const addNewAgents = async (data) => {
  try {
    if (data) {
      const result = await UserModel.create(data);
      // return await UserModel.create(data);
    }
  } catch (error) {
    return null;
  }
};

/**
 * Function to update one row in the user table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const update = async (params) => {
  try {
    params = params ? params() : [];
    const [affectedRows, updatedRows] = await UserModel.update(...params);
    return [affectedRows, updatedRows];
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to delete rows in the user table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const deleteRow = async (query) => {
  try {
    return await UserModel.destroy(query);
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Functin to validate user password
 * @param {String} username The username
 * @param {String} enteredPassword The password to be checked
 * @returns {Boolean} Trues if the password is correct
 */
async function validatePassword(username, enteredPassword) {
  try {
    const user = await UserModel.findOne({ where: { UserName: username } });

    if (!user) {
      console.log('User not found');
      return false;
    }

    const passwordMatch = await bcrypt.compare(enteredPassword, user.HashPassword);

    if (passwordMatch) {
      console.log('Password is correct');
      return true;
    } else {
      console.log('Password is incorrect');
      return false;
    }
  } catch (error) {
    console.error('Error finding user:', error);
    throw error;
  }
}

module.exports = {
  findOne,
  findMany,
  update,
  deleteRow,
  validatePassword,
  create,
  addNewAgents,
  getAllAgents,
  getAllBuyers,
};
