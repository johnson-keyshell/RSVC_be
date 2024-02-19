const { DataTypes } = require("sequelize");
const sequelize = require("../services/db");

const Roles = sequelize.define("roles", {
  RoleID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  RoleName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Roles;
