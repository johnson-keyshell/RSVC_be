const { Op } = require('sequelize');

const propertyService = require('../services/properties');
const floorService = require('../services/floors');
const apartmentService = require('../services/apartments');
const addressService = require('../services/addresses');
const sailRecordService = require('../services/sailRecords');
const amenityService = require('../services/amenities');
const imagesService = require('../services/images');
const structuralDetailsService = require('../services/structuralDetails');
const chatUiDataFormater = require('../services/ChatUIDataFormater');
const sailItemService = require('../services/sailItem');
const notificationService = require('../services/notification');
const userService = require('../services/users');
const chatService = require('../services/chat');
const chatMessageService = require('../services/chatMessages');
const messageService = require('../services/messages');
const rolesService = require('../services/roles');
const mailer = require('../services/utils/mailer/mailer');
const config = require('../config/config');
const constants = require('../constants/constants');
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
    let user = req?.decoded?.data?.UserName;
    if (user) {
      // We will have to replace the finone by findmany below in the future and provide proper where clause
      let properties = await propertyService.findMany(() => [{ where: { Owner: user } }]);

      // Get the count of agents
      let agentCount = 0;
      properties.reduce((prv, crr) => {
        if (!prv?.[crr.Agent1]) {
          agentCount++;
        }
        if (!prv?.[crr.Agent2]) {
          agentCount++;
        }
        return { ...prv, [crr.Agent1]: 1, [crr.Agent2]: 1 };
      }, {});

      // Get the count of units sold
      let sailCount = 0;
      for (let property of properties) {
        sailCount += await sailRecordService.countRecords(() => [{ where: { Property: property.PropertyID, SailStatus: 'sold' } }]);
      }

      // Get the count of propspective buyers
      let buyers = {};
      for (let property of properties) {
        let apartmentsUnderOption = await sailRecordService.findMany(() => [
          { where: { Property: property.PropertyID, SailStatus: 'under option' } },
        ]);
        apartmentsUnderOption.forEach((record) => (buyers[record.Buyer] = 1));
      }
      let prospectiveBuyerCount = Object.keys(buyers)?.length ?? 0;

      // Get property address
      for (let property of properties) {
        let address = await addressService.findOne(() => [{ where: { AddressID: property.Address } }]);
        property.Address = `${address.AddressLine2}, ${address.Area}`;
        // Get main Image link
        let mainImage = await imagesService.findOne(() => [{ where: { ImageID: property.MainImage } }]);
        property.mainImage = mainImage?.ImageLink;
      }

      res.send({
        agentCount,
        sailCount,
        prospectiveBuyerCount,
        properties: await Promise.all(
          properties.map(async (property) => ({
            propertyName: property.PropertyName,
            propertyId: property.PropertyID,
            address: property.Address,
            mainImage: property.mainImage,
            ...(await getPropertyDetails(property.PropertyID)),
          }))
        ),
      });
    } else {
      res.status(403).send('Unauthorised access');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to fetch the properties list
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.getEditListingInfo = async (req, res, next) => {
  try {
    let property = await propertyService.findOne(() => [{ where: { PropertyID: req.params?.id } }]);

    // Get all image links
    let images = await imagesService.findMany(() => [{ where: { [Op.or]: [{ LinkedTo: property?.PropertyID }] } }]);
    let thumbnailImage = await imagesService.findOne(() => [{ where: { ImageID: property?.ThumbnailImage } }]);
    let mainImage = await imagesService.findOne(() => [{ where: { ImageID: property?.MainImage } }]);

    // Get the property address
    let address = await addressService.findOne(() => [{ where: { AddressID: property.Address } }]);

    // Get the custom fields for the property
    let additionalDetails = await customFiledsService.findMany(() => [{ where: { LinkedTo: property.PropertyID } }]);
    if (additionalDetails?.length) {
      additionalDetails = additionalDetails.reduce((prv, crr) => ({ ...prv, [crr.FieldName]: crr.FieldValue }), {});
    }

    // Get the floors
    let floors = await floorService.findMany(() => [{ where: { Property: property.PropertyID } }]);

    // Get the image links inside each floor
    for (let floor of floors) {
      if (floor.LayoutImage) {
        let image = await imagesService.findOne(() => [{ where: { ImageID: floor.LayoutImage } }]);
        floor.LayoutImage = image;
      }
    }

    res.send({
      propertyName: property.PropertyName,
      propertyId: property.PropertyID,
      images,
      thumbnailImage,
      additionalFields: additionalDetails,
      mainImage,
      address,
      floors,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to fetch the properties general info
 * @param {Object} propertyId The property id
 */
const getPropertyDetails = async (propertyId) => {
  try {
    // We will have to replace the finone by findmany below in the future and provide proper where clause
    let property = await propertyService.findOne(() => [{ where: { PropertyID: propertyId } }]);
    // Get the property details
    let details = await structuralDetailsService.findOne(() => [{ where: { DetailsID: property.Details } }]);
    // Get the amenities of the property
    let amenities = await amenityService.findMany(() => [{ where: { ReferenceID: property.PropertyID } }]);

    // Get the custom fields for the property
    let additionalDetails = await customFiledsService.findMany(() => [{ where: { LinkedTo: property.PropertyID } }]);
    if (additionalDetails?.length) {
      additionalDetails = additionalDetails.reduce((prv, crr) => ({ ...prv, [crr.FieldName]: crr.FieldValue }), {});
    }
    // Get the property address
    let address = await addressService.findOne(() => [{ where: { AddressID: property.Address } }]);

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

    return {
      propertyName: property.PropertyName,
      propertyId: property.PropertyID,
      description: details?.Description,
      additionalFields: additionalDetails,
      amenities,
      address,
      ...details,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to fetch the properties general info
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.getGeneralDetailsInfo = async (req, res, next) => {
  try {
    let property = await propertyService.findOne(() => [{ where: { PropertyID: req.params?.id } }]);

    // Get the floors
    let floors = await floorService.findMany(() => [{ where: { Property: property.PropertyID } }]);

    // Get the apartments inside each floor
    for (let floor of floors) {
      let apartments = await apartmentService.findMany(() => [{ where: { Floor: floor.FloorID } }]);
      // Iterate through apartment and get the image links and the amenities
      for (let apartment of apartments) {
        // Get the image link
        if (apartment.Image) {
          let image = await imagesService.findOne(() => [{ where: { ImageID: apartment.Image } }]);
          apartment.Image = image;
        }

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

        // Get the custom fields for the apartment
        let additionalDetails = await customFiledsService.findMany(() => [{ where: { LinkedTo: apartment.ApartmentID } }]);
        if (additionalDetails?.length) {
          additionalDetails = additionalDetails.reduce((prv, crr) => ({ ...prv, [crr.FieldName]: crr.FieldValue }), {});
        }
        apartment.additionalFields = additionalDetails;
      }

      floor.apartments = apartments;
    }

    res.send({
      propertyId: property.PropertyID,
      floors,
      property: await getPropertyDetails(property.PropertyID),
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to fetch the properties additional details
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.getPropertyAdditionalDetails = async (req, res, next) => {
  try {
    let propertyDetails = await getPropertyDetails(req.params.id);

    res.send(propertyDetails);
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
    let agentChats = await chatService.findMany(() => [
      {
        order: [['LastMessageTime', 'DESC']],
        where: {
          [Op.or]: [{ User1: user }, { User2: user }],
        },
      },
    ]);
    let agentChatList = [];
    for (let chat of agentChats) {
      let chatData = await chatUiDataFormater.fetchChatDetailsAsOwner(chat, user);
      if (chatData) {
        agentChatList.push(chatData);
      }
    }

    let properties = await propertyService.findMany(() => [{ where: { Owner: user } }]);
    let sailRecords = await sailRecordService.findMany(() => [
      { where: { Property: { [Op.in]: properties.map((prop) => prop.PropertyID) } } },
    ]);

    let sailChats = await chatService.findMany(() => [
      {
        order: [['LastMessageTime', 'DESC']],
        where: {
          SailID: { [Op.in]: sailRecords.map((sail) => sail.SailID) },
        },
      },
    ]);
    let sailChatList = [];
    for (let chat of sailChats) {
      let chatData = await chatUiDataFormater.fetchSailChatDetailsAsOwner(chat, user);
      if (chatData) {
        sailChatList.push(chatData);
      }
    }

    res.status(200).send({ agentChatList, sailChatList });
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
    let messageTypes = constants.MessageType.map((type) => type.toLowerCase());
    let message = await chatMessageService.create(
      {
        From: user,
        To: data.to,
        MessageBody: data.message,
        MessageType: messageTypes.indexOf(data?.messageType?.toLowerCase() ?? 'text'),
        Time: new Date(),
        ChatID: data.chatId,
      },
      true
    );

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
          SailID: null,
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

/**
 * Function to fetch the list of all the active agents
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.getAgentList = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }

    let properties = await propertyService.findMany(() => [{ where: { Owner: user } }]);
    let agents = properties.reduce((prv, crr) => [...prv, ...(crr?.Agent1 ? [crr.Agent1] : []), ...(crr?.Agent2 ? [crr.Agent2] : [])], []);
    let agentInfo = await userService.findMany(() => [{ where: { UserName: { [Op.in]: agents } } }]);
    for (let agent of agentInfo) {
      if (agent.ProfilePic) {
        let pic = await imagesService.findOne(() => [{ where: { ImageID: agent.ProfilePic } }]);
        agent.ProfilePic = pic?.ImageLink;
      }
      let property = await propertyService.findOne(() => [
        { where: { [Op.or]: { Agent1: agent.UserName, Agent2: agent.UserName }, Owner: user } },
      ]);
      let propertyAddress = await addressService.findOne(() => [{ where: { AddressID: property.Address } }]);
      agent.property = {
        name: property.PropertyName,
        id: property.PropertyID,
        addressLine1: propertyAddress.AddressLine1,
        addressLine2: propertyAddress.AddressLine2,
      };
    }

    res.status(200).send(agentInfo);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to fetch the list of all the active agents
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.getUserList = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let roles = await rolesService.findMany(() => [{ where: { RoleName: { [Op.in]: ['agent', 'buyer'] } } }]);
    let users = await userService.findMany(() => [{ where: { Role: { [Op.in]: roles.map((role) => role.RoleID) } } }]);
    for (let user of users) {
      if (user.ProfilePic) {
        let pic = await imagesService.findOne(() => [{ where: { ImageID: user.ProfilePic } }]);
        user.ProfilePic = pic?.ImageLink;
      }
    }
    roles = roles.reduce((prv, crr) => ({ ...prv, [crr.RoleID]: crr.RoleName }), {});
    res.status(200).send(users.map((user) => ({ ...user, Role: roles[user.Role] })));
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to add agents to property
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.addAgent = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let { agent1, agent2 } = req.body;

    let property = await propertyService.create({ PropertyID: req.body.propertyId, Agent1: agent1 ?? null, Agent2: agent2 ?? null });
    let role = await rolesService.findOne(() => [{ where: { RoleName: 'agent' } }]);
    if (agent1) {
      await userService.create({ UserName: agent1, Role: role.RoleID });
    }
    if (agent2) {
      await userService.create({ UserName: agent2, Role: role.RoleID });
    }
    res.status(200).send(property);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to set the sail status
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.setSailStatus = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let sailId = req.body.sailId;
    let status = req.body.status;

    let sailRecord = await sailRecordService.findOne(() => [
      {
        SailID: sailId,
      },
    ]);

    if (!sailRecord) {
      res.status(404).send('Sail record not found');
      return;
    }

    let property = await propertyService.findOne(() => [{ PropertyID: sailRecord.Property }]);
    if (property.Owner != user) {
      res.status(403).send('Unauthorised access to property');
      return;
    }

    sailRecord = await sailRecordService.create({
      SailID: sailId,
      SailStatus: status, // ['Notified', 'Contacted', 'In Progress', 'Rejected', 'Sold']
    });

    // We have to mark the state of each apartment in the sail items as "Under option"
    let sailItems = await sailItemService.findMany(() => [{ where: { SailID: sailId } }]);
    for (let sailItem of sailItems) {
      await apartmentService.create({
        ApartmentID: sailItem.ApartmentID,
        Status: status == 2 ? 1 : status == 4 ? 2 : 0, // ['Available', 'Under Option', 'Sold']
      });
    }
    res.status(200).send(sailRecord);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};
