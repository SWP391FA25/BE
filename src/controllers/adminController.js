const User = require("../models/User");
const Station = require("../models/Station");
const Vehicle = require("../models/Vehicle");
const Rental = require("../models/Rental");

// Helpers
const parseDateRange = (start, end) => {
  const startDate = start ? new Date(start) : new Date(0);
  const endDate = end ? new Date(end) : new Date();
  return { startDate, endDate };
};

// Stations CRUD
const createStation = async (req, res) => {
  try {
    const { name, address, longitude, latitude, phone, active } = req.body;
    const station = await Station.create({
      name,
      address,
      phone,
      active: active !== undefined ? active : true,
      location: { type: "Point", coordinates: [longitude, latitude] },
    });
    res.json(station);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const listStations = async (req, res) => {
  try {
    const stations = await Station.find();
    res.json(stations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateStation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, longitude, latitude, phone, active } = req.body;
    const payload = { name, address, phone, active };
    if (longitude !== undefined && latitude !== undefined) {
      payload.location = { type: "Point", coordinates: [longitude, latitude] };
    }
    const station = await Station.findByIdAndUpdate(id, payload, { new: true });
    if (!station) return res.status(404).json({ message: "Station không tồn tại" });
    res.json(station);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteStation = async (req, res) => {
  try {
    const { id } = req.params;
    const usedByVehicle = await Vehicle.exists({ station: id });
    if (usedByVehicle) return res.status(400).json({ message: "Station đang gắn với vehicle" });
    await Station.findByIdAndDelete(id);
    res.json({ message: "Đã xóa station" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Vehicles CRUD
const createVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.create(req.body);
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const listVehicles = async (req, res) => {
  try {
    const { station } = req.query;
    const filter = station ? { station } : {};
    const vehicles = await Vehicle.find(filter).populate("station");
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findByIdAndUpdate(id, req.body, { new: true });
    if (!vehicle) return res.status(404).json({ message: "Vehicle không tồn tại" });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const activeRental = await Rental.exists({ vehicle: id, status: { $in: ["reserved", "checked_out"] } });
    if (activeRental) return res.status(400).json({ message: "Vehicle đang được đặt/thuê" });
    await Vehicle.findByIdAndDelete(id);
    res.json({ message: "Đã xóa vehicle" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Staff management
const listStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: "staff" });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createStaff = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword, role: "staff", verified: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = { name: req.body.name, verified: req.body.verified };
    const user = await User.findOneAndUpdate({ _id: id, role: "staff" }, payload, { new: true });
    if (!user) return res.status(404).json({ message: "Staff không tồn tại" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    await User.deleteOne({ _id: id, role: "staff" });
    res.json({ message: "Đã xóa staff" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Customer management
const listCustomers = async (req, res) => {
  try {
    const users = await User.find({ role: "renter" });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const markRiskyCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { risky } = req.body;
    const user = await User.findOneAndUpdate({ _id: id, role: "renter" }, { risky: !!risky }, { new: true });
    if (!user) return res.status(404).json({ message: "Customer không tồn tại" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Reports
const reportRevenueByStation = async (req, res) => {
  try {
    const { start, end } = req.query;
    const { startDate, endDate } = parseDateRange(start, end);

    const data = await Rental.aggregate([
      { $match: { checkinTime: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: "$dropoffStation",
          revenue: { $sum: "$totalAmount" },
          rentals: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "stations",
          localField: "_id",
          foreignField: "_id",
          as: "station",
        },
      },
      { $unwind: { path: "$station", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          stationId: "$_id",
          stationName: "$station.name",
          revenue: 1,
          rentals: 1,
          _id: 0,
        },
      },
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const reportUtilization = async (req, res) => {
  try {
    const { start, end, station } = req.query;
    const { startDate, endDate } = parseDateRange(start, end);

    // Tính tổng số giờ có thể sử dụng
    const totalHours = (endDate.getTime() - startDate.getTime()) / 3600000;

    const vehicleFilter = station ? { station } : {};
    const numVehicles = await Vehicle.countDocuments(vehicleFilter);
    if (numVehicles === 0) return res.json({ utilizationPct: 0, rentalHours: 0, numVehicles: 0 });

    // Tính tổng giờ đã cho thuê (chồng lấp khoảng thời gian)
    const rentals = await Rental.find({
      $or: [
        { checkoutTime: { $lte: endDate }, checkinTime: { $gte: startDate } },
        { status: { $in: ["reserved", "checked_out"] } },
      ],
      ...(station ? { pickupStation: station } : {}),
    }).select("checkoutTime checkinTime status");

    let rentalHours = 0;
    for (const r of rentals) {
      const from = r.checkoutTime ? new Date(r.checkoutTime) : startDate;
      const to = r.checkinTime ? new Date(r.checkinTime) : endDate;
      const overlapStart = from > startDate ? from : startDate;
      const overlapEnd = to < endDate ? to : endDate;
      const hours = Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / 3600000);
      rentalHours += hours;
    }

    const capacityHours = totalHours * numVehicles;
    const utilizationPct = capacityHours > 0 ? Math.round((rentalHours / capacityHours) * 10000) / 100 : 0;

    res.json({ utilizationPct, rentalHours, capacityHours, numVehicles, totalHours });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const reportPeakHours = async (req, res) => {
  try {
    const { start, end } = req.query;
    const { startDate, endDate } = parseDateRange(start, end);

    const data = await Rental.aggregate([
      { $match: { checkoutTime: { $gte: startDate, $lte: endDate } } },
      { $project: { hour: { $hour: "$checkoutTime" } } },
      { $group: { _id: "$hour", count: { $sum: 1 } } },
      { $project: { hour: "$_id", count: 1, _id: 0 } },
      { $sort: { hour: 1 } },
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  // stations
  createStation,
  listStations,
  updateStation,
  deleteStation,
  // vehicles
  createVehicle,
  listVehicles,
  updateVehicle,
  deleteVehicle,
  // staff
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  // customers
  listCustomers,
  markRiskyCustomer,
  // reports
  reportRevenueByStation,
  reportUtilization,
  reportPeakHours,
};


