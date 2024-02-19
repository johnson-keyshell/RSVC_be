const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const Images = sequelize.define('images', {
  ImageID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  ImageName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ImageLink: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  LinkedTo: {
    type: DataTypes.UUID,
    allowNull: true,
  },
});

module.exports = Images;
