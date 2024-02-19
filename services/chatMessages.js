const ChatMessageModel = require('../models/chatMessages');
const config = require('../config/config');
const websockets = require('../routes/websockets');
const chatService = require('../services/chat');
const userService = require('../services/users');
const rolesService = require('../services/roles');
const sailRecordService = require('../services/sailRecords');
const agreementService = require('../services/agentAgreement');
const propertyService = require('../services/properties');
const documentService = require('../services/document');
const imageService = require('../services/images');
const constants = require('../constants/constants');
const chatUiDataFormater = require('../services/ChatUIDataFormater');
const mailer = require('./utils/mailer/mailer');

/**
 * Function to get one row from the chat Message table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findOne = async (params) => {
  try {
    params = params ? params() : [];
    let data = await ChatMessageModel.findOne(...params);
    data = data?.toJSON();
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to get rows from the chat Message table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const findMany = async (params) => {
  try {
    params = params ? params() : [];
    let data = await ChatMessageModel.findAll(...params);
    data = data?.map((entry) => entry.toJSON()) ?? [];
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to get rows count from the chat Message table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const count = async (params) => {
  try {
    params = params ? params() : [];
    let data = await ChatMessageModel.count(...params);
    return data ?? 0;
  } catch (error) {
    console.error(error);
    return 0;
  }
};

/**
 * Function to save one row in the chat Message table
 * @param {Function} data data for the query function
 * @param {Function} ownerFlag The owner flag if the message is from owner chat
 * @returns {Object}
 */
const create = async (data, ownerFlag = false) => {
  try {
    let message = {};
    console.log('In create Message: ', websockets.activeChat, websockets.activeChatList, websockets.userConnections);
    if (data?.ChatMesssageID) {
      const [row, created] = await ChatMessageModel.update(data, {
        where: { ChatMesssageID: data?.ChatMesssageID ?? null },
      });
      message = await findOne(() => [{ where: { ChatMesssageID: data.ChatMesssageID } }]);
    } else {
      message = await ChatMessageModel.create(data);
      message = message?.toJSON();
      // we will send notification to both from and to users - to handle the case where the from user has two active chat sessions opend up
      for (let user of [message.To, message.From]) {
        // We need to send the message to the FE via socket if this chat is open
        console.log('Created new message: ', user, websockets.userConnections?.[user]);
        if (websockets.userConnections?.[user]) {
          for (let userSocket of websockets.userConnections[user]) {
            console.log(userSocket, websockets.activeChat?.[`${user}_${userSocket}`], message.ChatID);
            // we need to emit signal if this chatid is open in any of the the scoket connection
            if (websockets.activeChat?.[`${user}_${userSocket}`] == message.ChatID) {
              // if any one of the sessions has the chat open , then we can mark the chat as read
              if (!message.ReadFlag && user == message.To) {
                await ChatMessageModel.update({ ReadFlag: true }, { where: { ChatMesssageID: message.ChatMesssageID } });
                message.ReadFlag = true;
              }
              let messageData = await chatUiDataFormater.formatChatMessage(message);
              if (messageData) {
                websockets.socketIo.io.to(userSocket).emit('new-message', messageData);
              }
            }
          }
        }
      }

      // If the message was not read then we need to send a mail to the user -
      // This has to be done only if the To user is a buyer
      let toUser = await userService.findOne(() => [{ where: { UserName: message.To } }]);
      let toUserRole = await rolesService.findOne(() => [{ where: { RoleID: toUser.Role } }]);
      if (toUserRole.RoleName == 'buyer' && !message.ReadFlag) {
        await sendChatMail(message, toUser.eMail);
      }
      // We have to do this below the above code because we don't want to show unread message count in the chat list if the chat was already open and read
      // update last message time in chat table and send socket notification to update chat list
      let chat = await chatService.create({ ChatID: message.ChatID, LastMessageTime: message.Time }, ownerFlag);

      if (!ownerFlag) {
        // We need to fetch the owner and update his chat as well if it is open
        let sailRecord = await sailRecordService.findOne(() => [{ where: { SailID: chat.SailID } }]);
        let property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);
        if (websockets.userConnections?.[property.Owner]) {
          for (let userSocket of websockets.userConnections?.[property.Owner]) {
            if (websockets.activeChat?.[`${property.Owner}_${userSocket}`] == message.ChatID) {
              let messageData = await chatUiDataFormater.formatChatMessage(message);
              websockets.socketIo.io.to(userSocket).emit('new-message', messageData);
            }
          }
        }
      }
    }

    return message;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const sendChatMail = async (message, senderEmail) => {
  try {
    let fromUser = await userService.findOne(() => [{ where: { UserName: message.From } }]);
    let chat = await chatService.findOne(() => [{ where: { ChatID: message.ChatID } }]);
    const customDisplayName = `RSVC admin <${config.mailInfo.eMail}>`;
    const toEmail = [senderEmail];
    const subject = `You have a new message from ${fromUser.FirstName}${fromUser.LastName ? ' ' + fromUser.LastName : ''}`;
    const mailMessage =
      message.MessageType == 0
        ? message.MessageBody
        : `The agent, ${fromUser.FirstName}${
            fromUser.LastName ? ' ' + fromUser.LastName : ''
          }, has uploaded a document. Kindly login into the application to view it in the respective chat.`;
    let mailSentResponse = await mailer.sendEmailWithCustomDisplayName(
      customDisplayName,
      toEmail,
      subject,
      mailMessage,
      chat?.MailThreadID
    );
    await chatService.create({ ChatID: message.ChatID, MailThreadID: mailSentResponse.threadId });
  } catch (error) {
    console.error(error);
  }
};

/**
 * Function to update one row in the chat Message table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const update = async (params) => {
  try {
    params = params ? params() : [];
    const [affectedRows, updatedRows] = await ChatMessageModel.update(...params);
    return [affectedRows, updatedRows];
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to delete rows in the chat Message table
 * @param {Function} params Params for the query function
 * @returns {Object}
 */
const deleteRow = async (query) => {
  try {
    return await ChatMessageModel.destroy(query);
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to get the unread chats
 * @param {String} user The user name
 * @returns The count of unread chats
 */
const getUnreadChatsCountForUser = async (user) => {
  try {
    const unreadChatsCount = await ChatMessageModel.count({
      distinct: true,
      col: 'ChatID',
      where: {
        To: user,
        ReadFlag: false,
      },
    });

    return unreadChatsCount;
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
  count,
  getUnreadChatsCountForUser,
};
