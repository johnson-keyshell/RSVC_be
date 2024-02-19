const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const AgentAgreement = sequelize.define('agent_agreement', {
  AgentAgreementID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  AgreementText: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  Agent: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  Buyer: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  SentTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  ResolutionTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  Status: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  SailID: {
    type: DataTypes.UUID,
    allowNull: false,
  },
});

module.exports = AgentAgreement;
