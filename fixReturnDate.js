const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ev_rental';

const fixReturnDate = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const Rental = mongoose.model('Rental', require('./src/models/Rental').schema);

        // Tìm tất cả rental không có scheduledReturnDate
        const rentals = await Rental.find({
            $or: [
                { scheduledReturnDate: { $exists: false } },
                { scheduledReturnDate: null }
            ]
        });

        console.log(`🔍 Found ${rentals.length} rentals without scheduledReturnDate`);

        for (const rental of rentals) {
            // Set scheduledReturnDate = scheduledPickupDate + 1 day (mặc định)
            if (rental.scheduledPickupDate) {
                const returnDate = new Date(rental.scheduledPickupDate);
                returnDate.setDate(returnDate.getDate() + 1); // Thêm 1 ngày
                
                rental.scheduledReturnDate = returnDate;
                rental.scheduledReturnTime = rental.scheduledPickupTime || '18:00'; // Mặc định 18:00
                await rental.save();
                
                console.log(`✅ Updated rental ${rental._id}: returnDate = ${returnDate.toISOString().split('T')[0]}`);
            } else {
                console.log(`⚠️ Rental ${rental._id} has no scheduledPickupDate, skipping...`);
            }
        }

        console.log('✅ Fix completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

fixReturnDate();
