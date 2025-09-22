const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// 📌 Đăng ký (upload CCCD + Bằng lái)
const register = async (req, res) => {
  try {
    const { fullName, email, password, licenseNumber, nationalId, phone, dob, address, roleId } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Validate bắt buộc
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Thiếu fullName/email/password" });
    }
    if (!licenseNumber || !nationalId) {
      return res.status(400).json({ message: "Thiếu licenseNumber/nationalId" });
    }
    const hasCCCD = req.files && req.files.cccdImage && req.files.cccdImage.length > 0;
    const hasDL = req.files && req.files.driverLicenseImage && req.files.driverLicenseImage.length > 0;
    if (!hasCCCD || !hasDL) {
      return res.status(400).json({ message: "Bắt buộc upload cả cccdImage và driverLicenseImage" });
    }

    const newUser = new User({
      fullName,
      email,
      passwordHash: hashedPassword,
      roleId: roleId || null, // Nếu có truyền roleId thì dùng, không thì null
      phone,
      dob,
      address,
      licenseNumber,
      nationalId,
      nationalIdImage: req.files.cccdImage[0].path,
      driverLicenseImage: req.files.driverLicenseImage[0].path,
      isVerified: false,
      verifyNote: ""
    });

    await newUser.save();
    res.json({ message: "Đăng ký thành công, vui lòng chờ xác thực!", userId: newUser._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📌 Đăng nhập
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: user._id, roleId: user.roleId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, roleId: user.roleId, isVerified: user.isVerified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//đăng ký

module.exports = { register, login };
