const mongoose = require("mongoose");

const stationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Tên trạm
    address: { type: String, required: true }, // Địa chỉ chi tiết
    
    // Vị trí địa lý
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },

    capacity: { type: Number, required: true }, // sức chứa tối đa số xe
    contactPhone: { type: String }, // số điện thoại liên hệ
    active: { type: Boolean, default: true }, // có hoạt động hay không
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// Index để query theo vị trí
stationSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Station", stationSchema);
