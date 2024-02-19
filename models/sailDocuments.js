const { DataTypes } = require('sequelize');
const sequelize = require('../services/db');

const SailDocument = sequelize.define('sail_document', {
  SailDocumentID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  AgentVerificationTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  AgentVerificationStatus: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  AgentRejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  SellerVerificationTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  SellerVerificationStatus: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  SellerRejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  SailID: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  DocumentID: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  DocumentType: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

module.exports = SailDocument;
