const NotificationModel = require('../models/notifications');
const config = require('../config/config');
const bcrypt = require('bcrypt');
const websockets = require('../routes/websockets');

/**
 * Function to get one row from the notification table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findOne = async (params) => {
  try {
    params = params ? params() : [];
    let data = await NotificationModel.findOne(...params);
    data = data?.toJSON();
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to get rows from the notification table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findMany = async (params) => {
  try {
    params = params ? params() : [];
    let data = await NotificationModel.findAll(...params);
    data = data?.map((entry) => entry.toJSON()) ?? [];
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to save one row in the notification table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const create = async (data) => {
  try {
    if (data?.NotificationID) {
      const [row, created] = await NotificationModel.update(data, {
        where: { NotificationID: data?.NotificationID ?? null },
      });

      return await findOne(() => [{ where: { NotificationID: data.NotificationID } }]);
    } else {
      // we need to send notification via web socket
      if (websockets.userConnections?.[data.User]) {
        for (let userSocket of websockets.userConnections?.[data.User]) {
          websockets.socketIo.io.to(userSocket).emit('new-notification', data);
        }
      }
      let row = await NotificationModel.create(data);
      return row?.toJSON();
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to update one row in the notification table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const update = async (params) => {
  try {
    params = params ? params() : [];
    const [affectedRows, updatedRows] = await NotificationModel.update(...params);
    return [affectedRows, updatedRows];
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to delete rows in the notification table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const deleteRow = async (query) => {
  try {
    return await NotificationModel.destroy(query);
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
