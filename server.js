const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const staffRoutes = require("./src/routes/staffRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const renterRoutes = require("./src/routes/renterRoutes");
const swaggerUi = require("swagger-ui-express");
const swaggerDoc = require("./src/docs/swagger.json");

dotenv.config();
connectDB();

const app = require("./src/app");

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/renter", renterRoutes);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
