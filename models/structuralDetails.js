const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const StructuralDetails = sequelize.define('structural_details', {
  DetailsID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  Description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  AgeOfBuilding: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  HouseType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  PropertyType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  YearOfConstructionOrPeriod: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = StructuralDetails;
