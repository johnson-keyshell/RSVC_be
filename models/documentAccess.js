const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const DocumentAccess = sequelize.define('document_access', {
  DocumentAccessID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  User: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  DocumentID: {
    type: DataTypes.UUID,
    allowNull: false,
  },
});

module.exports = DocumentAccess;
