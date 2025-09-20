const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // chỉnh lại đường dẫn nếu cần

const Role = sequelize.define('Role', {
  RoleId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  Name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  Description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'Role',
  timestamps: false,
});

module.exports = Role;