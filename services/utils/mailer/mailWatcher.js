const { google } = require('googleapis');
const config = require("../../../config/config")
const { processMailChatMessage, checkIfThreadIsMonitored } = require('./chatMessageProcessing');
const { authorize } = require('./mailAuth');

// Imports the Google Cloud client library
const { PubSub } = require('@google-cloud/pubsub');

let runnerFlag = 0;

let initiateMailWatcher = () =>
  authorize((auth) => {
    watchEmailChanges(auth);
  });

// Set up watch to monitor changes in the user's inbox
function watchEmailChanges(auth) {
  const gmail = google.gmail({ version: 'v1', auth });

  gmail.users.watch(
    {
      userId: config.mailInfo.eMail,
      requestBody: {
        labelIds: ['INBOX'],
        topicName: 'projects/rsvc-414010/topics/RSVC_Topic',
      },
    },
    (err, res) => {
      if (err) {
        console.error('Error setting up watch:', err);
        return;
      }
      console.log('Watch established:', res.data);
    }
  );

  // Create a subscription to the Pub/Sub topic
  const pubsub = new PubSub({ projectId: 'rsvc-414010', keyFilename: './services/utils/mailer/keyFile.json' });
  // const pubsub = new PubSub()//{ projectId: 'feisty-flames-387504' });
  const subscriptionName = 'RSVC_sub';
  const subscription = pubsub.subscription(subscriptionName);

  // Listen for messages from the subscription
  subscription.on('message', (message) => {
    const data = JSON.parse(message.data.toString());
    runnerFlag += 1;
    if (runnerFlag == 1) {
      fetchAddedMessagesDetails();
    }
    // Handle message data (notification about Gmail changes)
    console.log('Received message:', data);
    // Process the message data related to Gmail changes here
    message.ack(); // Acknowledge the message
  });
}

async function fetchAddedMessagesDetails() {
  if (runnerFlag > 0) {
    await new Promise((resolve, reject) => {
      authorize(async (auth) => {
        const gmail = google.gmail({ version: 'v1', auth });

        let unreadMessages = await getLastUnreadMessage();
        for (const message of unreadMessages) {
          // console.log(await checkIfThreadIsMonitored(message.threadId));
          if (await checkIfThreadIsMonitored(message.threadId)) {
            const messageDetails = await gmail.users.messages.get({
              userId: 'me',
              id: message.id,
              format: 'full', // Retrieve full message details
            });

            // Extract sender's email address from the message headers
            const headers = messageDetails.data.payload.headers;
            let fromEmail = '';
            for (const header of headers) {
              if (header.name === 'From') {
                fromEmail = header.value;
                fromEmail = fromEmail.match(/<([^>]+)>/)?.[1] || fromEmail;
                break;
              }
            }
            // Extract the Thread ID from the message details
            const threadId = message.threadId;
            console.log('Added Message Details:', fromEmail);

            await processMailChatMessage(threadId, messageDetails.data, fromEmail, message.id);
          }
        }
        resolve();
      });
    });
    runnerFlag -= 1;
    fetchAddedMessagesDetails();
  }
}

async function getLastUnreadMessage() {
  return new Promise((resolve, reject) => {
    authorize(async (auth) => {
      const gmail = google.gmail({ version: 'v1', auth });

      try {
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: 'is:unread', // Filter for unread messages
          orderBy: 'oldest',
        });

        const messages = response.data.messages;
        console.log('Unread Messages in mailbox: ', messages.length);
        if (messages && messages.length > 0) {
          resolve(messages);
        } else {
          console.log('No messages found in the thread.');
          resolve(null);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
    });
  });
}

exports.initiateMailWatcher = initiateMailWatcher;
// getLastUnreadMessage();
