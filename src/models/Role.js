const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // chỉnh lại đường dẫn nếu cần

const Role = sequelize.define('Role', {
  RoleId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  Name: {
    type: DataTypes.ENUM('renter', 'staff', 'admin'),
    allowNull: false,
    unique: true,
    comment: 'Role name: renter, staff, admin'
  },
  Description: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
    comment: 'Short description of the role'
  },
}, {
  tableName: 'Role',
  timestamps: false,
});

module.exports = Role;