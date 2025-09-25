const express = require("express");
const multer = require("multer");
const { register, login, updateProfile } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Routes
router.post("/register", register);
router.post("/login", login);

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
    { name: "cccdImage", maxCount: 1 },
    { name: "driverLicenseImage", maxCount: 1 },
  ]),
  updateProfile
);

module.exports = router;
