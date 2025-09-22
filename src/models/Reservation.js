const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Reservation = sequelize.define('Reservation', {
    //ReservationId(PK)
    //RenterId(FK)
    //VehicleId(FK)
    //PickupStationId(FK)
    //ReturnStationId(FK)
  ReservationId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  RenterId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'FK -> User.UserId'
  },
  VehicleId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'FK -> Vehicle.VehicleId (optional)'
  },
  PickupStationId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'FK -> Station.StationId'
  },
  ReturnStationId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'FK -> Station.StationId'
  },
  StartAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  EndAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  Status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'expired'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'pending, confirmed, cancelled, expired'
  },
  CreatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  UpdatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'Reservation',
  timestamps: false
});

module.exports = Reservation;