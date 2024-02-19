const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const Images = sequelize.define('custom_fields', {
  FieldID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  FieldName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  FieldValue: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  LinkedTo: {
    type: DataTypes.UUID,
    allowNull: false,
  },
});

module.exports = Images;
