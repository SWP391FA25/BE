const mongoose = require("mongoose");

// CatalogVehicle is a simplified read-only catalog for FE browsing
// It intentionally mirrors fields from FE/db.json so we can migrate data easily
const catalogVehicleSchema = new mongoose.Schema(
  {
    // identity
    name: { type: String, required: true },
    brand: String,
    model: { type: String, index: true },
    type: String,
    year: Number,
    color: String,
    licensePlate: String,

    // pricing & status
    pricePerDay: Number,
    pricePerMonth: Number,
    pricePerHour: Number,
    status: String, // e.g., available | out_of_stock | rented (display only)

    // description & specs
    description: String,
    features: [String],
    fuelType: String,
    seatingCapacity: Number,
    transmission: String,
    range: String,
    seats: String,
    trunk: String,
    horsepower: Number,
    airbags: Number,
    dailyDistanceLimitKm: Number,

    // rental conditions
    rentalConditions: {
      requiredDocuments: [String],
      payment: {
        method: String,
        terms: String,
      },
      depositVND: Number,
    },

    // images: keep FE image paths as-is
    image: String,
    comingSoonImage: String,
    imageGallery: [String],

    // flags
    isOutOfStock: Boolean,
    hasFreeCharging: Boolean,

    // timestamps from seed
    createdAtSeed: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("CatalogVehicle", catalogVehicleSchema);


