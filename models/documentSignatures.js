const { DataTypes } = require("sequelize");
const sequelize = require("../services/db");

const DocumentSignatures = sequelize.define("document_signatures", {
  SignatureID: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  DocumentID: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  SignedBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  Date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

module.exports = DocumentSignatures;
