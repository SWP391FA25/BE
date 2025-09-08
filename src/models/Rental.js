const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
  {
    renter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    pickupStation: { type: mongoose.Schema.Types.ObjectId, ref: "Station", required: true },
    dropoffStation: { type: mongoose.Schema.Types.ObjectId, ref: "Station" },
    reservationTime: Date,
    checkoutTime: Date,
    checkinTime: Date,
    status: {
      type: String,
      enum: ["reserved", "checked_out", "checked_in", "cancelled"],
      default: "reserved",
    },
    pricePerHour: { type: Number, required: true },
    depositAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    distanceKm: { type: Number, default: 0 },
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


