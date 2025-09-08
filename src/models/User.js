const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["renter", "staff", "admin"], default: "renter" },
  licenseNumber: String,
  nationalId: String,
  nationalIdImage: String,
  verified: { type: Boolean, default: false },
  verifyNote: String
});

module.exports = mongoose.model("User", userSchema);
