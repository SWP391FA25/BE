const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    vin: { type: String, unique: true, sparse: true },
    plateNumber: { type: String, unique: true, required: true },
    model: { type: String, required: true },
    type: { type: String, enum: ["scooter", "bike", "car"], required: true },
    batteryCapacityKWh: { type: Number, required: true },
    stateOfChargePct: { type: Number, min: 0, max: 100, default: 100 },
    status: {
      type: String,
      enum: ["available", "reserved", "rented", "maintenance", "offline"],
      default: "available",
    },
    station: { type: mongoose.Schema.Types.ObjectId, ref: "Station" },
    images: [String],
    notes: String,
    odometerKm: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);


