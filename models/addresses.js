const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const Addresses = sequelize.define('addresses', {
  AddressID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  AddressLine1: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  AddressLine2: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  Area: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  Place: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  Pincode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  GoogleMapLink: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  Latitude: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  Longitude: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
});

module.exports = Addresses;
