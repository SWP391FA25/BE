const mongoose = require("mongoose");

const stationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    phone: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

stationSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Station", stationSchema);


