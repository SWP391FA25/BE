const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads"))); // public upload folder

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const renterRoutes = require('./routes/renterRoutes');
const staffRoutes = require('./routes/staffRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Routes
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/renter', renterRoutes);
app.use('/api/staff', staffRoutes);

// mount at /api/chatboxai to match OpenAPI snippet
app.use('/api/chatboxai', aiRoutes);

module.exports = app;
