const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const SailRecord = sequelize.define('sail_record', {
  SailID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  Property: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  Agent: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  Buyer: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  AgentAgreementID: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  SailStatus: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  EnvelopeID: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ContractType: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

module.exports = SailRecord;
