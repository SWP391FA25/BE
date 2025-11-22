const express = require('express');
const router = express.Router();
const { getRentalById } = require('../controllers/rentalController');
const { protect } = require('../middleware/authMiddleware');

// Get rental by ID (for staff/renter to view details)
router.get('/:id', protect, getRentalById);

module.exports = router;
