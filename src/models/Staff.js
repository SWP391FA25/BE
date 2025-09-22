const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // chỉnh đường dẫn nếu cần

const Staff = sequelize.define('Staff', {
  EmployeeCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'Optional employee code/ID'
  },
  HireDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  IsActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'Staff',
  timestamps: false
});

module.exports = Staff;