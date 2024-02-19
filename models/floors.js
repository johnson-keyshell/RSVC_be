const { DataTypes } = require("sequelize");
const sequelize = require("../services/db");

const Floor = sequelize.define("floor", {
  FloorID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  FloorName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  UnitCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  LayoutImage: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  Property: {
    type: DataTypes.UUID,
    allowNull: false,
  },
});

module.exports = Floor;
