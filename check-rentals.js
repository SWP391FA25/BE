// Quick script to check rentals in database
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ev_rental';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Get Rental model
    const Rental = mongoose.model('Rental', require('./src/models/Rental').schema);
    
    // Get all rentals
    const rentals = await Rental.find().populate('renter', 'fullName email').populate('vehicle', 'model').sort({ createdAt: -1 });
    
    console.log('📊 Total rentals in database:', rentals.length);
    
    if (rentals.length > 0) {
      console.log('\n📋 Recent rentals:');
      rentals.slice(0, 5).forEach((rental, index) => {
        console.log(`\n${index + 1}. Rental ID: ${rental._id}`);
        console.log(`   Renter: ${rental.renter?.fullName || 'N/A'} (${rental.renter?.email || 'N/A'})`);
        console.log(`   Renter ID: ${rental.renter?._id}`);
        console.log(`   Vehicle: ${rental.vehicle?.model || 'N/A'}`);
        console.log(`   Status: ${rental.status}`);
        console.log(`   Payment Status: ${rental.paymentStatus}`);
        console.log(`   Order Code: ${rental.orderCode}`);
        console.log(`   Created: ${rental.createdAt}`);
      });
      
      // Group by renter
      const byRenter = {};
      rentals.forEach(r => {
        const renterId = r.renter?._id?.toString() || 'unknown';
        byRenter[renterId] = (byRenter[renterId] || 0) + 1;
      });
      
      console.log('\n📊 Rentals by user:');
      Object.entries(byRenter).forEach(([renterId, count]) => {
        const rental = rentals.find(r => r.renter?._id?.toString() === renterId);
        console.log(`   ${rental?.renter?.email || renterId}: ${count} rental(s)`);
      });
    } else {
      console.log('\n⚠️ No rentals found in database!');
      console.log('This means:');
      console.log('1. No one has completed payment yet, OR');
      console.log('2. Payment webhook hasn\'t updated the database');
    }
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });

