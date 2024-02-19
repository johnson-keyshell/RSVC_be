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
const messageService = require('../services/messages');
const rolesService = require('../services/roles');
const mailer = require('../services/utils/mailer/mailer');
const config = require('../config/config');
const constants = require('../constants/constants');
const chatUiDataFormater = require('../services/ChatUIDataFormater');
const customFiledsService = require('../services/customFields');

/**
 * Function to fetch the properties list
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 *
 * TBD: We need to update this controller dependin on the future changes
 */
exports.getLandingPageInfo = async (req, res, next) => {
  try {
    // We will have to replace the finone by findmany below in the future and provide proper where clause
    let property = await propertyService.findOne(() => [{}]);

    // Get main Image link
    let mainImage = await imagesService.findOne(() => [{ where: { ImageID: property.MainImage } }]);

    let images = await imagesService.findMany(() => [{ where: { [Op.or]: [{ LinkedTo: property?.PropertyID }] } }]);

    res.send({
      propertyName: property.PropertyName,
      propertyId: property.PropertyID,
      mainImage,
      images,
      tagLine: 'BHQ',
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to fetch the sail selection item list for a buyer for a specific property
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.getSailSelectionForProperty = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let propertyId = req.params.id;

    // Get the sail record
    let sailRecord = await sailRecordService.findOne(() => [{ where: { Property: propertyId, Buyer: user } }]);

    // Get the property
    let property = await propertyService.findOne(() => [{ where: { PropertyID: propertyId } }]);

    if (!sailRecord) {
      res.send({
        propertyName: property.PropertyName,
        propertyId: property.PropertyID,
        selection: [],
      });
      return;
    }

    // Set the sail status
    sailRecord.SailStatus = constants.SailStatus[sailRecord.SailStatus];

    // Get the sail items
    let sailItems = await sailItemService.findMany(() => [{ where: { SailID: sailRecord.SailID } }]);

    let selection = {};
    // iteerate through each sail item anc construct the final selection object
    for (let sailItem of sailItems) {
      let floor = await floorService.findOne(() => [{ where: { FloorID: sailItem.FloorID } }]);

      let layoutImage = await imagesService.findOne(() => [{ where: { ImageID: floor.LayoutImage } }]);
      floor.layoutImage = layoutImage;
      let apartment = await apartmentService.findOne(() => [{ where: { ApartmentID: sailItem.ApartmentID } }]);
      // Get the image link
      if (apartment.Image) {
        let image = await imagesService.findOne(() => [{ where: { ImageID: apartment.Image } }]);
        apartment.Image = image;
      }

      // Get the custom fields for the apartment
      let additionalDetails = await customFiledsService.findMany(() => [{ where: { LinkedTo: apartment.ApartmentID } }]);
      if (additionalDetails?.length) {
        additionalDetails = additionalDetails.reduce((prv, crr) => ({ ...prv, [crr.FieldName]: crr.FieldValue }), {});
      }
      apartment.additionalFields = additionalDetails;

      // Get the amenities
      let amenities = await amenityService.findMany(() => [{ where: { ReferenceID: apartment.ApartmentID } }]);
      // Get the image links inside each amenity
      for (let amenity of amenities) {
        // Get all image links
        let amenityImages = await imagesService.findMany(() => [
          {
            where: {
              [Op.or]: [{ LinkedTo: amenity?.AmenityID }],
            },
          },
        ]);
        if (amenityImages.length) {
          amenity.Images = amenityImages;
        }
      }
      apartment.amenities = amenities;

      // If by chance the floor and apartment was deleted by the owner we need to remove it from user selection
      if (!(floor?.FloorName && apartment?.ApartmentID)) {
        console.log(`Deleting sail item as item no longer exists. Apartment: ${sailItem.ApartmentID}; Floor: ${sailItem.FloorID}`);
        await sailItemService.deleteRow({ where: { SailItemID: sailItem.SailItemID } });
        continue;
      }
      if (!selection[floor?.FloorName]) {
        selection[floor.FloorName] = {
          floorDetails: floor,
          apartments: [],
        };
      }
      selection[floor.FloorName].apartments.push(apartment);
    }

    sailRecord.SailStatus = res.send({
      propertyName: property.PropertyName,
      propertyId: property.PropertyID,
      sailId: sailRecord.SailID,
      sailStatus: sailRecord.SailStatus,
      selection,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to fetch the sail selection item list for a buyer for a specific property
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.initiateSailNotification = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    let selections = req.body;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let propertyId = req.params.id;

    // Get the property
    let property = await propertyService.findOne(() => [{ where: { PropertyID: propertyId } }]);
    let owner = await userService.findOne(() => [
      {
        where: {
          UserName: property.Owner,
        },
      },
    ]);
    let buyer = await userService.findOne(() => [
      {
        where: {
          UserName: user,
        },
      },
    ]);

    // Fetch the agents details for the property
    let agents;
    if (property?.Agent1 || property?.Agent2) {
      agents = await userService.findMany(() => [
        {
          where: {
            [Op.or]: [
              ...(property?.Agent1 ? [{ UserName: property.Agent1 }] : []),
              ...(property?.Agent2 ? [{ UserName: property.Agent2 }] : []),
            ],
          },
        },
      ]);
    } else {
      // Send Notification to Owner to add agents via mail and application notification
      const customDisplayName = `RSVC admin <${config.mailInfo.eMail}>`;
      const toEmail = [owner.eMail];
      const subject = `Agent not added for property, ${property.PropertyName}`;
      const message = `The buyer, ${buyer.FirstName}, was not able to express interest for the property, ${property.PropertyName}, as no agent was added.  
      Kindly add agents for the property so that buyers may express interest and proceed with the sail.`;
      await mailer.sendEmailWithCustomDisplayName(customDisplayName, toEmail, subject, message);

      await notificationService.create({
        Message: `Please add agents for the property, ${property.PropertyName}`,
        Timestamp: new Date(),
        User: owner.UserName,
      });

      // Send the notification to user stating that Agents are not available and to try again later
      res.status(400).send({
        status: 'Fail',
        msg: 'No agents are available for the property. The notification has been send to the buyer to add agents. Please try again later.',
      });
      return;
    }

    // Check if there is already a sail record in progress for this user for this property
    let oldSailrecords = await sailRecordService.findOne(() => [
      {
        where: {
          [Op.and]: [{ Property: propertyId }, { Buyer: user }, { SailStatus: { [Op.in]: [0, 1, 2] } }],
        },
      },
    ]);
    if (oldSailrecords?.SailID) {
      res.status(400).send({
        status: 'Fail',
        msg: 'Sail already in progress for the selected property and user.',
      });
      return;
    }

    // create the sail record
    let sailRecordData = {
      Property: propertyId,
      Buyer: user,
      SailStatus: 0, // Notified
    };
    let sailRecord = await sailRecordService.create(sailRecordData);
    let notificationTime = new Date();

    // Save the sail items
    let selectionDict = {};
    for (let selection of selections) {
      // We need to remove the selections which are in sold state
      let apartment = await apartmentService.findOne(() => [{ where: { ApartmentID: selection.apartmentId } }]);
      if (apartment.Status == 2) {
        continue;
      }

      if (selectionDict[selection.floorName]) {
        selectionDict[selection.floorName].push(selection.apartmentName);
      } else {
        selectionDict[selection.floorName] = [selection.apartmentName];
      }
      // save the selection item
      await sailItemService.create({
        ApartmentID: selection.apartmentId,
        SailID: sailRecord.SailID,
        FloorID: selection.floorId,
      });
    }

    // Construct the message string
    let messageString = ``;
    for (let [index, floor] of Object.keys(selectionDict)?.entries()) {
      let apartmentString = ``;
      if (selectionDict[floor]?.length > 1) {
        const lastItem = selectionDict[floor].pop();
        const joinedItems = selectionDict[floor].join(', ');
        apartmentString = `apartments ${joinedItems} and ${lastItem}`;
      } else {
        apartmentString = `apartment ${selectionDict[floor].join('')}`;
      }
      messageString = `${messageString}${index == Object.keys(selectionDict).length ? ',' : 'and'} ${apartmentString} of floor ${floor}`;
    }

    // Repeat below for each agent
    for (let agent of agents) {
      // Sent email to the agents
      const customDisplayName = `${buyer.FirstName} via RSVC <${config.mailInfo.eMail}>`;
      const toEmail = [agent.eMail];
      const subject = `Expressing interest for the property, ${property.PropertyName}`;
      const message = `Please note that I am interested in ${messageString}. Kindly revert back with the details.`;
      await mailer.sendEmailWithCustomDisplayName(customDisplayName, toEmail, subject, message);

      // Sent notification to the agents
      await notificationService.create({
        Message: `Interest recieved for property, ${property.PropertyName}`,
        Timestamp: notificationTime,
        User: agent.UserName,
      });

      // Create a new chat
      let chat = await chatService.create({
        LastMessageTime: notificationTime,
        Status: 0, // Hidden
        User1: buyer.UserName,
        User2: agent.UserName,
        SailID: sailRecord.SailID,
      });

      // save the chat message
      await chatMessageService.create({
        MessageType: 0, // Text message
        MessageBody: `Hi, I am interested in ${messageString}. Kindly revert back with the details.`,
        Time: notificationTime,
        ChatID: chat.ChatID,
        From: buyer.UserName,
        To: agent.UserName,
      });
    }

    // Sent notification to the owner if agents did not respond in specified time
    setTimeout(async () => {
      // get the sail record and see if the status is still notified
      let sail = await sailRecordService.findOne(() => [{ where: { SailID: sailRecord.SailID } }]);
      if (sail.SailStatus == 0) {
        const customDisplayName = `RSVC admin <${config.mailInfo.eMail}>`;
        const toEmail = [owner.eMail];
        const subject = `Agents have not yet responded to the interest for, ${property.PropertyName}`;
        const message = `Agents have not yet responded to the interest for ${property.PropertyName}, expressed by the buyer, ${
          buyer.FirstName
        } ${buyer.LastName}. The interest was sent at ${notificationTime.toLocaleString(config.timezone)}.`;
        await mailer.sendEmailWithCustomDisplayName(customDisplayName, toEmail, subject, message);
      }
    }, config.notificationWindow);

    res.send({
      status: 'Success',
      msg: 'Notification sent successfully.',
    });
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
exports.getChatList = async (req, res, next) => {
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
          Status: { [Op.in]: [2, 3] },
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
 * Function to fetch the list of all the messages in a chat
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
    if (chat?.Status != 3) {
      res.send(403).send('User not allowed to send messages to this chat');
      return;
    }
    let messageTypes = constants.MessageType.map((type) => type.toLowerCase());
    let message = await chatMessageService.create({
      From: user,
      To: data.to,
      MessageBody: data.message,
      MessageType: messageTypes.indexOf(data?.messageType?.toLowerCase() ?? 'text'),
      Time: new Date(),
      ChatID: data.chatId,
    });

    res.status(200).send(message.ChatMesssageID);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};
