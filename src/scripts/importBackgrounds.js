const mongoose = require('mongoose');
const Background = require('../models/Background');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Read db.json from FE folder
const dbJsonPath = path.join(__dirname, '../../../FE/db.json');
const dbData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));

async function importBackgrounds() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing backgrounds (optional)
    console.log('🗑️  Clearing existing backgrounds...');
    await Background.deleteMany({});
    console.log('✅ Cleared\n');

    console.log('🎨 Importing backgrounds from db.json...\n');

    let imported = 0;
    let skipped = 0;

    for (const bgData of dbData.backgrounds) {
      try {
        const background = new Background({
          name: bgData.name,
          image: bgData.image,
          description: bgData.description || '',
          isActive: true,
          order: parseInt(bgData.id) || 0,
        });

        await background.save();
        console.log(`✅ Imported: ${background.name} - ${background.image}`);
        imported++;
      } catch (error) {
        console.log(`⚠️  Skipped ${bgData.name}: ${error.message}`);
        skipped++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Imported: ${imported} backgrounds`);
    console.log(`   ⚠️  Skipped: ${skipped} backgrounds`);
    console.log('\n✨ Done!');

  } catch (error) {
    console.error('❌ Error importing backgrounds:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the import
importBackgrounds();

