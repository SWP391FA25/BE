const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },

  fullName: { type: String, required: true },
  phone: { type: String },
  dob: { type: Date },
  address: { type: String },

  // Bổ sung từ yêu cầu bạn
  licenseNumber: { type: String },
  nationalId: { type: String },
  nationalIdImage: { type: String },
  driverLicenseImage: { type: String },

  // Trạng thái
  isVerified: { type: Boolean, default: false },
  verifyNote: { type: String },
  risky: { type: Boolean, default: false },

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
