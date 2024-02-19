const { Op } = require('sequelize');
const fs = require('fs');

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
const documentService = require('../services/document');
const documentAccessService = require('../services/documentAccess');
const sailDocumentService = require('../services/sailDocument');
const chatService = require('../services/chat');
const addressService = require('../services/addresses');
const chatMessageService = require('../services/chatMessages');
const roleService = require('../services/roles');
const mailer = require('../services/utils/mailer/mailer');
const config = require('../config/config');
const constants = require('../constants/constants');
const chatUiDataFormater = require('../services/ChatUIDataFormater');
const docusignService = require('../services/utils/docusign/docusign');
const docEditor = require('../services/utils/docEditior');

/**
 * Function to geenrate contract
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 *
 * TBD: We need to update this controller dependin on the future changes
 */
exports.generateContract = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let sailId = req.params.id;
    let userData = await userService.findOne(() => [{ where: { UserName: user } }]);
    let userRole = await roleService.findOne(() => [{ where: { RoleID: userData.Role } }]);
    let sailRecord = await sailRecordService.findOne(() => [
      {
        where: {
          SailID: sailId,
        },
      },
    ]);

    let property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);

    // only agents and owners are allowed to generate the contract
    if (userRole?.RoleName?.toLowerCase() == 'agent' || property?.Owner == user) {
      if (sailRecord.Agent != userData.UserName && property?.Owner != user) {
        res.status(403).send('Only agents authorized for this sail can generate contract.');
        return;
      }
      let sailDocument = await sailDocumentService.findOne(() => [
        {
          where: {
            SailID: sailId,
            DocumentType: 2, // Contract
          },
        },
      ]);
      if (sailDocument) {
        res.status(403).send('Contract already generated.');
        return;
      }

      let buyer = await userService.findOne(() => [{ where: { UserName: sailRecord.Buyer } }]);
      let owner = await userService.findOne(() => [{ where: { UserName: property.Owner } }]);

      // make custom contract document from template
      fs.mkdirSync(`${__dirname}/../uploads/documents`, { recursive: true }); // Create the directory if it doesn't exist
      let document = await documentService.create({
        DocumentName: 'Contract.docx',
        Owner: user,
      });
      for (let documnetUser of [sailRecord.Buyer, sailRecord.Agent, property.Owner])
        await documentAccessService.create({
          User: documnetUser,
          DocumentID: document.DocumentID,
        });

      sailDocument = await sailDocumentService.create({
        SailID: sailId,
        DocumentID: document.DocumentID,
        DocumentType: 2, // Contract
        ...(property?.Owner == user
          ? {}
          : {
              AgentVerificationTime: new Date(),
              AgentVerificationStatus: 1, // Approved
            }),
      });
      document = await documentService.create({
        DocumentID: document.DocumentID,
        DocumentLink: `/api/document/sail/${sailDocument.SailDocumentID}`,
      });

      let documentFileName = `${__dirname}/../uploads/documents/${document.DocumentID}`;
      docEditor.editDocument(`./contract_template_${sailRecord.ContractType}.docx`, documentFileName, {
        Date: '',
        "Seller's Name": `${owner.FirstName} ${owner.LastName}`,
        "Seller's Address": '',
        "Seller's Phone Number": '',
        "Seller's Email": '',
        "Buyer's Name": `${buyer.FirstName} ${buyer.LastName}`,
        "Buyer's Address": '',
        "Buyer's Phone Number": '',
        "Buyer's Email": '',
        'Property Address': '',
        'Legal Description of the Property': `${property.PropertyName}`,
        'Purchase Price': '',
        'Purchase Price in Words': '',
        'Commission Percentage': '',
        'Closing Date': '',
        'Payment Method': '',
        'Additional Terms': '',
      });

      // Send Notification to Owner to approve the contract
      const customDisplayName = `RSVC admin <${config.mailInfo.eMail}>`;
      const toEmail = [owner.eMail];
      const subject = `Contract generated for property, ${property.PropertyName}`;
      const message = `The agent, ${userData.FirstName}, has generated contract for the property, ${property.PropertyName}.  
      Kindly approve the contract via the web application.`;
      await mailer.sendEmailWithCustomDisplayName(customDisplayName, toEmail, subject, message);

      await notificationService.create({
        Message: `Please add agents for the property, ${property.PropertyName}`,
        Timestamp: new Date(),
        User: owner.UserName,
      });

      if (property?.Owner != user) {
        res.send(sailDocument);
      } else {
        next();
      }
    } else {
      res.status(403).send('Only agents are allowed to generate contract');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to approve contract
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.ownerApproveContract = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let sailId = req.params.id;
    let sailDocument = await sailDocumentService.findOne(() => [
      {
        where: {
          SailID: sailId,
          DocumentType: 2, // Contract
        },
      },
    ]);

    let sailRecord = await sailRecordService.findOne(() => [
      {
        where: {
          SailID: sailId,
        },
      },
    ]);

    if (!sailRecord) {
      res.status(403).send('Sail not found');
      return;
    }
    let property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);
    if (property?.Owner != user) {
      res.status(403).send('Unauthorised access to sail.');
      return;
    }

    let document = await documentService.findOne(() => [{ where: { DocumentID: sailDocument.DocumentID } }]);

    let documentFileName = `${__dirname}/../uploads/documents/${document.DocumentID}`;
    let buyer = await userService.findOne(() => [{ where: { UserName: sailRecord.Buyer } }]);
    let owner = await userService.findOne(() => [{ where: { UserName: user } }]);

    // We need to create the envelop now
    let envelope = await docusignService.generateEnvelope(
      documentFileName,
      'contract',
      'docx',
      '1',
      'Contract document for the sail of property via RSVC',
      {
        name: `${buyer.FirstName} ${buyer.LastName}`,
        eMail: `${buyer.eMail}`,
        userName: `${buyer.UserName}`,
      },
      {
        name: `${owner.FirstName} ${owner.LastName}`,
        eMail: `${owner.eMail}`,
        userName: `${owner.UserName}`,
      }
    );

    // save the envelop id to the sail record
    sailRecord = await sailRecordService.create({
      SailID: sailId,
      EnvelopeID: envelope.envelopeId,
    });

    document = await documentService.create({
      DocumentID: document.DocumentID,
      DocumentName: 'Contract.pdf',
    });

    // Download the pdf version of the contract from the docusign
    documentFileName = `${__dirname}/../uploads/documents/${document.DocumentID}`;
    fs.unlinkSync(documentFileName);
    await docusignService.downloadSingleDocumentFromEnvelope(envelope.envelopeId, documentFileName);

    sailDocument = await sailDocumentService.create({
      SailDocumentID: sailDocument.SailDocumentID,
      SellerVerificationTime: new Date(),
      SellerVerificationStatus: 1, // Approved
      SellerRejectionReason: null,
    });

    res.send({ ...sailDocument });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to reject contract
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.ownerRejectContract = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    console.log(req.body);
    let sailId = req.body.sailId;
    let sailDocument = await sailDocumentService.findOne(() => [{ where: { SailDocumentID: req.body.sailDocumentId } }]);
    let sailRecord = await sailRecordService.findOne(() => [
      {
        where: {
          SailID: sailId,
        },
      },
    ]);
    if (!sailRecord) {
      res.status(403).send('Sail not found');
      return;
    }
    let property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);
    if (property?.Owner != user) {
      res.status(403).send('Unauthorised access to sail.');
      return;
    }

    let agent = await userService.findOne(() => [{ where: { UserName: sailRecord.Agent } }]);
    let owner = await userService.findOne(() => [{ where: { UserName: user } }]);

    // Send Notification to Owner to approve the contract
    const customDisplayName = `RSVC admin <${config.mailInfo.eMail}>`;
    const toEmail = [agent.eMail];
    const subject = `Contract rejected for property, ${property.PropertyName}`;
    const message = `The owner, ${owner.FirstName}, has rejected contract for the property, ${property.PropertyName}. The reason for rejection is: "${req.body.reason}".  
      Kindly generate a new one.`;
    await mailer.sendEmailWithCustomDisplayName(customDisplayName, toEmail, subject, message);

    await notificationService.create({
      Message: `Contract rejected for property, ${property.PropertyName}`,
      Timestamp: new Date(),
      User: agent.UserName,
    });

    sailDocument = await sailDocumentService.create({
      SailDocumentID: sailDocument.SailDocumentID,
      SellerVerificationTime: new Date(),
      SellerVerificationStatus: 2, // Rejected
      SellerRejectionReason: req.body?.reason || null,
    });

    res.status(200).send('Done');
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to reject contract
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.deleteContract = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let sailDocument = await sailDocumentService.findOne(() => [{ where: { SailDocumentID: req.params.id } }]);
    let sailId = sailDocument.SailID;
    let userData = await userService.findOne(() => [{ where: { UserName: user } }]);
    let sailRecord = await sailRecordService.findOne(() => [
      {
        where: {
          SailID: sailId,
        },
      },
    ]);
    let property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);

    if (sailRecord.Agent != user && property.Owner != user) {
      res.status(403).send('Unauthorised access to sail');
      return;
    }

    await sailRecordService.create({
      SailID: sailId,
      EnvelopeID: null,
    });
    fs.unlinkSync(`${__dirname}/../uploads/documents/${sailDocument.DocumentID}`);
    await documentAccessService.deleteRow({ where: { DocumentID: sailDocument.DocumentID } });
    await sailDocumentService.deleteRow({ where: { SailDocumentID: req.params.id } });
    res.status(200).send('Done');
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to geenrate contract
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 *
 * TBD: We need to update this controller dependin on the future changes
 */
