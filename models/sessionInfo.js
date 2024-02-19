const { DataTypes } = require("sequelize");
const sequelize = require("../services/db");

const SessionInfo = sequelize.define("session_info", {
  SessionID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  UserName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  IP: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIP: true,
    },
  },
  Timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

module.exports = SessionInfo;
