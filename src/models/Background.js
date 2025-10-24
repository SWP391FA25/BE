const mongoose = require("mongoose");

const backgroundSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // VD: banner, bg1, bg2
    image: { type: String, required: true }, // Path to image
    description: { type: String }, // Optional description
    isActive: { type: Boolean, default: true }, // Có đang được sử dụng không
    order: { type: Number, default: 0 }, // Thứ tự hiển thị
  },
  { timestamps: true }
);

module.exports = mongoose.model("Background", backgroundSchema);

