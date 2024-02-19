const authService = require('../services/auth');

// let socketConnections = {}; // We will need this to remove a users spcific socket connection
let userConnections = {}; // We will need this to emit events to all active socket connections of a user - This isprimarily used for notifications
let activeChatList = {}; // This will contain the users active chat list screens socket ids
let activeChat = {}; // This will contain the chat id of the opened chat of the user in each socket connection. The key will be UserName_socketId

let socketIo = { io: {} };

const initialize = (io) => {
  io.on('connection', (socket) => {
    console.log('WebSocket connection established');

    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) {
      socket.disconnect();
      return;
    }
    const cookies = socket.handshake.headers.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    const token = cookies['token'];

    authService
      .validateToken(token)
      .then((tokenData) => {
        const userId = tokenData.data.UserName;

        userConnections[userId] = [...(userConnections?.[userId] ?? []), socket.id];
        // socketConnections[socket.id] = userId;
        console.log('User connection established: ', userId, userConnections?.[userId]);
        // The event emmitted by FE when the user lands on the chat screen
        socket.on('in-chat-screen', () => {
          console.log('User landed on chat screen: ', userId);
          activeChatList[userId] = [...(activeChatList?.[userId] ?? []), socket.id];
        });

        // The event emmitted by the FE when the user opens a chat
        socket.on('open-chat', (chatId) => {
          activeChat[`${userId}_${socket.id}`] = chatId;
          console.log('User opened a chat: ', { userId, chatId, socketId: socket.id, activeChat });
        });

        // This event is emmited when the user leave the chat screen
        socket.on('leave-chat-screen', () => {
          leaveChatscreen(socket, userId);
          console.log('User left chat screen', { userId, socketId: socket.id, activeChatList });
        });

        // This event is emmited when the user leave the chat screen
        socket.on('close-chat', () => {
          // Remove socket from the active chat  sockets
          leaveActiveChat(socket, userId);
          console.log('User closeed the open chat', { userId, socketId: socket.id, activeChat });
        });

        // This is called when the user completely closes the web application
        socket.on('disconnect', () => {
          terminateConnection(socket, userId);
          console.log('WebSocket disconnected: ', userId, socket.id, userConnections?.[userId]);
        });

        socket.on('error', (error) => {
          terminateConnection(socket, userId);
          console.error('WebSocket error:', error, userId, socket.id, userConnections?.[userId]);
        });
      })
      .catch(() => {
        console.log('Unauthorized connection');
        socket.disconnect();
      });
  });
  socketIo.io = io;
};

function terminateConnection(socket, user) {
  // let user = socketConnections[socket.id];
  if (user && userConnections?.[user]) {
    // Clear the notification sockets
    userConnections[user] = userConnections[user].filter((socketConId) => socketConId != socket.id);
    if (!userConnections[user]?.length) {
      delete userConnections[user];
    }
    // delete socketConnections[socket.id];
    leaveChatscreen(socket, user);
  }
}

// Remove socket from the chat list active sockets
function leaveChatscreen(socket, user) {
  // let user = socketConnections[socket.id];
  if (user && activeChatList?.[user]) {
    activeChatList[user] = activeChatList[user].filter((socketConId) => socketConId != socket.id);
    if (!activeChatList[user]?.length) {
      delete activeChatList[user];
    }

    // Remove socket from the active chat  sockets
    leaveActiveChat(socket, user);
  }
}

function leaveActiveChat(socket, user) {
  // let user = socketConnections[socket.id];
  if (user && activeChat?.[`${user}_${socket.id}`]) {
    delete activeChat?.[`${user}_${socket.id}`];
  }
}

module.exports = { socketIo, userConnections, initialize, activeChatList, activeChat };
