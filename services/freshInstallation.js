const userService = require('../services/users');
const rolesService = require('../services/roles');
const firstTimeData = require('../config/firstTimeData');
const UserModel = require('../models/users');

/**
 * Function to determine if this is a fresh installation
 * @returns {Boolean} Ture if this is a fresh installation
 */
const isFreshInstallation = async () => {
  try {
    let user = await userService.findOne(() => [{ where: { UserName: 'admin' } }]);
    return !user;
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * Function to import the first time installation data
 */
const importFirstTimeData = async () => {
  try {
    // add the roles
    for (let role of firstTimeData.roles) {
      await rolesService.create(role);
    }
    // save  users
    for (let user of firstTimeData.users) {
      let role = await rolesService.findOne(() => [{ where: { RoleName: user.Role } }]);
      await userService.create({ ...user, Role: role.RoleID, HashPassword: user.password });
    }
  } catch (error) {
    console.error(error);
  }
};

const addAgentsManually = async (data) => {
  let agentData = data?.agents;
  try {
    // save  users
    for (let user of agentData) {
      let role = await rolesService.findOne(() => [{ where: { RoleName: user.Role } }]);
      let data = { ...user, Role: role.RoleID, HashPassword: user.password };
      await UserModel.create(data);
    }
  } catch (error) {
    return error;
  }
};

module.exports = {
  isFreshInstallation,
  importFirstTimeData,
  addAgentsManually,
};
