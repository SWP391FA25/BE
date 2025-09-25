const Station = require("../models/Station");
const Vehicle = require("../models/Vehicle");
const Rental = require("../models/Rental");

// Tìm trạm gần theo toạ độ (lng, lat) và bán kính km
const findNearbyStations = async (req, res) => {
  try {
    const { lng, lat, radiusKm = 5 } = req.query;
    if (lng === undefined || lat === undefined) {
      return res.status(400).json({ message: "Thiếu tham số lng/lat" });
    }
    const stations = await Station.find({
      active: true,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseFloat(radiusKm) * 1000,
        },
      },
    });
    res.json(stations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Xem xe sẵn sàng theo station
const listAvailableVehicles = async (req, res) => {
  try {
    const { stationId } = req.query;
    const filter = { status: "available" };
    if (stationId) filter.station = stationId;
    const vehicles = await Vehicle.find(filter).populate("station");
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Đặt trước xe
const createReservation = async (req, res) => {
  try {
    // Chặn thuê nếu chưa được xác minh hồ sơ
    if (!req.user?.isVerified) {
      return res.status(403).json({
        message: "Tài khoản chưa được xác minh. Vui lòng cập nhật số điện thoại, CCCD và Bằng lái để được duyệt trước khi thuê xe."
      });
    }

    const { vehicleId, pickupStationId, pricePerHour, depositAmount } = req.body;
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: "Không tìm thấy xe" });
    if (vehicle.status !== "available") return res.status(400).json({ message: "Xe không sẵn sàng" });

    const rental = await Rental.create({
      renter: req.user._id,
      vehicle: vehicleId,
      pickupStation: pickupStationId,
      reservationTime: new Date(),
      status: "reserved",
      pricePerHour,
      depositAmount: depositAmount || 0,
    });

    vehicle.status = "reserved";
    await vehicle.save();

    res.json(rental);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lịch sử thuê của cá nhân
const myRentals = async (req, res) => {
  try {
    const rentals = await Rental.find({ renter: req.user._id })
      .populate("vehicle")
      .populate("pickupStation")
      .populate("dropoffStation")
      .sort({ createdAt: -1 });
    res.json(rentals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Phân tích nhanh cho cá nhân
const myAnalytics = async (req, res) => {
  try {
    const renterId = req.user._id;
    const totals = await Rental.aggregate([
      { $match: { renter: renterId } },
      {
        $group: {
          _id: "$renter",
          trips: { $sum: 1 },
          totalSpent: { $sum: "$totalAmount" },
          totalDistanceKm: { $sum: "$distanceKm" },
        },
      },
    ]);

    const byHour = await Rental.aggregate([
      { $match: { renter: renterId, checkoutTime: { $ne: null } } },
      { $project: { hour: { $hour: "$checkoutTime" } } },
      { $group: { _id: "$hour", count: { $sum: 1 } } },
      { $project: { hour: "$_id", count: 1, _id: 0 } },
      { $sort: { hour: 1 } },
    ]);

    res.json({ summary: totals[0] || { trips: 0, totalSpent: 0, totalDistanceKm: 0 }, peakHours: byHour });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  findNearbyStations,
  listAvailableVehicles,
  createReservation,
  myRentals,
  myAnalytics,
};
