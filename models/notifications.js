const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const Notification = sequelize.define('notification', {
  NotificationID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  Message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  Timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  ReadFlag: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  User: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Notification;
