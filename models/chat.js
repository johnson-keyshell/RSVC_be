const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const Chat = sequelize.define('chat', {
  ChatID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  LastMessageTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  Status: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  User1: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  User2: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  SailID: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  MailThreadID: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = Chat;
