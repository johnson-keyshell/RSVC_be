const { Op } = require('sequelize');
const fs = require('fs');
const propertyService = require('../services/properties');
const documentService = require('../services/document');
const documentAccessService = require('../services/documentAccess');
const sailRecordService = require('../services/sailRecords');
const chatService = require('../services/chat');

/**
 * Function to upload a document
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */

exports.uploadChatDocument = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }

    if (!req.files || !req.files.document) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let chatId = req.body.chatId;
    let chat = await chatService.findOne(() => [
      {
        where: {
          ChatID: chatId,
          [Op.or]: [{ User1: user }, { User2: user }],
        },
      },
    ]);
    if (!chat) {
      res.status(403).send('Unauthorised access to chat');
      return;
    }

    const uploadedFile = req.files.document;
    const fileName = uploadedFile.name;
    fs.mkdirSync(`${__dirname}/../uploads/documents`, { recursive: true }); // Create the directory if it doesn't exist
    let document = await documentService.create({
      DocumentName: fileName,
      Owner: user,
    });
    document = await documentService.create({
      DocumentID: document.DocumentID,
      DocumentLink: `/document/chat/${chatId}/${document.DocumentID}`,
    });
    const uploadPath = `${__dirname}/../uploads/documents/${document.DocumentID}`;

    uploadedFile.mv(uploadPath, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        await documentService.deleteRow({ where: { DocumentID: document.DocumentID } });
        return res.status(500).json({ message: 'File upload failed' });
      }

      let sailRecord = await sailRecordService.findOne(() => [{ where: { SailID: chat.SailID } }]);
      let property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);
      for (let documnetUser of [chat.User1, chat.User2, property.Owner])
        await documentAccessService.create({
          User: documnetUser,
          DocumentID: document.DocumentID,
        });
      res.status(201).send(document);
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
exports.deteleChatDocument = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let chat = await chatService.findOne(() => [
      {
        where: {
          ChatID: req.params.chatid,
          [Op.or]: [{ User1: user }, { User2: user }],
        },
      },
    ]);
    if (!chat) {
      res.status(403).send('Unauthorised access');
      return;
    }
    fs.unlinkSync(`${__dirname}/../uploads/documents/${req.params.id}`);
    await documentAccessService.deleteRow({ where: { DocumentID: req.params.id } });
    res.send(`${await documentService.deleteRow({ where: { DocumentID: req.params.id } })} document deleted`);
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
exports.downloadChatDocument = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let chat = await chatService.findOne(() => [
      {
        where: {
          ChatID: req.params.chatid,
          [Op.or]: [{ User1: user }, { User2: user }],
        },
      },
    ]);
    if (!chat) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let document = await documentService.findOne(() => [{ where: { DocumentID: req.params.id } }]);
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
    let document = await documentService.findOne(() => [{ where: { DocumentID: req.params.id } }]);

    res.send(document);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};
