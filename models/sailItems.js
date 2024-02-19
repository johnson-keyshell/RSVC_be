const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const SailItem = sequelize.define('sail_item', {
  SailItemID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  ApartmentID: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  SailID: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  FloorID: {
    type: DataTypes.UUID,
    allowNull: false,
  },
});

module.exports = SailItem;
