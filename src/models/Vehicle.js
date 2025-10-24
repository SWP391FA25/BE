const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    // Thông tin cơ bản
    name: { type: String, required: true }, // VD: VinFast VF 3
    brand: { type: String, required: true }, // VD: VinFast
    model: { type: String, required: true }, // VD: VF 3, VF 8 Plus
    type: { type: String, required: true }, // VD: Minicar, B-SUV, C-SUV, D-SUV, E-SUV
    year: { type: Number, required: true },
    color: { type: String, required: true },
    licensePlate: { type: String, unique: true, required: true }, // biển số xe
    
    // Giá thuê
    pricePerDay: { type: Number, required: true },
    pricePerMonth: { type: Number, required: true },
    pricePerHour: { type: Number, required: true },
    
    // Trạng thái
    status: {
      type: String,
      enum: ["available", "out_of_stock", "reserved", "rented", "maintenance", "offline"],
      default: "available",
    },
    isOutOfStock: { type: Boolean, default: false },
    
    // Mô tả & tính năng
    description: { type: String },
    features: [String], // VD: ["Điều hòa", "GPS", "Bluetooth"]
    
    // Thông số kỹ thuật
    fuelType: { type: String, default: "Electric" },
    seatingCapacity: { type: Number, required: true }, // số chỗ ngồi
    transmission: { type: String, default: "Automatic" },
    range: { type: String }, // VD: "210km (NEDC)"
    seats: { type: String }, // VD: "4 chỗ"
    trunk: { type: String }, // VD: "Dung tích cốp 285L"
    horsepower: { type: Number },
    airbags: { type: Number },
    drive: { type: String }, // VD: "AWD/2 cầu toàn thời gian"
    
    // Điều kiện thuê
    dailyDistanceLimitKm: { type: Number, default: 300 },
    rentalConditions: {
      requiredDocuments: [String],
      payment: {
        method: String,
        terms: String,
      },
      depositVND: Number,
    },
    
    // Tính năng đặc biệt
    hasFreeCharging: { type: Boolean, default: false },
    
    // Hình ảnh
    image: { type: String }, // Ảnh thumbnail chính
    comingSoonImage: { type: String }, // Ảnh Coming Soon
    imageGallery: [String], // Array các ảnh chi tiết
    
    // Liên kết
    station: { type: mongoose.Schema.Types.ObjectId, ref: "Station" }, // xe thuộc điểm thuê nào
    currentRenter: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ai đang thuê xe
    
    // Pin & năng lượng (để tracking)
    batteryCapacityKWh: { type: Number },
    stateOfChargePct: { type: Number, min: 0, max: 100, default: 100 },
    
    // Thông tin khác
    notes: [String],
    odometerKm: { type: Number, default: 0 }, // quãng đường đã chạy
    
    // Bảo trì
    lastMaintenanceAt: { type: Date },
    maintenanceNote: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
