const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/adminController");
const { upload, uploadVehicleImages, deleteVehicleImage } = require("../controllers/vehicleImageController");

const router = express.Router();

// Bảo vệ: chỉ admin
router.use(protect, authorize("admin"));

// Stations
router.post("/stations", ctrl.createStation);
router.get("/stations", ctrl.listStations);
router.put("/stations/:id", ctrl.updateStation);
router.delete("/stations/:id", ctrl.deleteStation);

// Vehicles
router.post("/vehicles", ctrl.createVehicle);
router.get("/vehicles", ctrl.listVehicles);
router.put("/vehicles/:id", ctrl.updateVehicle);
router.delete("/vehicles/:id", ctrl.deleteVehicle);

// Vehicle Images - Max 20 images per upload
router.post("/vehicles/:id/images", upload.array("images", 20), uploadVehicleImages);
router.delete("/vehicles/:id/images", deleteVehicleImage);

// Staff
router.get("/staff", ctrl.listStaff);
router.post("/staff", ctrl.createStaff);
router.put("/staff/:id", ctrl.updateStaff);
router.delete("/staff/:id", ctrl.deleteStaff);
router.post("/staff/:id/reset-password", ctrl.resetStaffPassword);

// Customers
router.get("/customers", ctrl.listCustomers);
router.get("/customers/:id/rentals", ctrl.getCustomerRentals);
router.patch("/customers/:id/risky", ctrl.markRiskyCustomer);
router.patch("/customers/:id/verify", ctrl.verifyCustomer);

// Reports
router.get("/reports/revenue-by-station", ctrl.reportRevenueByStation);
router.get("/reports/utilization", ctrl.reportUtilization);
router.get("/reports/peak-hours", ctrl.reportPeakHours);

// Vehicle Types
router.get("/vehicle-types", ctrl.getVehicleTypes);

// Recent Activities
router.get("/activities", ctrl.getRecentActivities);

// Active Rentals
router.get("/active-rentals", ctrl.getActiveRentals);

module.exports = router;
