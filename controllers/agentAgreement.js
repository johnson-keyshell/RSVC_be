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
const agentAgreementService = require('../services/agentAgreement');
const chatService = require('../services/chat');
const addressService = require('../services/addresses');
const chatMessageService = require('../services/chatMessages');
const messageService = require('../services/messages');
const rolesService = require('../services/roles');
const mailer = require('../services/utils/mailer/mailer');
const config = require('../config/config');
const constants = require('../constants/constants');

/**
 * Function to fetch the agreement details
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.getDetails = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let agentAgreement = await agentAgreementService.findOne(() => [
      {
        where: {
          AgentAgreementID: req.params.id,
          [Op.or]: [{ Agent: user }, { Buyer: user }],
        },
      },
    ]);
    if (!agentAgreement) {
      res.status(403).send('Unauthorised access');
      return;
    }

    let agent = await userService.findOne(() => [{ where: { UserName: agentAgreement.Agent } }]);
    let buyer = await userService.findOne(() => [{ where: { UserName: agentAgreement.Buyer } }]);

    res.send({
      agreementId: agentAgreement.AgentAgreementID,
      agreementText: agentAgreement.AgreementText,
      sentTime: agentAgreement.SentTime,
      resolutionTime: agentAgreement.ResolutionTime,
      status: agentAgreement.Status,
      agent: {
        name: `${agent.FirstName}${agent?.LastName ? ' ' + agent.LastName : ''}`,
        userName: agent.UserName,
      },
      buyer: {
        name: `${buyer.FirstName}${buyer?.LastName ? ' ' + buyer.LastName : ''}`,
        userName: buyer.UserName,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to check if agreement exists
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.checkIfAgreementExits = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let agentAgreement = await agentAgreementService.findOne(() => [
      {
        where: {
          SailID: req.params.sailId,
          Agent: user,
        },
      },
    ]);
    if (!agentAgreement) {
      res.status(200).send({ code: 1, msg: 'Agreement not found' });
      return;
    }
    res.status(200).send({ code: 0, msg: agentAgreement.AgentAgreementID });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to generate an agreement
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.generateAgreement = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let data = req.body;

    let chat = await chatService.findOne(() => [
      {
        where: {
          ChatID: data.chatId,
          [Op.or]: [{ User1: user }, { User2: user }],
        },
      },
    ]);
    if (!chat) {
      res.status(403).send('Unauthorised access to sail chat');
      return;
    }

    // we need to validate if the user who is generating is the agent
    let agent = await userService.findOne(() => [{ where: { UserName: user } }]);
    let role = await rolesService.findOne(() => [{ where: { RoleID: agent.Role } }]);
    if (role.RoleName?.toLowerCase() != 'agent') {
      res.status(403).send('Unauthorised access. Only agents are allowed to generate agreement.');
      return;
    }

    let sentTime = new Date();

    // Save the agreement details
    let agreement = await agentAgreementService.create({
      AgreementText: data.agreementText,
      Agent: user,
      Buyer: data.buyer,
      SentTime: sentTime,
      Status: 0, // 'Sent'
      SailID: data.sailId,
    });

    // We have to mark the current chat as Active
    await chatService.create({
      ChatID: data.chatId,
      Status: 3, // "Active"
    });

    // We need to send the agreement to the buyer chat
    await chatMessageService.create({
      From: user,
      To: data.buyer,
      MessageBody: agreement.AgentAgreementID,
      MessageType: 3, // 'Agreement'
      Time: sentTime,
      ChatID: data.chatId,
    });

    res.status(201).send(agreement);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to accept a agent agreement by the buyer
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.acceptAgreement = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let data = req.body;

    let agreement = await agentAgreementService.findOne(() => [
      {
        where: {
          AgentAgreementID: data.agreementId,
          Buyer: user,
        },
      },
    ]);
    if (!agreement) {
      res.status(403).send('Unauthorised access to agreement. Only respective buyer is allowed to accept the agreement.');
      return;
    }

    let time = new Date();

    agreement = await agentAgreementService.create({
      AgentAgreementID: data.agreementId,
      Status: 1, // Accepted
      ResolutionTime: time,
    });

    // We have to mark the chat status of all the other agents as Inactive
    let otherChats = await chatService.findMany(() => [
      {
        where: {
          SailID: data.sailId,
          ChatID: {
            [Op.ne]: data.chatId,
          },
        },
      },
    ]);

    for (let otherChat of otherChats) {
      // If it was previously hidden we need to make it hidden-inactive - so that it will be hidden for the buyer and inactive for the agent
      if (otherChat.Status == 0 || otherChat.Status == 1) {
        await chatService.create({ Status: 1, ChatID: otherChat.ChatID });
      } else {
        // If it was in any other state then we need to make it inactive for the byer and the agent
        await chatService.create({ Status: 2, ChatID: otherChat.ChatID });
      }
    }

    // We need to send the agreement acceptance to the agent chat
    await chatMessageService.create({
      From: user,
      To: data.agent,
      MessageBody: agreement.AgentAgreementID,
      MessageType: 3, // 'Agreement'
      AgreementStatus: 'Accepted',
      Time: time,
      ChatID: data.chatId,
    });

    // We have to change the status of the sail to "in Progres"
    let sailRecord = await sailRecordService.create({
      SailID: data.sailId,
      Agent: data.agent,
      AgentAgreementID: agreement.AgentAgreementID,
      SailStatus: 2, // "In Progress"
    });

    // We have to mark the state of each apartment in the sail items as "Under option"
    let sailItems = await sailItemService.findMany(() => [{ where: { SailID: data.sailId } }]);
    for (let sailItem of sailItems) {
      await apartmentService.create({
        ApartmentID: sailItem.ApartmentID,
        Status: 1, // "Under option"
      });
    }

    res.status(200).send(agreement);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to reject a agent agreement by the buyer
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.rejectAgreement = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let data = req.body;

    let agreement = await agentAgreementService.findOne(() => [
      {
        where: {
          AgentAgreementID: data.agreementId,
          Buyer: user,
        },
      },
    ]);
    if (!agreement) {
      res.status(403).send('Unauthorised access to agreement. Only respective buyer is allowed to reject the agreement.');
      return;
    }

    let time = new Date();

    agreement = await agentAgreementService.create({
      AgentAgreementID: data.agreementId,
      Status: 2, // Rejected
      ResolutionTime: time,
    });

    // We need to send the agreement acceptance to the agent chat
    await chatMessageService.create({
      From: user,
      To: data.agent,
      MessageBody: agreement.AgentAgreementID,
      MessageType: 3, // 'Agreement'
      AgreementStatus: 'Rejected',
      Time: time,
      ChatID: data.chatId,
    });

    // We have to mark the current chat as inactive
    await chatService.create({
      ChatID: data.chatId,
      Status: 2, // "Inactive"
    });

    // We have to mark the chat status of all the other agents as active or hidden
    let otherChats = await chatService.findMany(() => [
      {
        where: {
          SailID: data.sailId,
          ChatID: {
            [Op.ne]: data.chatId,
          },
        },
      },
    ]);
    for (let otherChat of otherChats) {
      // If it was previously hidden-inactive we need to make it hidden - so that it will be hidden for the buyer and active for the agent
      if (otherChat.Status == 0 || otherChat.Status == 1) {
        await chatService.create({
          Status: 0, // Hidden
          ChatID: otherChat.ChatID,
        });
      } else if (otherChat.Status == 2) {
        // If it was in inactive state we need to check if the user has already rejected the aggreement. If not rejected then we can make it active
        let otherAgentAgreement = await agentAgreementService.findOne(() => [
          {
            Buyer: user,
            SailID: data.sailId,
            Agent: {
              [Op.notIn]: [otherChat.User1, otherChat.User2],
            },
          },
        ]);
        if (otherAgentAgreement.Status != 2) {
          await chatService.create({
            Status: 3, // Active
            ChatID: otherChat.ChatID,
          });
        }
      }
    }

    // We have to change the status of the sail to "Contacted" and remove the agent nd agreement id from the sail record
    let sailRecord = await sailRecordService.create({
      SailID: data.sailId,
      Agent: null,
      AgentAgreementID: null,
      SailStatus: 1, // "Contacted"
    });

    // We have to mark the state of each apartment in the sail items as "Available"
    let sailItems = await sailItemService.findMany(() => [{ where: { SailID: data.sailId } }]);
    for (let sailItem of sailItems) {
      await apartmentService.create({
        ApartmentID: sailItem.ApartmentID,
        Status: 0, // "Available"
      });
    }

    // TBD: We need to clear the sail documents or not?
    res.status(200).send(agreement);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};
