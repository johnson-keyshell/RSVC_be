const { DataTypes } = require("sequelize");
const sequelize = require("../services/db");

const Amenities = sequelize.define("amenities", {
  AmenityID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  AmenityType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  Number: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  ReferenceID: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  Image: {
    type: DataTypes.UUID,
    allowNull: true,
  },
});

module.exports = Amenities;
