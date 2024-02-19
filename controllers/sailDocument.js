const { Op } = require('sequelize');
const fs = require('fs');
const documentService = require('../services/document');
const documentAccessService = require('../services/documentAccess');
const chatService = require('../services/chat');
const propertyService = require('../services/properties');
const floorService = require('../services/floors');
const apartmentService = require('../services/apartments');
const addressService = require('../services/addresses');
const sailRecordService = require('../services/sailRecords');
const sailDocumentService = require('../services/sailDocument');
const amenityService = require('../services/amenities');
const imagesService = require('../services/images');
const roleService = require('../services/roles');
const userService = require('../services/users');
const structuralDetailsService = require('../services/structuralDetails');
const notificationService = require('../services/notification');
const config = require('../config/config');
const constants = require('../constants/constants');
const mailer = require('../services/utils/mailer/mailer');

/**
 * Function to the entire list of documents
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.getList = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let sailId = req.params.id;
    let userData = await userService.findOne(() => [{ where: { UserName: user } }]);
    let userRole = await roleService.findOne(() => [{ where: { RoleID: userData.Role } }]);
    let sailRecord;

    // The owener is also allowed to access the sail document
    if (userRole?.RoleName?.toLowerCase() == 'owner') {
      sailRecord = await sailRecordService.findOne(() => [
        {
          where: {
            SailID: sailId,
          },
        },
      ]);
      let property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);
      if (property.Owner != userData.UserName) {
        res.status(403).send('Unauthorised access to sail');
        return;
      }
    } else {
      sailRecord = await sailRecordService.findOne(() => [
        {
          where: {
            SailID: sailId,
            [Op.or]: [{ Buyer: user }, { Agent: user }],
          },
        },
      ]);
      if (!sailRecord) {
        res.status(403).send('Unauthorised access to sail');
        return;
      }
    }

    let sailDocuments = await sailDocumentService.findMany(() => [{ where: { SailID: sailId } }]);
    let list = {};
    for (let documentType of constants.DocumentType) {
      list[documentType] = [];
    }
    for (let sailDocument of sailDocuments?.length ? sailDocuments : []) {
      let document = await documentService.findOne(() => [{ where: { DocumentID: sailDocument.DocumentID } }]);
      let type = constants.DocumentType[sailDocument.DocumentType];
      list[type].push({
        sailDocumentId: sailDocument.SailDocumentID,
        documnetType: type,
        agentVerificationTime: sailDocument.AgentVerificationTime,
        agentVerificationStatus: constants.SailDocumentVerificationStatus[sailDocument.AgentVerificationStatus],
        sellerVerificationTime: sailDocument.SellerVerificationTime,
        sellerVerificationStatus: constants.SailDocumentVerificationStatus[sailDocument.SellerVerificationStatus],
        documentName: document.DocumentName,
        link: document.DocumentLink,
        SellerRejectionReason: sailDocument.SellerRejectionReason,
        AgentRejectionReason: sailDocument.AgentRejectionReason,
      });
    }
    res.send(list);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to approve a document
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.approveSailDocument = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let sailDocumentId = req.params.id;
    let sailDocument = await sailDocumentService.findOne(() => [{ where: { SailDocumentID: sailDocumentId } }]);
    let sailId = sailDocument.SailID;
    let userData = await userService.findOne(() => [{ where: { UserName: user } }]);
    let userRole = await roleService.findOne(() => [{ where: { RoleID: userData.Role } }]);
    let sailRecord;

    // The owener is also allowed to access the sail document
    if (userRole?.RoleName?.toLowerCase() == 'owner') {
      sailRecord = await sailRecordService.findOne(() => [
        {
          where: {
            SailID: sailId,
          },
        },
      ]);
      let property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);
      if (property.Owner != userData.UserName) {
        res.status(403).send('Unauthorised access to sail');
        return;
      }
      sailDocument = await sailDocumentService.create({
        SailDocumentID: sailDocumentId,
        SellerVerificationTime: new Date(),
        SellerVerificationStatus: 1, // Approved
        SellerRejectionReason: null,
      });
      res.send({ ...sailDocument, SellerVerificationStatus: 'Approved' });
    } else {
      sailRecord = await sailRecordService.findOne(() => [
        {
          where: {
            SailID: sailId,
            Agent: user,
          },
        },
      ]);
      if (!sailRecord) {
        res.status(403).send('Unauthorised access to sail');
        return;
      }
      sailDocument = await sailDocumentService.create({
        SailDocumentID: sailDocumentId,
        AgentVerificationTime: new Date(),
        AgentVerificationStatus: 1, // Approved
        AgentRejectionReason: null,
      });
      res.send({ ...sailDocument, AgentVerificationStatus: 'Approved' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to reject a document
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.rejectSailDocument = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let sailDocumentId = req.params.id;
    let reason = req.body?.reason;
    let sailDocument = await sailDocumentService.findOne(() => [{ where: { SailDocumentID: sailDocumentId } }]);
    let sailId = sailDocument.SailID;
    let userData = await userService.findOne(() => [{ where: { UserName: user } }]);
    let userRole = await roleService.findOne(() => [{ where: { RoleID: userData.Role } }]);
    let sailRecord;

    // The owener is also allowed to access the sail document
    if (userRole?.RoleName?.toLowerCase() == 'owner') {
      sailRecord = await sailRecordService.findOne(() => [
        {
          where: {
            SailID: sailId,
          },
        },
      ]);
      let property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);
      if (property.Owner != userData.UserName) {
        res.status(403).send('Unauthorised access to sail');
        return;
      }
      sailDocument = await sailDocumentService.create({
        SailDocumentID: sailDocumentId,
        SellerVerificationTime: new Date(),
        SellerVerificationStatus: 2, // Rejected
        SellerRejectionReason: reason || null,
      });
      res.send({ ...sailDocument, SellerVerificationStatus: 'Rejected' });
    } else {
      sailRecord = await sailRecordService.findOne(() => [
        {
          where: {
            SailID: sailId,
            Agent: user,
          },
        },
      ]);
      if (!sailRecord) {
        res.status(403).send('Unauthorised access to sail');
        return;
      }
      sailDocument = await sailDocumentService.create({
        SailDocumentID: sailDocumentId,
        AgentVerificationTime: new Date(),
        AgentVerificationStatus: 2, // Rejected
        AgentRejectionReason: reason || null,
      });
      res.send({ ...sailDocument, AgentVerificationStatus: 'Rejected' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to upload a document
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */

