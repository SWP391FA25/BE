/*
  Node script to import vehicles from FE/db.json into CatalogVehicle collection.
  Usage: node src/scripts/importCatalogVehicles.js path/to/FE/db.json
*/
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const CatalogVehicle = require('../models/CatalogVehicle');

dotenv.config();

async function main() {
  const argPath = process.argv[2];
  if (!argPath) {
    console.error('Please provide path to FE/db.json');
    process.exit(1);
  }
  const filePath = path.resolve(argPath);
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
  }

  await connectDB();
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);
    const items = Array.isArray(json.vehicles) ? json.vehicles : [];
    if (!items.length) {
      console.log('No vehicles found in db.json');
      process.exit(0);
    }

    const docs = items.map((v) => ({
      name: v.name,
      brand: v.brand,
      model: v.model,
      type: v.type,
      year: v.year,
      color: v.color,
      licensePlate: v.licensePlate,
      pricePerDay: v.pricePerDay,
      pricePerMonth: v.pricePerMonth,
      pricePerHour: v.pricePerHour,
      status: v.status,
      description: v.description,
      features: v.features,
      fuelType: v.fuelType,
      seatingCapacity: v.seatingCapacity,
      transmission: v.transmission,
      range: v.range,
      seats: v.seats,
      trunk: v.trunk,
      horsepower: v.horsepower,
      airbags: v.airbags,
      dailyDistanceLimitKm: v.dailyDistanceLimitKm,
      rentalConditions: v.rentalConditions,
      image: v.image,
      comingSoonImage: v.comingSoonImage,
      imageGallery: Array.isArray(v.imageGallery) ? v.imageGallery : [],
      isOutOfStock: v.isOutOfStock,
      hasFreeCharging: v.hasFreeCharging,
      createdAtSeed: v.createdAt ? new Date(v.createdAt) : undefined,
    }));

    await CatalogVehicle.deleteMany({});
    const inserted = await CatalogVehicle.insertMany(docs);
    console.log(`Imported ${inserted.length} vehicles.`);
  } catch (err) {
    console.error('Import failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

main();


