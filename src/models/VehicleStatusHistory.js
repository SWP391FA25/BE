const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VehicleStatusHistory = sequelize.define('VehicleStatusHistory', {
    //HistoryId(PK)
    //VehicleId(FK)
    //ContractId(FK)
  Status: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Status label (e.g. available, rented, maintenance, etc.)'
  },
  Note: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  RecordedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'VehicleStatusHistory',
  timestamps: false
});

module.exports = VehicleStatusHistory;