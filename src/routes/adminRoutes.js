const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/adminController");

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

// Staff
router.get("/staff", ctrl.listStaff);
router.post("/staff", ctrl.createStaff);
router.put("/staff/:id", ctrl.updateStaff);
router.delete("/staff/:id", ctrl.deleteStaff);

// Customers
router.get("/customers", ctrl.listCustomers);
router.patch("/customers/:id/risky", ctrl.markRiskyCustomer);

// Reports
router.get("/reports/revenue-by-station", ctrl.reportRevenueByStation);
router.get("/reports/utilization", ctrl.reportUtilization);
router.get("/reports/peak-hours", ctrl.reportPeakHours);

module.exports = router;


