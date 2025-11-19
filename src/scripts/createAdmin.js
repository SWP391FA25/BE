/**
 * Script để tạo tài khoản Admin
 * Chạy: node src/scripts/createAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const createAdminUser = async () => {
  try {
    // Kết nối MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Đã kết nối MongoDB');

    // Thông tin admin
    const adminEmail = 'admin@ev-rental.com';
    const adminPassword = 'admin123456'; // Đổi password này sau khi đăng nhập lần đầu
    const adminFullName = 'System Administrator';

    // Kiểm tra xem admin đã tồn tại chưa
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('⚠️ Tài khoản admin đã tồn tại!');
      console.log('📧 Email:', adminEmail);
      console.log('🔑 Password: (đã được set trước đó)');
      
      // Hỏi có muốn reset password không
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      readline.question('Bạn có muốn reset password? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          existingAdmin.passwordHash = hashedPassword;
          await existingAdmin.save();
          console.log('✅ Đã reset password thành công!');
          console.log('🔑 Password mới:', adminPassword);
        }
        readline.close();
        mongoose.connection.close();
      });
      return;
    }

    // Tạo password hash
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Tạo admin user
    const adminUser = new User({
      email: adminEmail,
      passwordHash: hashedPassword,
      fullName: adminFullName,
      role: 'admin',
      phone: '0123456789',
      isVerified: true,
      verifyNote: 'System Admin Account',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await adminUser.save();

    console.log('✅ Tạo tài khoản admin thành công!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('👤 Full Name:', adminFullName);
    console.log('🎭 Role: admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️ LƯU Ý: Hãy đổi password sau khi đăng nhập lần đầu!');

    // Đóng kết nối
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    mongoose.connection.close();
    process.exit(1);
  }
};

// Chạy script
createAdminUser();

