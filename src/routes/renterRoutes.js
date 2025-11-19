const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/renterController");

const router = express.Router();

router.use(protect, authorize("renter"));

router.get("/stations/nearby", ctrl.findNearbyStations);
router.get("/vehicles/available", ctrl.listAvailableVehicles);
router.post("/reservations", ctrl.createReservation);
router.get("/me/rentals", ctrl.myRentals);
router.get("/me/analytics", ctrl.myAnalytics);

// DEBUG endpoint (temporary)
router.get("/debug/all-rentals", ctrl.debugAllRentals);

module.exports = router;


