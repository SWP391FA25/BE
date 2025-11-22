const mongoose = require('mongoose');
require('dotenv').config();

const checkCollections = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vehicle_rental');
        console.log('✅ Connected to MongoDB');

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📋 Collections in database:');
        collections.forEach(col => console.log(`  - ${col.name}`));

        // Count documents in each collection
        for (const col of collections) {
            const count = await mongoose.connection.db.collection(col.name).countDocuments();
            console.log(`\n📊 ${col.name}: ${count} documents`);
            
            if (count > 0 && count < 10) {
                const sample = await mongoose.connection.db.collection(col.name).findOne();
                console.log('Sample:', JSON.stringify(sample, null, 2).substring(0, 200));
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

checkCollections();
