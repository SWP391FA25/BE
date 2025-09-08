const express = require("express");
const multer = require("multer");
const {
  getPendingUsers,
  verifyUser,
  listStationVehicles,
  updateVehicleByStaff,
  checkoutRental,
  checkinRental,
} = require("../controllers/staffController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Upload ảnh bàn giao/nhận
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Authz
router.use(protect, authorize("staff", "admin"));

// Xác minh khách
router.get("/pending-users", getPendingUsers);
router.post("/verify", verifyUser);

// Xe theo trạm & cập nhật
router.get("/vehicles", listStationVehicles);
router.put("/vehicles/:id", updateVehicleByStaff);

// Checkout/Checkin
router.post("/rental/checkout", upload.fields([{ name: "photos", maxCount: 10 }]), checkoutRental);
router.post("/rental/checkin", upload.fields([{ name: "photos", maxCount: 10 }]), checkinRental);

module.exports = router;
