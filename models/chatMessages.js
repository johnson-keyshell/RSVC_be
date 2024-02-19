const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const Messages = sequelize.define('chat_messages', {
  ChatMesssageID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  From: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  To: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  MessageBody: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  MessageType: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  ReadFlag: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  AgreementStatus: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  Time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: new Date(),
  },
  ChatID: {
    type: DataTypes.UUID,
    allowNull: false,
  },
});

module.exports = Messages;
