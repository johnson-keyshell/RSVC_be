const { DataTypes } = require("sequelize");
const sequelize = require("../services/db");

const Property = sequelize.define("property", {
  PropertyID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  PropertyName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  Owner: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  Agent1: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  Agent2: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ThumbnailImage: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  MainImage: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  Address: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  Details: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  Draft: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
});

module.exports = Property;
