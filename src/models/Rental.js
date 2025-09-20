const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
  {
    reservation: { type: mongoose.Schema.Types.ObjectId, ref: "Reservation" }, // FK ReservationId
    renter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // FK RenterId
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true }, // FK VehicleId
    pickupStation: { type: mongoose.Schema.Types.ObjectId, ref: "Station", required: true }, // FK PickupStationId
    returnStation: { type: mongoose.Schema.Types.ObjectId, ref: "Station" }, // FK ReturnStationId

    pickupTime: { type: Date }, // PickupTime
    returnTime: { type: Date }, // ReturnTime

    startOdometerKm: { type: Number, default: 0 }, // StartOdometerKm
    endOdometerKm: { type: Number, default: 0 },   // EndOdometerKm
    totalDistanceKm: { type: Number, default: 0 }, // TotalDistanceKm

    status: {
      type: String,
      enum: ["reserved", "ongoing", "completed", "cancelled"],
      default: "reserved",
    },

    contract: { type: mongoose.Schema.Types.ObjectId, ref: "Contract" }, // ContractId

    // Thông tin thanh toán
    pricePerHour: { type: Number, required: true },
    depositAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },

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
