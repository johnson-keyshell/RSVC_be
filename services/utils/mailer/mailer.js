const { google } = require('googleapis');
const mailcomposer = require('mailcomposer');
const { authorize } = require('./mailAuth');

function getAttachment(messageId, attachmentId) {
  return new Promise((resolve, reject) => {
    authorize(async (auth) => {
      const gmail = google.gmail({ version: 'v1', auth });
      // Download attachment
      const attachmentData = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId,
      });
      resolve(attachmentData);
    });
  });
}

exports.getAttachment = getAttachment;

let sendEmailWithCustomDisplayName = (fromAddress, toAddresses, subject, message, threadId) =>
  new Promise((resolve, reject) => {
    authorize(async (auth) => {
      const gmail = google.gmail({ version: 'v1', auth });

      const rawEmail = await makeRawEmail(fromAddress, toAddresses, subject, message, threadId);

      gmail.users.messages.send(
        {
          userId: 'me',
          resource: {
            raw: rawEmail,
            ...(threadId ? { threadId } : {}),
          },
        },
        (err, response) => {
          if (err) {
            reject();
            console.error('Error sending email:', err);
          } else {
            resolve(response.data);
            console.log('Email sent:', response.data);
          }
        }
      );
    });
  });

async function makeRawEmail(fromAddress, toAddresses, subject, message) {
  // getLastMessageIdInThread(threadId);
  const mail = mailcomposer({
    from: fromAddress,
    to: toAddresses,
    subject: subject,
    text: message,
  });

  const messageData = await new Promise((resolve, reject) => {
    mail.build((err, message) => {
      if (err) {
        reject(err);
      } else {
        resolve(message);
      }
    });
  });
  return Buffer.from(messageData).toString('base64');
}
exports.sendEmailWithCustomDisplayName = sendEmailWithCustomDisplayName;

async function markMessageAsRead(messageId) {
  authorize(async (auth) => {
    try {
      const gmail = google.gmail({ version: 'v1', auth });

      const response = await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        resource: {
          removeLabelIds: ['UNREAD'], // Remove the 'UNREAD' label to mark the message as read
        },
      });

      console.log('Message marked as read:', response.data);
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  });
}
exports.markMessageAsRead = markMessageAsRead;

// const customDisplayName = `RSVC admin <joniejacob1996@gmail.com>`;
// const toEmail = ['jonieindian@gmail.com'];
// const subject = `Agent not added for property`;
// const message = `The buyer, `;
// sendEmailWithCustomDisplayName(customDisplayName, toEmail, subject, message);
