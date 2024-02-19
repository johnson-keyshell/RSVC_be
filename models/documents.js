const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const Documents = sequelize.define('documents', {
  DocumentID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  DocumentName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  Owner: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  DocumentLink: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = Documents;
