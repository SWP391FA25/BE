const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// 📌 Đăng ký tối giản (chỉ name/email/password). Giấy tờ có thể bổ sung sau.
const register = async (req, res) => {
  try {
    const { fullName, email, password, licenseNumber, nationalId, phone, dob, address } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Validate bắt buộc
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Thiếu fullName/email/password" });
    }

    const newUser = new User({
      fullName,
      email,
      passwordHash: hashedPassword,
      phone,
      dob,
      address,
      // Tùy chọn, có thể bổ sung sau đăng ký
      licenseNumber: licenseNumber || undefined,
      nationalId: nationalId || undefined,
      nationalIdImage: undefined,
      driverLicenseImage: undefined,
      isVerified: false,
      verifyNote: ""
    });

    await newUser.save();
    res.json({ message: "Đăng ký thành công! Hãy bổ sung CCCD/Bằng lái và số điện thoại để được xác minh trước khi thuê xe.", userId: newUser._id });
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

// 📌 Cập nhật hồ sơ cá nhân (user tự bổ sung giấy tờ/phone)
const updateProfile = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const {
      fullName,
      phone,
      dob,
      address,
      licenseNumber,
      nationalId,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    if (fullName !== undefined) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    if (dob !== undefined) user.dob = dob ? new Date(dob) : undefined;
    if (address !== undefined) user.address = address;
    if (licenseNumber !== undefined) user.licenseNumber = licenseNumber;
    if (nationalId !== undefined) user.nationalId = nationalId;

    // Ảnh giấy tờ nếu upload
    const hasCCCD = req.files && req.files.cccdImage && req.files.cccdImage.length > 0;
    const hasDL = req.files && req.files.driverLicenseImage && req.files.driverLicenseImage.length > 0;
    if (hasCCCD) user.nationalIdImage = req.files.cccdImage[0].path;
    if (hasDL) user.driverLicenseImage = req.files.driverLicenseImage[0].path;

    await user.save();

    res.json({
      message: "Cập nhật hồ sơ thành công",
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        dob: user.dob,
        address: user.address,
        licenseNumber: user.licenseNumber,
        nationalId: user.nationalId,
        nationalIdImage: user.nationalIdImage,
        driverLicenseImage: user.driverLicenseImage,
        isVerified: user.isVerified,
        verifyNote: user.verifyNote,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { register, login, updateProfile };
