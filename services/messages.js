const messageModel = require("../models/messages");

const updateMessage = async (data) => {
  try {
    const row = await messageModel.create(data);
    return row;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const getAllMessages = async (from, to) => {
  try {
    const messages = await messageModel.findAll({ where: { from: from ,to: to} });
    return messages;
  } catch (error) {
    console.error(error);
    return null;
  }
};

module.exports = {
  updateMessage,
  getAllMessages,
};
