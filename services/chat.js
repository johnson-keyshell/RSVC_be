const propertyService = require('../services/properties');
const sailRecordService = require('../services/sailRecords');
const userService = require('../services/users');
const rolesService = require('../services/roles');
const chatUiDataFormater = require('../services/ChatUIDataFormater');

const ChatModel = require('../models/chat');
const websockets = require('../routes/websockets');

/**
 * Function to get one row from the chat table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findOne = async (params) => {
  try {
    params = params ? params() : [];
    let data = await ChatModel.findOne(...params);
    data = data?.toJSON() ?? null;
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to get rows from the chat table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findMany = async (params) => {
  try {
    params = params ? params() : [];
    let data = await ChatModel.findAll(...params);
    data = data?.map((entry) => entry.toJSON()) ?? [];
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to save one row in the chat table
 * @param {Function} params Params for the query function
 * @param {Function} ownerFlag The owner flag if the message is from owner chat
 * @returns {Object}
 */
const create = async (data, ownerFlag = false) => {
  try {
    let chat = {};
    if (data?.ChatID) {
      const [row, created] = await ChatModel.update(data, {
        where: { ChatID: data?.ChatID ?? null },
      });

      chat = await findOne(() => [{ where: { ChatID: data.ChatID } }]);
    } else {
      chat = await ChatModel.create(data);
      chat = chat?.toJSON();
    }
    console.log('Updating chatList: ', [chat.User1, chat.User2], websockets.activeChatList);

    // If the chat screen is open on the user side then we need to make the change in the chat list
    for (let user of [chat.User1, chat.User2]) {
      if (websockets.activeChatList?.[user]) {
        for (let userSocket of websockets.activeChatList?.[user]) {
          let userInfo = await userService.findOne(() => [{ where: { UserName: user } }]);
          let role = await rolesService.findOne(() => [{ where: { RoleID: userInfo.Role } }]);
          let chatData =
            role.RoleName == 'owner'
              ? await chatUiDataFormater.fetchChatDetailsAsOwner(chat, user)
              : role.RoleName == 'agent'
              ? await chatUiDataFormater.fetchChatDetailsAsAgent(chat, user)
              : await chatUiDataFormater.fetchChatDetails(chat, user);
          websockets.socketIo.io.to(userSocket).emit('chat-list-update', chatData);
          console.log('üpdated: ', userSocket);
        }
      }
    }
    if (!ownerFlag) {
      let sailRecord = await sailRecordService.findOne(() => [{ where: { SailID: chat.SailID } }]);
      let property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);
      // We need to fetch the owner and update his chat screen as well if it is open
      if (websockets.activeChatList?.[property.Owner]) {
        for (let userSocket of websockets.activeChatList?.[property.Owner]) {
          let chatData = await chatUiDataFormater.fetchChatDetailsAsOwner(chat, property.Owner);
          websockets.socketIo.io.to(userSocket).emit('chat-list-update', chatData);
        }
      }
    }
    return chat;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to update one row in the chat table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const update = async (params) => {
  try {
    params = params ? params() : [];
    const [affectedRows, updatedRows] = await ChatModel.update(...params);
    return [affectedRows, updatedRows];
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to delete rows in the chat table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const deleteRow = async (query) => {
  try {
    return await ChatModel.destroy(query);
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
