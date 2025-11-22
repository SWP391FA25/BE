const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ev_rental';

const fixOldRentals = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const Rental = mongoose.model('Rental', require('./src/models/Rental').schema);
        const Vehicle = mongoose.model('Vehicle', require('./src/models/Vehicle').schema);

        // Tìm tất cả xe đang rented nhưng rental vẫn reserved
        const rentedVehicles = await Vehicle.find({ status: 'rented' });
        
        console.log(`🔍 Found ${rentedVehicles.length} vehicles with status 'rented'`);

        for (const vehicle of rentedVehicles) {
            const rental = await Rental.findOne({
                vehicle: vehicle._id,
                status: 'reserved'
            });

            if (rental) {
                rental.status = 'ongoing';
                await rental.save();
                console.log(`✅ Updated rental ${rental._id} to 'ongoing' for vehicle ${vehicle.licensePlate || vehicle.plateNumber}`);
            }
        }

        console.log('✅ Fix completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

fixOldRentals();