exports.uploadSailDocument = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }

    if (!req.files || !req.files.document) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let sailId = req.body.sailId;
    let documentType = req.body?.documentType ?? 0; // 0 - 'My Documents', 1 - 'Buyer Info', 2 - 'Contract'
    let sailRecord = await sailRecordService.findOne(() => [
      {
        where: {
          SailID: sailId,
          [Op.or]: [{ Buyer: user }, { Agent: user }],
        },
      },
    ]);
    if (!sailRecord) {
      res.status(403).send('Unauthorised access to sail');
      return;
    }
    if (!sailRecord?.Agent || !sailRecord?.AgentAgreementID) {
      res.status(403).send('Unauthorised access to sail. Agent agreement not accepted.');
      return;
    }

    const uploadedFile = req.files.document;
    const fileName = uploadedFile.name;
    fs.mkdirSync(`${__dirname}/../uploads/documents`, { recursive: true }); // Create the directory if it doesn't exist
    let document = await documentService.create({
      DocumentName: fileName,
      Owner: user,
    });

    const uploadPath = `${__dirname}/../uploads/documents/${document.DocumentID}`;

    uploadedFile.mv(uploadPath, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        await documentService.deleteRow({ where: { DocumentID: document.DocumentID } });
        return res.status(500).json({ message: 'File upload failed' });
      }

      let property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);
      for (let documnetUser of [sailRecord.Buyer, sailRecord.Agent, property.Owner])
        await documentAccessService.create({
          User: documnetUser,
          DocumentID: document.DocumentID,
        });

      let sailDocument = await sailDocumentService.create({
        SailID: sailId,
        DocumentID: document.DocumentID,
        DocumentType: documentType,
      });
      document = await documentService.create({
        DocumentID: document.DocumentID,
        DocumentLink: `/api/document/sail/${sailDocument.SailDocumentID}`,
      });

      if (sailRecord.Buyer == user) {
        let buyer = await userService.findOne(() => [{ where: { UserName: user } }]);
        let owner = await userService.findOne(() => [{ where: { UserName: property.Owner } }]);
        let agent = await userService.findOne(() => [{ where: { UserName: sailRecord.Agent } }]);
        // We have to send notification to the agent and seller when buyer uploads a document
        const customDisplayName = `${buyer.FirstName} via RSVC<${config.mailInfo.eMail}>`;
        const toEmail = [owner.eMail, agent.eMail];
        const subject = `${buyer.FirstName} uploaded document for property, ${property.PropertyName}`;
        const message = `The buyer, ${buyer.FirstName}, has uploaded  a document, ${fileName}, for the sail of property, ${property.PropertyName}. Please login to the web application to review and approve the document.`;
        await mailer.sendEmailWithCustomDisplayName(customDisplayName, toEmail, subject, message);

        await notificationService.create({
          Message: `${buyer.FirstName} uploaded document for property, ${property.PropertyName}`,
          Timestamp: new Date(),
          User: owner.UserName,
        });

        await notificationService.create({
          Message: `${buyer.FirstName} uploaded document for property, ${property.PropertyName}`,
          Timestamp: new Date(),
          User: agent.UserName,
        });
      }

      res.status(201).send({ ...sailDocument, ...document });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to delete a document
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.deteleSailDocument = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let sailDocument = await sailDocumentService.findOne(() => [{ where: { SailDocumentID: req.params.id } }]);
    let sailId = sailDocument.SailID;
    let userData = await userService.findOne(() => [{ where: { UserName: user } }]);
    let userRole = await roleService.findOne(() => [{ where: { RoleID: userData.Role } }]);
    let sailRecord;

    // The owener is also allowed to access the sail document
    if (userRole?.RoleName?.toLowerCase() == 'owner') {
      sailRecord = await sailRecordService.findOne(() => [
        {
          where: {
            SailID: sailId,
          },
        },
      ]);
      let property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);
      if (property.Owner != userData.UserName) {
        res.status(403).send('Unauthorised access to sail');
        return;
      }
    } else {
      sailRecord = await sailRecordService.findOne(() => [
        {
          where: {
            SailID: sailId,
            [Op.or]: [{ Buyer: user }, { Agent: user }],
          },
        },
      ]);
      if (!sailRecord) {
        res.status(403).send('Unauthorised access to sail');
        return;
      }
    }

    fs.unlinkSync(`${__dirname}/../uploads/documents/${sailDocument.DocumentID}`);
    await documentAccessService.deleteRow({ where: { DocumentID: sailDocument.DocumentID } });
    await sailDocumentService.deleteRow({ where: { SailDocumentID: req.params.id } });
    res.send(`${await documentService.deleteRow({ where: { DocumentID: sailDocument.DocumentID } })} document deleted`);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to download a document
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.downloadSailDocument = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let sailDocument = await sailDocumentService.findOne(() => [{ where: { SailDocumentID: req.params.id } }]);
    let sailId = sailDocument.SailID;
    let userData = await userService.findOne(() => [{ where: { UserName: user } }]);
    let userRole = await roleService.findOne(() => [{ where: { RoleID: userData.Role } }]);
    let sailRecord;

    // The owener is also allowed to access the sail document
    if (userRole?.RoleName?.toLowerCase() == 'owner') {
      sailRecord = await sailRecordService.findOne(() => [
        {
          where: {
            SailID: sailId,
          },
        },
      ]);
      let property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);
      if (property.Owner != userData.UserName) {
        res.status(403).send('Unauthorised access to sail');
        return;
      }
    } else {
      sailRecord = await sailRecordService.findOne(() => [
        {
          where: {
            SailID: sailId,
            [Op.or]: [{ Buyer: user }, { Agent: user }],
          },
        },
      ]);
      if (!sailRecord) {
        res.status(403).send('Unauthorised access to sail');
        return;
      }
    }

    let document = await documentService.findOne(() => [{ where: { DocumentID: sailDocument.DocumentID } }]);
    if (!document) {
      res.status(404).send('Document not found');
      return;
    }
    const uploadPath = `${__dirname}/../uploads/documents/${document.DocumentID}`;
    res.download(uploadPath, document.DocumentName, (err) => {
      if (err) {
        // Handle any errors that may occur during the download
        console.error('File download error:', err);
        res.status(500).send('File download failed');
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to get a document
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.getDocumentDetails = async (req, res, next) => {
  try {
    let sailDocument = await sailDocumentService.findOne(() => [{ where: { SailDocumentID: req.params.id } }]);
    let document = await documentService.findOne(() => [{ where: { DocumentID: sailDocument.DocumentID } }]);

    res.send({ ...sailDocument, ...document });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};
