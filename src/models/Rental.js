const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
  {
    reservation: { type: mongoose.Schema.Types.ObjectId, ref: "Reservation" }, // FK ReservationId
    renter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // FK RenterId
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true }, // FK VehicleId
    pickupStation: { type: mongoose.Schema.Types.ObjectId, ref: "Station", required: true }, // FK PickupStationId
    returnStation: { type: mongoose.Schema.Types.ObjectId, ref: "Station" }, // FK ReturnStationId

    // Scheduled pickup/return dates and times
    scheduledPickupDate: { type: Date }, // Ngày dự kiến nhận xe
    scheduledReturnDate: { type: Date }, // Ngày dự kiến trả xe
    scheduledPickupTime: { type: String }, // Giờ dự kiến nhận xe (HH:MM)
    scheduledReturnTime: { type: String }, // Giờ dự kiến trả xe (HH:MM)

    // Actual pickup/return times
    pickupTime: { type: Date }, // Thời gian thực tế nhận xe
    returnTime: { type: Date }, // Thời gian thực tế trả xe

    // Rental mode
    rentalMode: {
      type: String,
      enum: ["hour", "day"],
      default: "hour"
    },

    startOdometerKm: { type: Number, default: 0 }, // StartOdometerKm
    endOdometerKm: { type: Number, default: 0 },   // EndOdometerKm
    totalDistanceKm: { type: Number, default: 0 }, // TotalDistanceKm

    status: {
      type: String,
      enum: ["reserved", "confirmed", "ongoing", "completed", "cancelled"],
      default: "reserved",
    },

    contract: { type: mongoose.Schema.Types.ObjectId, ref: "Contract" }, // ContractId
    contractSignature: {
      data: String, // Base64 signature image
      signedAt: Date,
      ipAddress: String,
      userAgent: String
    },

    // Thông tin thanh toán
    pricePerHour: { type: Number },
    pricePerDay: { type: Number },
    depositAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    
    // Payment information
    orderCode: { type: String, unique: true, sparse: true }, // PayOS orderCode
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled"],
      default: "pending"
    },
    paymentTime: { type: Date },

    // Renter information (từ booking form)
    fullName: { type: String },
    phone: { type: String },
    email: { type: String },

    // Additional booking info
    referralCode: { type: String },
    note: { type: String },
    voucher: { type: String },

    // Ghi nhận tình trạng xe khi nhận/trả
    conditionCheckout: {
      photos: [String],
      note: String,
      batteryPct: Number,
    },
    conditionCheckin: {
      photos: [String],
      note: String,
      batteryPct: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rental", rentalSchema);
