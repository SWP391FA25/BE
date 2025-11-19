const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  fullName: { type: String, required: true },
  role: { type: String, enum: ["renter", "staff", "admin"], default: "renter" },
  avatarUrl: { type: String },
  phone: { type: String },
  dob: { type: Date },
  address: { type: String },
  ward: { type: String },
  district: { type: String },
  city: { type: String },
  // Giấy tờ tuỳ thân & bằng lái (tùy chọn, có thể bổ sung sau đăng ký)
  licenseNumber: { type: String },
  nationalId: { type: String },
  nationalIdImage: { type: String },
  driverLicenseImage: { type: String },
  // Trạng thái
  isVerified: { type: Boolean, default: false },
  verifyNote: { type: String, default: "" },
  risky: { type: Boolean, default: false }, // Đánh dấu khách hàng rủi ro
  // Liên kết với trạm (cho staff)
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: "Station", default: null },
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


// Middleware để update updatedAt khi save
userSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("User", userSchema);
