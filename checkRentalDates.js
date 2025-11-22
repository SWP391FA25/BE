const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ev_rental';

const checkRentalDates = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const Rental = mongoose.model('Rental', require('./src/models/Rental').schema);

        // Lấy tất cả rental đang ongoing hoặc reserved
        const rentals = await Rental.find({
            status: { $in: ['reserved', 'ongoing'] }
        }).populate('vehicle', 'licensePlate plateNumber');

        console.log(`\n📋 Found ${rentals.length} active rentals:\n`);

        rentals.forEach(rental => {
            const vehiclePlate = rental.vehicle?.licensePlate || rental.vehicle?.plateNumber || 'N/A';
            console.log(`🚗 Vehicle: ${vehiclePlate}`);
            console.log(`   Status: ${rental.status}`);
            console.log(`   Pickup Date: ${rental.scheduledPickupDate || 'N/A'}`);
            console.log(`   Pickup Time: ${rental.scheduledPickupTime || 'N/A'}`);
            console.log(`   Return Date: ${rental.scheduledReturnDate || 'N/A'}`);
            console.log(`   Return Time: ${rental.scheduledReturnTime || 'N/A'}`);
            console.log('');
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

checkRentalDates();
