const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/authRoutes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
// auth routes

app.use("/api/auth", authRoutes);


app.get("/", (req, res) => {
  res.send("EV Rental System API running...");
});

module.exports = app;