exports.selectContractType = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let sailId = req.body.sailId;
    let contractType = req.body?.contractType ?? 0; // 0 - 'Casco Only', 1 - 'Semi-finished', 2 - 'Customised'
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
    sailRecord = await sailRecordService.create({
      SailID: sailId,
      ContractType: contractType,
    });

    res.status(200).send(sailRecord);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to get the signing url for a user
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 *
 * TBD: We need to update this controller dependin on the future changes
 */
const getSigningUrl = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let sailId = req.params.id;
    let sailRecord = await sailRecordService.findOne(() => [
      {
        where: {
          SailID: sailId,
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

    let userData = await userService.findOne(() => [{ where: { UserName: user } }]);
    let userRole = await roleService.findOne(() => [{ where: { RoleID: userData.Role } }]);
    let envelopeId;
    if (userRole?.RoleName?.toLowerCase() == 'owner') {
      let property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);
      if (property.Owner != userData.UserName) {
        res.status(403).send('Unauthorised owner access to sail');
        return;
      }
      envelopeId = sailRecord.EnvelopeID;
    } else if (sailRecord?.Agent == user || sailRecord?.Buyer == user) {
      envelopeId = sailRecord.EnvelopeID;
    } else {
      res.status(403).send('Unauthorised access to sail');
      return;
    }

    let sailDocument = await sailDocumentService.findOne(() => [
      {
        where: {
          SailID: sailId,
          DocumentType: 2, // Contract
        },
      },
    ]);

    let rolePath =
      userRole?.RoleName?.toLowerCase() == 'owner'
        ? 'seller/documents'
        : userRole?.RoleName?.toLowerCase() == 'agent'
        ? 'agent/documents'
        : userRole?.RoleName?.toLowerCase() == 'buyer'
        ? 'buyer/documents'
        : '';
    const { signingUrl } = await docusignService.generateView(
      encodeURI(`${config.docusign.redirectUrl}?sailId=${sailId}&docId=${sailDocument.DocumentID}&redirectTo=/${rolePath}`),
      {
        name: `${userData.FirstName} ${userData.LastName}`,
        eMail: `${userData.eMail}`,
        userName: `${userData.UserName}`,
      },
      envelopeId
    );
    res.status(200).send(signingUrl);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};
exports.getSigningUrl = getSigningUrl;

/**
 * Function to get the signing status of the contract for the sail
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 *
 * TBD: We need to update this controller dependin on the future changes
 */
exports.getSigningStatus = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let sailId = req.params.id;
    let sailRecord = await sailRecordService.findOne(() => [
      {
        where: {
          SailID: sailId,
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

    let status = await docusignService.getSigningStatus(sailRecord.EnvelopeID);
    res.status(200).send(status);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to get the signing status of the contract for the sail
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 *
 * TBD: We need to update this controller dependin on the future changes
 */
exports.docusignCallback = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let userData = await userService.findOne(() => [{ where: { UserName: user } }]);
    let event = req.query.event;
    let sailId = req.query.sailId;
    let docId = req.query.docId;
    let redirectTo = req.query.redirectTo;
    let sailRecord = await sailRecordService.findOne(() => [
      {
        where: {
          SailID: sailId,
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

    if (event == 'signing_complete') {
      let documentFileName = `${__dirname}/../uploads/documents/${docId}`;

      await docusignService.downloadSingleDocumentFromEnvelope(sailRecord.EnvelopeID, documentFileName);
      res.status(200).redirect(redirectTo);
      return;
    } else if (event == 'OnTTLExpired' || event == 'session_timeout') {
      const { signingUrl } = await docusignService.generateView(
        `${config.docusign.redirectUrl}?sailId=${sailId}&docId=${docId}&redirectTo=${redirectTo}`,
        {
          name: `${userData.FirstName} ${userData.LastName}`,
          eMail: `${userData.eMail}`,
          userName: `${userData.UserName}`,
        },
        sailRecord.EnvelopeID
      );
      res.redirect(signingUrl);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to get the sail record
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 *
 * TBD: We need to update this controller dependin on the future changes
 */
exports.getSailRecord = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let sailId = req.params.id;
    let sailRecord = await sailRecordService.findOne(() => [
      {
        where: {
          SailID: sailId,
        },
      },
    ]);
    if (!sailRecord) {
      res.status(403).send('Unauthorised access to sail');
      return;
    }
    res.status(200).send(sailRecord);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};
