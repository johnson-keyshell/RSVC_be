const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');
const { SignUpMethods: SIGN_UP_METHODS, ContactMethods: CONTACT_METHODS, SaltRounds: saltRounds } = require('../constants/constants');
const bcrypt = require('bcrypt');

const Users = sequelize.define('users', {
  UserName: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
    unique: true,
  },
  HashPassword: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  FirstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  LastName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  Role: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  eMail: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  PhoneNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  PreferredContactMethod: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [CONTACT_METHODS],
    },
    defaultValue: 'E-Mail',
  },
  SignUpMethod: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [SIGN_UP_METHODS],
    },
  },
  ProfilePic: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  Address: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  DateTiemOfJoining: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

Users.beforeCreate(async (user, options) => {
  if (user?.HashPassword) {
    const HashPassword = await bcrypt.hash(user.HashPassword, saltRounds);
    user.HashPassword = HashPassword;
  }
});

module.exports = Users;
