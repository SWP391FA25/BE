const express = require("express");
const multer = require("multer");
const { register, login } = require("../controllers/authController");

const router = express.Router();

// Multer config (upload CCCD)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Routes
router.post(
  "/register",
  upload.fields([
    { name: "cccdImage", maxCount: 1 },
    { name: "driverLicenseImage", maxCount: 1 },
  ]),
  register
);
router.post("/login", login);

module.exports = router;
