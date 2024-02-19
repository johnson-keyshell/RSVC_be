const fs = require('fs');

const chatServices = require('../../chat');
const chatMessageService = require('../../chatMessages');
const config = require("../../../config/config")
const mailer = require('./mailer');
const imageService = require('../../images');
const propertyService = require('../../properties');
const documentService = require('../../document');
const documentAccessService = require('../../documentAccess');
const sailRecordService = require('../../sailRecords');
const constants = require('../../../constants/constants');
const userService = require('../../users');

async function checkIfThreadIsMonitored(threadId) {
  try {
    let chat = await chatServices.findOne(() => [{ where: { MailThreadID: threadId } }]);
    if (!chat) {
      return null;
    }
    return true;
  } catch (error) {
    console.error('Error checking Thread ID in database:', error);
    return false;
  }
}
exports.checkIfThreadIsMonitored = checkIfThreadIsMonitored;

// Function to check if a Thread ID exists in your database
async function processMailChatMessage(threadId, messageDetails, fromEmail, messageId) {
  try {
    let chat = await chatServices.findOne(() => [{ where: { MailThreadID: threadId } }]);
    if (!chat) {
      return;
    }
    let chatId = chat.ChatID;
    const senderEmail = messageDetails.payload.headers.find((header) => header.name === 'From').value;

    if (chat.Status == 3) {
      let messageContent = '';

      let messageTypes = constants.MessageType.map((type) => type.toLowerCase());
      let fromUser = await userService.findOne(() => [{ where: { eMail: fromEmail } }]);
      let toUser = chat.User1 == fromUser.UserName ? chat.User2 : chat.User2;
      toUser = await userService.findOne(() => [{ where: { UserName: toUser } }]);
      if (messageDetails.payload.parts) {
        let messagePart = messageDetails.payload.parts.find((part) => part.mimeType === 'text/plain'); // Change mimeType based on the desired content type

        if (messagePart && messagePart.body && messagePart.body.size > 0 && messagePart.body.data) {
          // If the specific message part contains body content
          messageContent = Buffer.from(messagePart.body.data, 'base64').toString('utf-8');
        } else {
          let alternativePart = messageDetails.payload.parts.find((part) => part.mimeType === 'multipart/alternative');
          let messagePart = alternativePart.parts.find((part) => part.mimeType === 'text/plain');
          if (messagePart && messagePart.body && messagePart.body.size > 0 && messagePart.body.data) {
            // If the specific message part contains body content
            messageContent = Buffer.from(messagePart.body.data, 'base64').toString('utf-8');
          }
        }

        messageContent = messageContent
          .slice(0, messageContent.match(/On(?=.*at)(?=.*@)(?=.*wrote)/) ? messageContent.match(/On(?=.*at)(?=.*@)(?=.*wrote)/).index : -1)
          .trim()
          .replace(/(\r\n)+/g, '\r\n');
        console.log({ messageContent });
        await chatMessageService.create({
          From: fromUser.UserName,
          To: toUser.UserName,
          MessageBody: messageContent ?? 'Could not extract message!!!',
          MessageType: messageTypes.indexOf('text'),
          Time: new Date(),
          ChatID: chatId,
        });

        const attachments = messageDetails.payload.parts.filter((part) => part.filename && part.body.attachmentId);

        // Loop through attachments
        for (const attachment of attachments) {
          const attachmentId = attachment.body.attachmentId;
          const filename = attachment.filename;
          const mimeType = attachment.mimeType;

          // Download attachment
          const attachmentData = await mailer.getAttachment(messageId, attachmentId);
          // Handle attachment data
          if (attachmentData && attachmentData.data && attachmentData.data.data) {
            const fileData = attachmentData.data.data;
            const fileContent = Buffer.from(fileData, 'base64'); // Convert attachment data from base64

            // Determine download directory based on MIME type
            if (mimeType.startsWith('image/')) {
              fs.mkdirSync(`${__dirname}/../../../uploads/images`, { recursive: true }); // Create the directory if it doesn't exist
              let image = await imageService.create({
                ImageName: filename,
              });
              const uploadPath = `${__dirname}/../../../uploads/images/${image.ImageID}`;
              fs.writeFileSync(uploadPath, fileContent);
              image = await imageService.create({ ImageLink: `/image/${chatId}/${image.ImageID}`, ImageID: image.ImageID });
              await chatMessageService.create({
                From: fromUser.UserName,
                To: toUser.UserName,
                MessageBody: image.ImageID,
                MessageType: messageTypes.indexOf('image'),
                Time: new Date(),
                ChatID: chatId,
              });
            } else {
              fs.mkdirSync(`${__dirname}/../../../uploads/documents`, { recursive: true }); // Create the directory if it doesn't exist
              let document = await documentService.create({
                DocumentName: filename,
                Owner: fromUser.UserName,
              });
              document = await documentService.create({
                DocumentID: document.DocumentID,
                DocumentLink: `/document/chat/${chatId}/${document.DocumentID}`,
              });
              const uploadPath = `${__dirname}/../../../uploads/documents/${document.DocumentID}`;
              fs.writeFileSync(uploadPath, fileContent);
              let sailRecord = await sailRecordService.findOne(() => [{ where: { SailID: chat.SailID } }]);
              let property = await propertyService.findOne(() => [{ where: { PropertyID: sailRecord.Property } }]);
              for (let documnetUser of [chat.User1, chat.User2, property.Owner])
                await documentAccessService.create({
                  User: documnetUser,
                  DocumentID: document.DocumentID,
                });
              await chatMessageService.create({
                From: fromUser.UserName,
                To: toUser.UserName,
                MessageBody: document.DocumentID,
                MessageType: messageTypes.indexOf('document'),
                Time: new Date(),
                ChatID: chatId,
              });
            }
          }
        }
      } else {
        messageContent = messageDetails?.payload?.body?.data
          ? Buffer.from(messageDetails?.payload?.body?.data, 'base64').toString('utf-8')
          : 'Could not extract message!!!';

        await chatMessageService.create({
          From: fromUser.UserName,
          To: toUser.UserName,
          MessageBody: messageDetails?.payload?.body?.data ?? 'Could not extract message!!!',
          MessageType: messageTypes.indexOf('text'),
          Time: new Date(),
          ChatID: chatId,
        });
      }
    }

    if (chat.Status == 0) {
      const customDisplayName = `RSVC admin <${config.mailInfo.eMail}>`;
      const toEmail = [senderEmail];
      const subject = `Chat is not yet active`;
      const message = `Kindly wait till the agent acknowledges your interest.`;
      mailer.sendEmailWithCustomDisplayName(customDisplayName, toEmail, subject, message);
    } else if (chat.Status == 1 || chat.Status == 2) {
      const customDisplayName = `RSVC admin <${config.mailInfo.eMail}>`;
      const toEmail = [senderEmail];
      const subject = `Inactive chat`;
      const message = `This chat is no longer active.`;
      mailer.sendEmailWithCustomDisplayName(customDisplayName, toEmail, subject, message);
    }
    await mailer.markMessageAsRead(messageId);
  } catch (error) {
    console.error('Error checking Thread ID in database:', error);
    return false;
  }
}

exports.processMailChatMessage = processMailChatMessage;
