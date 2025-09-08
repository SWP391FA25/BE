const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["renter", "staff", "admin"], default: "renter" },
  licenseNumber: String,
  nationalId: String,
  nationalIdImage: String,
  driverLicenseImage: String,
  verified: { type: Boolean, default: false },
  verifyNote: String,
  risky: { type: Boolean, default: false }
});

module.exports = mongoose.model("User", userSchema);
