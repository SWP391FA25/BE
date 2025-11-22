const mongoose = require('mongoose');
require('dotenv').config();

// Dùng cùng MONGODB_URI logic như check-rentals.js
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ev_rental';

const clearRentals = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Lấy model từ schema Mongoose có sẵn
        const Rental = mongoose.model('Rental', require('./src/models/Rental').schema);
        const Vehicle = mongoose.model('Vehicle', require('./src/models/Vehicle').schema);

        const rentalResult = await Rental.deleteMany({});
        console.log(`🗑️ Deleted ${rentalResult.deletedCount} rentals`);

        // Xóa contracts trực tiếp qua collection (model cũ dùng Sequelize nên không require vào đây)
        const contractResult = await mongoose.connection.db.collection('contracts').deleteMany({});
        console.log(`🗑️ Deleted ${contractResult.deletedCount} contracts`);

        const vehicleResult = await Vehicle.updateMany(
            { status: { $in: ['reserved', 'rented', 'ongoing'] } },
            { $set: { status: 'available' } }
        );
        console.log(`🔄 Reset ${vehicleResult.modifiedCount} vehicles to available`);

        console.log('✅ Database cleaned successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

clearRentals();
