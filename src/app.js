const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads"))); // public upload folder
app.use("/assets", express.static(path.join(__dirname, "../../FE/src/assets"))); // serve FE assets

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const renterRoutes = require('./routes/renterRoutes');
const staffRoutes = require('./routes/staffRoutes');
const aiRoutes = require('./routes/aiRoutes');
const publicCatalogRoutes = require('./routes/publicCatalogRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const contractRoutes = require('./routes/contractRoutes');
const rentalRoutes = require('./routes/rentalRoutes');

// Routes
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/renter', renterRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/public', publicCatalogRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/rentals', rentalRoutes);

// mount at /api/chatboxai to match OpenAPI snippet
app.use('/api/chatboxai', aiRoutes);

module.exports = app;
