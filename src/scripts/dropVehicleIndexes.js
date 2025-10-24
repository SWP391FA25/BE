/*
  Script to drop old indexes from Vehicle collection
  Usage: node src/scripts/dropVehicleIndexes.js
*/
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');

dotenv.config();

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await connectDB();
  
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('vehicles');
    
    console.log('📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`   - ${idx.name}:`, JSON.stringify(idx.key));
    });
    
    // Drop old plateNumber index if exists
    try {
      console.log('\n🗑️  Dropping old plateNumber_1 index...');
      await collection.dropIndex('plateNumber_1');
      console.log('   ✅ Dropped plateNumber_1');
    } catch (err) {
      if (err.code === 27) {
        console.log('   ⚠️  plateNumber_1 index not found (already removed)');
      } else {
        throw err;
      }
    }
    
    // Drop old vin index if exists
    try {
      console.log('\n🗑️  Dropping old vin_1 index...');
      await collection.dropIndex('vin_1');
      console.log('   ✅ Dropped vin_1');
    } catch (err) {
      if (err.code === 27) {
        console.log('   ⚠️  vin_1 index not found (already removed)');
      } else {
        throw err;
      }
    }
    
    console.log('\n📋 Final indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(idx => {
      console.log(`   - ${idx.name}:`, JSON.stringify(idx.key));
    });
    
    console.log('\n✅ Done! You can now run the import script.');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exitCode = 1;
  } finally {
    console.log('🔌 Closing MongoDB connection...');
    await mongoose.connection.close();
  }
}

main();

