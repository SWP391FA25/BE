const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    vin: { type: String, unique: true, sparse: true }, // số khung (có thể null cho xe nhỏ)
    plateNumber: { type: String, unique: true, required: true }, // biển số xe
    model: { type: String, required: true }, // model xe (VD: eScooter S1, EV Bike X)
    type: { type: String, enum: ["scooter", "bike", "car"], required: true }, // loại xe điện

    // Pin & năng lượng
    batteryCapacityKWh: { type: Number, required: true },
    stateOfChargePct: { type: Number, min: 0, max: 100, default: 100 },

    // Trạng thái hoạt động
    status: {
      type: String,
      enum: ["available", "reserved", "rented", "maintenance", "offline"],
      default: "available",
    },

    // Liên kết
    station: { type: mongoose.Schema.Types.ObjectId, ref: "Station", required: true }, // xe thuộc điểm thuê nào
    currentRenter: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ai đang thuê xe

    // Thông tin khác
    images: [String], // ảnh chụp xe
    notes: String,
    odometerKm: { type: Number, default: 0 }, // quãng đường đã chạy

    // Bảo trì
    lastMaintenanceAt: { type: Date },
    maintenanceNote: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
