const express = require("express");
const ctrl = require("../controllers/publicCatalogController");

const router = express.Router();

// Public endpoints (no auth) for FE catalog
router.get("/vehicles", ctrl.listCatalogVehicles);
router.get("/vehicles/:id", ctrl.getCatalogVehicleById);
router.get("/vehicle/by/:identifier", ctrl.getByIdentifier);
router.get("/backgrounds", ctrl.getBackgrounds);

// Stations
router.get("/stations", ctrl.listStations);
router.get("/stations/:stationId/vehicles", ctrl.getVehiclesByStation);

module.exports = router;


