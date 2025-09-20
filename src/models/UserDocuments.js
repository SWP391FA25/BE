const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  type: { type: String, enum: ["driver_license", "national_id"], required: true },
  filePath: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  verified: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  verifiedAt: { type: Date }
});

module.exports = mongoose.model("UserDocument", userSchema);