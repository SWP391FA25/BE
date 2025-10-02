const express = require("express");
const multer = require("multer");
const { register, login, updateProfile, updateAvatar, getMe, changePassword } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Routes
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);

// Upload ảnh hồ sơ (CCCD/Bằng lái)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Cập nhật hồ sơ cá nhân
router.put(
  "/me/profile",
  protect,
  upload.fields([
    { name: "avatarImage", maxCount: 1 },
    { name: "cccdImage", maxCount: 1 },
    { name: "driverLicenseImage", maxCount: 1 },
  ]),
  updateProfile
);

// Cập nhật avatar
const uploadAvatar = multer({ storage });
router.put(
  "/me/avatar",
  protect,
  uploadAvatar.single('avatar'),
  updateAvatar
);

// Đổi mật khẩu
router.post("/me/change-password", protect, express.json(), changePassword);

module.exports = router;
