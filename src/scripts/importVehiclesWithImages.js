const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Read db.json from FE folder
const dbJsonPath = path.join(__dirname, '../../../FE/db.json');
const dbData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));

async function importVehicles() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing vehicles (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing vehicles...');
    await Vehicle.deleteMany({});
    console.log('✅ Cleared\n');

    console.log('📦 Importing vehicles from db.json...\n');

    let imported = 0;
    let skipped = 0;

    for (const vehicleData of dbData.vehicles) {
      try {
        // Debug: Check if imageGallery exists
        const galleryCount = Array.isArray(vehicleData.imageGallery) ? vehicleData.imageGallery.length : 0;
        
        // Create vehicle with all data including images
        const vehicle = new Vehicle({
          name: vehicleData.name,
          brand: vehicleData.brand,
          model: vehicleData.model,
          type: vehicleData.type,
          year: vehicleData.year,
          color: vehicleData.color,
          licensePlate: vehicleData.licensePlate,
          
          // Prices
          pricePerDay: vehicleData.pricePerDay,
          pricePerMonth: vehicleData.pricePerMonth,
          pricePerHour: vehicleData.pricePerHour,
          
          // Status
          status: vehicleData.status,
          isOutOfStock: vehicleData.isOutOfStock || false,
          
          // Description & features
          description: vehicleData.description,
          features: vehicleData.features || [],
          
          // Technical specs
          fuelType: vehicleData.fuelType || 'Electric',
          seatingCapacity: vehicleData.seatingCapacity,
          transmission: vehicleData.transmission || 'Automatic',
          range: vehicleData.range,
          seats: vehicleData.seats,
          trunk: vehicleData.trunk,
          horsepower: vehicleData.horsepower,
          airbags: vehicleData.airbags,
          drive: vehicleData.drive,
          
          // Rental conditions
          dailyDistanceLimitKm: vehicleData.dailyDistanceLimitKm || 300,
          rentalConditions: vehicleData.rentalConditions,
          
          // Special features
          hasFreeCharging: vehicleData.hasFreeCharging || false,
          
          // Images - IMPORTANT!
          image: vehicleData.image,
          comingSoonImage: vehicleData.comingSoonImage,
          imageGallery: vehicleData.imageGallery || [],
          
          // Battery info
          batteryCapacityKWh: vehicleData.batteryCapacityKWh,
          stateOfChargePct: vehicleData.stateOfChargePct || 100,
          
          // Other info
          notes: vehicleData.notes || [],
          odometerKm: vehicleData.odometerKm || 0,
        });

        await vehicle.save();
        console.log(`✅ Imported: ${vehicle.name} (${galleryCount} images)`);
        imported++;
      } catch (error) {
        console.log(`⚠️  Skipped ${vehicleData.name}: ${error.message}`);
        skipped++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Imported: ${imported} vehicles`);
    console.log(`   ⚠️  Skipped: ${skipped} vehicles`);
    console.log('\n✨ Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

importVehicles();

