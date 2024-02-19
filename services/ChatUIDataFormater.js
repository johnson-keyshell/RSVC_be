const { Op } = require('sequelize');

const imagesService = require('./images');
const userService = require('./users');
const addressService = require('./addresses');
const ChatMessageModel = require('../models/chatMessages');
const rolesService = require('./roles');
const constants = require('../constants/constants');
const sailRecordService = require('./sailRecords');
const agreementService = require('./agentAgreement');
const propertyService = require('./properties');
const documentService = require('./document');
const imageService = require('./images');

/**
 * Function to fetch the chat details depending on the user who requested it
 * @param {Object} chat It should contain the db row for the chat
 * @param {String} user The username of the user who requested the chat details
 * @returns The final chat object with all the required details
 */
const fetchChatDetails = async (chat, user) => {
  try {
    let chatData = {};
    // Let us pick the correct partner and fetch the required details
    let chatPartnerId = chat.User1 == user ? chat.User2 : chat.User1;
    let partnerDetails = await userService.findOne(() => [{ where: { UserName: chatPartnerId } }]);
    let role = await rolesService.findOne(() => [{ where: { RoleID: partnerDetails.Role } }]);
    chatData.partner = {
      name: `${partnerDetails.FirstName}${partnerDetails.LastName ? ' ' + partnerDetails.LastName : ''}`,
      role: role.RoleName,
      userName: partnerDetails.UserName,
    };
    if (partnerDetails.ProfilePic) {
      let pic = await imagesService.findOne(() => [{ where: { ImageID: partnerDetails.ProfilePic } }]);
      chatData.partner.profilePic = pic.ImageLink;
    }

    // Let us word the chat status correctly
    chatData.chatStatus = constants.ChatStatus[chat.Status];
    chatData.chatId = chat.ChatID;

    // If user role is agent then we need to add the chat state
    let userDetails = await userService.findOne(() => [{ where: { UserName: user } }]);
    let userRole = await rolesService.findOne(() => [{ where: { RoleID: userDetails.Role } }]);
    if (userRole.RoleName.toLowerCase() == 'agent') {
      chatData.agentChatState = ['New Enquiry', 'Deprioritized', 'Inactive', 'Discussion'][chat.Status];
    }

    // fetch the proppety name
    let sailRecord = await sailRecordService.findOne(() => [{ where: { SailID: chat.SailID } }]);
    let property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);
    let propertyAddress = await addressService.findOne(() => [{ where: { AddressID: property.Address } }]);
    chatData.property = {
      name: property.PropertyName,
      id: property.PropertyID,
      addressLine1: propertyAddress.AddressLine1,
      addressLine2: propertyAddress.AddressLine2,
    };

    // lets keep the sail ID for further usage
    chatData.sailId = chat.SailID;

    // Lets keeps the last message time to enable sorting on the FE
    chatData.lastMessageTime = chat.LastMessageTime;

    // Send the count of unread messages where the recipient of the message is the current user
    let unreadMessagesCount = await ChatMessageModel.count({
      where: {
        To: user,
        ChatID: chat.ChatID,
        ReadFlag: false,
      },
    });
    chatData.unreadMessagesCount = unreadMessagesCount;

    return chatData;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to fetch the chat details as owner of property
 * @param {Object} chat It should contain the db row for the chat
 * @returns The final chat object with all the required details
 */
const fetchSailChatDetailsAsOwner = async (chat) => {
  try {
    let chatData = { chatId: chat.ChatID };

    // Let us pick the each partner and fetch the required details
    for (let chatPartnerId of [chat.User1, chat.User2]) {
      let partnerDetails = await userService.findOne(() => [{ where: { UserName: chatPartnerId } }]);
      let role = await rolesService.findOne(() => [{ where: { RoleID: partnerDetails.Role } }]);
      role = role.RoleName;
      chatData[role] = {
        name: `${partnerDetails.FirstName}${partnerDetails.LastName ? ' ' + partnerDetails.LastName : ''}`,
        role: role,
        userName: partnerDetails.UserName,
      };
      if (partnerDetails.ProfilePic) {
        let pic = await imagesService.findOne(() => [{ where: { ImageID: partnerDetails.ProfilePic } }]);
        chatData[role].profilePic = pic.ImageLink;
      }
    }

    // Let us word the chat status correctly
    chatData.chatStatus = constants.ChatStatus[chat.Status];

    // fetch the proppety name
    let sailRecord = await sailRecordService.findOne(() => [{ where: { SailID: chat.SailID } }]);
    let property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);
    let propertyAddress = await addressService.findOne(() => [{ where: { AddressID: property.Address } }]);
    chatData.property = {
      name: property.PropertyName,
      id: property.PropertyID,
      addressLine1: propertyAddress.AddressLine1,
      addressLine2: propertyAddress.AddressLine2,
    };

    // lets keep the sail ID for further usage
    chatData.sailId = chat.SailID;

    // Lets keeps the last message time to enable sorting on the FE
    chatData.lastMessageTime = chat.LastMessageTime;

    return chatData;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to fetch the chat details as owner of property
 * @param {Object} chat It should contain the db row for the chat
 * @returns The final chat object with all the required details
 */
const fetchChatDetailsAsOwner = async (chat, owner) => {
  try {
    let chatData = { chatId: chat.ChatID };
    let partnerId;
    // Let us pick the each partner and fetch the required details
    for (let chatPartnerId of [chat.User1, chat.User2]) {
      let partnerDetails = await userService.findOne(() => [{ where: { UserName: chatPartnerId } }]);
      let role = await rolesService.findOne(() => [{ where: { RoleID: partnerDetails.Role } }]);
      role = role.RoleName;
      chatData[role] = {
        name: `${partnerDetails.FirstName}${partnerDetails.LastName ? ' ' + partnerDetails.LastName : ''}`,
        role: role,
        userName: partnerDetails.UserName,
      };
      if (partnerDetails.ProfilePic) {
        let pic = await imagesService.findOne(() => [{ where: { ImageID: partnerDetails.ProfilePic } }]);
        chatData[role].profilePic = pic.ImageLink;
      }
      if (chatPartnerId != owner) {
        partnerId = chatPartnerId;
      }
    }

    // Let us word the chat status correctly
    chatData.chatStatus = constants.ChatStatus[chat.Status];
    // fetch the proppety name
    let property = await propertyService.findOne(() => [
      {
        where: {
          [Op.or]: [{ Agent1: partnerId }, { Agent2: partnerId }],
        },
      },
    ]);

    if (property) {
      let propertyAddress = await addressService.findOne(() => [{ where: { AddressID: property.Address } }]);
      chatData.property = {
        name: property.PropertyName,
        id: property.PropertyID,
        addressLine1: propertyAddress.AddressLine1,
        addressLine2: propertyAddress.AddressLine2,
      };
    }

    // Lets keeps the last message time to enable sorting on the FE
    chatData.lastMessageTime = chat.LastMessageTime;

    // Send the count of unread messages where the recipient of the message is the current user
    let unreadMessagesCount = await ChatMessageModel.count({
      where: {
        To: owner,
        ChatID: chat.ChatID,
        ReadFlag: false,
      },
    });
    chatData.unreadMessagesCount = unreadMessagesCount;

    return chatData;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to fetch the chat details as owner of property
 * @param {Object} chat It should contain the db row for the chat
 * @returns The final chat object with all the required details
 */
const fetchChatDetailsAsAgent = async (chat, agent) => {
  try {
    let chatData = { chatId: chat.ChatID };
    let partnerId;
    let partnerRole;
    // Let us pick the each partner and fetch the required details
    for (let chatPartnerId of [chat.User1, chat.User2]) {
      let partnerDetails = await userService.findOne(() => [{ where: { UserName: chatPartnerId } }]);
      let role = await rolesService.findOne(() => [{ where: { RoleID: partnerDetails.Role } }]);
      role = role.RoleName;
      chatData[role] = {
        name: `${partnerDetails.FirstName}${partnerDetails.LastName ? ' ' + partnerDetails.LastName : ''}`,
        role: role,
        userName: partnerDetails.UserName,
      };
      if (partnerDetails.ProfilePic) {
        let pic = await imagesService.findOne(() => [{ where: { ImageID: partnerDetails.ProfilePic } }]);
        chatData[role].profilePic = pic.ImageLink;
      }
      if (chatPartnerId != agent) {
        partnerId = chatPartnerId;
        partnerRole = role;
      }
    }

    // Let us word the chat status correctly
    chatData.chatStatus = constants.ChatStatus[chat.Status];

    chatData.agentChatState = ['New Enquiry', 'Deprioritized', 'Inactive', 'Discussion'][chat.Status];

    let property;
    if (partnerRole == 'owner') {
      // fetch the proppety name
      property = await propertyService.findOne(() => [
        {
          where: {
            Owner: partnerId,
          },
        },
      ]);
    } else if (partnerRole == 'buyer') {
      let sailRecord = await sailRecordService.findOne(() => [{ where: { SailID: chat.SailID } }]);
      property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);
      chatData.sailId = chat.SailID;
    }

    if (property) {
      let propertyAddress = await addressService.findOne(() => [{ where: { AddressID: property.Address } }]);
      chatData.property = {
        name: property.PropertyName,
        id: property.PropertyID,
        addressLine1: propertyAddress.AddressLine1,
        addressLine2: propertyAddress.AddressLine2,
      };
    }

    // Lets keeps the last message time to enable sorting on the FE
    chatData.lastMessageTime = chat.LastMessageTime;

    // Send the count of unread messages where the recipient of the message is the current user
    let unreadMessagesCount = await ChatMessageModel.count({
      where: {
        To: agent,
        ChatID: chat.ChatID,
        ReadFlag: false,
      },
    });
    chatData.unreadMessagesCount = unreadMessagesCount;

    return chatData;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Function to contruct the chat mesage as required by the UI
 * @param {Object} message The DB chat message row
 * @returns The formated chat message with all the fields required by the UI
 */
const formatChatMessage = async (message) => {
  try {
    let messageData = {
      messageType: constants.MessageType[message.MessageType], // Message type can be ['Text', 'Document', 'Image', 'Agreement']
      readFlag: message.ReadFlag,
      time: message.Time,
      from: message.From,
      to: message.To,
      messageId: message.ChatMesssageID,
    };

    // If message type is text we will append the text as it is in the MessageBody column
    if (message.MessageType == 0) {
      messageData.text = message.MessageBody;
    }

    // If message type is document we need to fetch the document name and the docuemnt link
    if (message.MessageType == 1) {
      let document = await documentService.findOne(() => [{ where: { DocumentID: message.MessageBody } }]);
      messageData.document = {
        documentID: document.DocumentID,
        name: document.DocumentName,
        link: document.DocumentLink,
      };
    }

    // If message type is Image then we need to fetch the image
    if (message.MessageType == 2) {
      let image = await imageService.findOne(() => [{ where: { ImageID: message.MessageBody } }]);
      messageData.image = {
        ImageID: image.ImageID,
        name: image.ImageName,
        link: image.ImageLink,
      };
    }

    // Handling the chat message which is of type 'Agreement'
    if (message.MessageType == 3) {
      let agreementData = await agreementService.findOne(() => [{ where: { AgentAgreementID: message.MessageBody } }]);
      let agreement = {
        agreementId: agreementData.AgentAgreementID,
        agreementText: agreementData.AgreementText,
      };
      let fromUser = await userService.findOne(() => [{ where: { UserName: message.From } }]);
      let fromUserRole = await rolesService.findOne(() => [{ where: { RoleID: fromUser.Role } }]);
      // If the from user is an agent then we need to make the footer clikable
      if (fromUserRole?.RoleName?.toLowerCase() == 'agent') {
        agreement.footer = 'View To Accept/Reject';
        agreement.type = 'link';
      }
      // If the from user is a buyer then we need to
      if (fromUserRole?.RoleName?.toLowerCase() == 'buyer') {
        agreement.footer = message?.AgreementStatus ?? 'No reponse';
        agreement.type = 'text';
      }
      messageData.agreement = agreement;
    }

    return messageData;
  } catch (error) {
    console.error(error);
    return null;
  }
};

module.exports = {
  fetchChatDetails,
  fetchChatDetailsAsOwner,
  formatChatMessage,
  fetchSailChatDetailsAsOwner,
  fetchChatDetailsAsAgent,
};
