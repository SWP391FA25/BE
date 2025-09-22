const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Contract = sequelize.define('Contract', {
  ContractId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  RentalId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'FK -> Rental.RentalId'
  },
  FilePath: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    comment: 'Path to stored contract file (.pdf, .docx, ...)'
  },
  RenterSignedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  RenterSignatureFile: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    comment: 'Path to renter signature image/file'
  },
  StaffSignedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  CreatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Contract',
  timestamps: false
});

module.exports = Contract;