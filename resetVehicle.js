const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ev_rental';

const resetVehicle = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const Vehicle = mongoose.model('Vehicle', require('./src/models/Vehicle').schema);

        // Reset xe 30A-12345 về available
        const result = await Vehicle.updateOne(
            { plateNumber: '30A-12345' },
            { $set: { status: 'available' } }
        );

        console.log(`🔄 Reset vehicle 30A-12345:`, result);
        
        if (result.matchedCount === 0) {
            console.log('⚠️ Vehicle 30A-12345 not found. Try with licensePlate field:');
            const result2 = await Vehicle.updateOne(
                { licensePlate: '30A-12345' },
                { $set: { status: 'available' } }
            );
            console.log(`🔄 Reset result:`, result2);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

resetVehicle();
