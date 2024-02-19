const { Op } = require('sequelize');

const propertyService = require('../services/properties');
const floorService = require('../services/floors');
const apartmentService = require('../services/apartments');
const amenityService = require('../services/amenities');
const sailRecordService = require('../services/sailRecords');
const sailItemService = require('../services/sailItem');
const imagesService = require('../services/images');
const notificationService = require('../services/notification');
const userService = require('../services/users');
const structuralDetailsService = require('../services/structuralDetails');
const chatService = require('../services/chat');
const addressService = require('../services/addresses');
const chatMessageService = require('../services/chatMessages');
const chatUiDataFormater = require('../services/ChatUIDataFormater');
const messageService = require('../services/messages');
const rolesService = require('../services/roles');
const mailer = require('../services/utils/mailer/mailer');
const config = require('../config/config');
const constants = require('../constants/constants');

/**
 * Function to fetch the list of all the chats with buyers
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.getBuyerChatList = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let chats = await chatService.findMany(() => [
      {
        order: [['LastMessageTime', 'DESC']],
        where: {
          [Op.or]: [{ User1: user }, { User2: user }],
          Status: { [Op.in]: [0, 2, 1, 3] },
          SailID: { [Op.not]: null }, // The buyer chat will always contain the SailID, the owner chat will not contain the sailID
        },
      },
    ]);

    let list = [];
    for (let chat of chats) {
      let chatData = await chatUiDataFormater.fetchChatDetails(chat, user);
      if (chatData) {
        list.push(chatData);
      }
    }

    res.status(200).send(list);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to fetch the list of all the chats with sellers
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.getSellerChatList = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let chats = await chatService.findMany(() => [
      {
        order: [['LastMessageTime', 'DESC']],
        where: {
          [Op.or]: [{ User1: user }, { User2: user }],
          SailID: { [Op.is]: null }, // The buyer chat will always contain the SailID, the owner chat will not contain the sailID
        },
      },
    ]);

    let list = [];
    for (let chat of chats) {
      let chatData = await chatUiDataFormater.fetchChatDetailsAsAgent(chat, user);
      if (chatData) {
        list.push(chatData);
      }
    }

    res.status(200).send(list);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to fetch the list of all the chats
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.getChatMessages = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let chatId = req.params.id;
    let chatsMessages = await chatMessageService.findMany(() => [
      {
        order: [['Time', 'DESC']],
        where: {
          ChatID: chatId,
        },
      },
    ]);

    let messages = [];
    for (let message of chatsMessages) {
      let messageData = await chatUiDataFormater.formatChatMessage(message);
      if (messageData) {
        messages.push(messageData);
      }
    }

    res.status(200).send(messages);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to set the read flag for chat messages
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.setReadFlagForChatID = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let chatId = req.params.id;
    await chatMessageService.update(() => [{ ReadFlag: true }, { where: { ChatID: chatId, To: user } }]);

    res.status(200).send('Done');
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to fetch the list of all the chats
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.sendMessage = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let data = req.body;
    let chat = await chatService.findOne(() => [{ where: { ChatID: data.chatId } }]);
    if ([1, 2].includes(chat?.Status)) {
      res.send(403).send('Agent not allowed to send messages to this chat');
      return;
    }

    let agent = await userService.findOne(() => [{ where: { UserName: user } }]);
    let messageTypes = constants.MessageType.map((type) => type.toLowerCase());
    let buyer = await userService.findOne(() => [{ where: { UserName: data.to } }]);
    let role = await rolesService.findOne(() => [{ where: { RoleID: buyer.Role } }]);

    let message = await chatMessageService.create(
      {
        From: user,
        To: data.to,
        MessageBody: data.message,
        MessageType: messageTypes.indexOf(data?.messageType?.toLowerCase() ?? 'text'),
        Time: new Date(),
        ChatID: data.chatId,
      },
      role.RoleName == 'buyer' ? false : true
    );

    if (role.RoleName == 'buyer') {
      // if this message is send to a hidden buyer chat then we need to make it active and send the message via mail to the buyer
      if ([0].includes(chat?.Status)) {
        await chatService.create({
          ChatID: data.chatId,
          Status: 3,
        });
        let sailRecord = await sailRecordService.findOne(() => [{ where: { SailID: chat.SailID } }]);
        let property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);

        // Send Notification to Owner to add agents via mail and application notification
        const customDisplayName = `${agent.FirstName} via RSVC <${config.mailInfo.eMail}>`;
        const toEmail = [buyer.eMail];
        const subject = `Agent contacted you regarding property, ${property.PropertyName}`;
        const message = `The agent, ${agent.FirstName}, has send you the following message via the RSVC application: "${data.message}". 
      You may reply to this mail or login to the application to chat further.`;
        await mailer.sendEmailWithCustomDisplayName(customDisplayName, toEmail, subject, message);
      }
    }
    res.status(200).send(message.ChatMesssageID);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to fetch the list of all the chats
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.initiateChat = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let partner = req.body.partner;
    let chat = await chatService.findOne(() => [
      {
        where: {
          [Op.or]: [
            { User1: user, User2: partner },
            { User1: partner, User2: user },
          ],
        },
      },
    ]);
    if (!chat) {
      // Create a new chat
      chat = await chatService.create(
        {
          Status: 3, // Active
          User1: user,
          User2: partner,
        },
        true
      );
    }

    res.status(200).send(chat);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};
