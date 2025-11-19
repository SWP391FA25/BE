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

    const { 
      vehicleId, 
      pickupStationId, 
      returnStationId,
      rentalMode,
      pricePerHour,
      pricePerDay, 
      depositAmount,
      totalAmount,
      scheduledPickupDate,
      scheduledReturnDate,
      scheduledPickupTime,
      scheduledReturnTime,
      fullName,
      phone,
      email,
      referralCode,
      note,
      voucher
    } = req.body;

    // Validate required fields
    if (!vehicleId || !pickupStationId || !scheduledPickupDate || !scheduledReturnDate || !scheduledPickupTime || !scheduledReturnTime) {
      return res.status(400).json({ 
        message: "Thiếu thông tin bắt buộc: vehicleId, pickupStationId, scheduledPickupDate, scheduledReturnDate, scheduledPickupTime, scheduledReturnTime" 
      });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: "Không tìm thấy xe" });
    
    // Chỉ cho phép đặt xe có status: available
    if (vehicle.status === "out_of_stock") {
      return res.status(400).json({ 
        message: "Xe đã hết. Vui lòng chọn xe khác.",
        currentStatus: vehicle.status
      });
    }
    
    if (vehicle.status !== "available") {
      return res.status(400).json({ 
        message: `Xe không thể đặt (trạng thái: ${vehicle.status})`,
        currentStatus: vehicle.status
      });
    }

    // Generate unique orderCode (timestamp + random)
    const orderCode = Date.now().toString();

    const rental = await Rental.create({
      renter: req.user._id,
      vehicle: vehicleId,
      pickupStation: pickupStationId,
      returnStation: returnStationId || pickupStationId, // Default to pickup station
      rentalMode: rentalMode || "hour",
      scheduledPickupDate: new Date(scheduledPickupDate),
      scheduledReturnDate: new Date(scheduledReturnDate),
      scheduledPickupTime,
      scheduledReturnTime,
      status: "reserved",
      pricePerHour: pricePerHour || 0,
      pricePerDay: pricePerDay || 0,
      depositAmount: depositAmount || 0,
      totalAmount: totalAmount || 0,
      orderCode,
      paymentStatus: "pending",
      fullName: fullName || req.user.fullName,
      phone: phone || req.user.phone,
      email: email || req.user.email,
      referralCode,
      note,
      voucher
    });

    // Đánh dấu xe là reserved (tạm giữ) - chưa set status vì chưa thanh toán
    // vehicle.status = "reserved";
    // await vehicle.save();
    // => Sẽ cập nhật sau khi thanh toán thành công qua webhook

    res.json({
      success: true,
      message: "Đặt xe thành công. Vui lòng thanh toán để hoàn tất.",
      rental: rental
    });
  } catch (err) {
    console.error("❌ Create Reservation Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Lịch sử thuê của cá nhân
const myRentals = async (req, res) => {
  try {
    console.log('📡 myRentals - User ID:', req.user._id);
    console.log('📡 myRentals - User email:', req.user.email);
    console.log('📡 myRentals - User role:', req.user.role);
    
    // Check if user exists and is valid
    if (!req.user || !req.user._id) {
      console.error('❌ myRentals - Invalid user object');
      return res.status(401).json({ error: 'Unauthorized - Invalid user' });
    }
    
    const rentals = await Rental.find({ renter: req.user._id })
      .populate("vehicle", "model plateNumber type image pricePerHour pricePerDay")
      .populate("pickupStation", "name address phone")
      .populate("returnStation", "name address phone")
      .populate("contract", "status contractNumber")
      .sort({ createdAt: -1 });
    
    console.log('✅ myRentals - Found rentals:', rentals.length);
    
    if (rentals.length > 0) {
      console.log('📊 myRentals - Sample rental:', {
        _id: rentals[0]._id,
        vehicle: rentals[0].vehicle?.model || 'N/A',
        status: rentals[0].status,
        paymentStatus: rentals[0].paymentStatus,
        orderCode: rentals[0].orderCode,
        createdAt: rentals[0].createdAt
      });
    } else {
      console.log('ℹ️ myRentals - No rentals found for user:', req.user._id);
    }
    
    res.json(rentals);
  } catch (err) {
    console.error('❌ myRentals - Error:', err);
    console.error('❌ myRentals - Stack:', err.stack);
    res.status(500).json({ 
      error: err.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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

// DEBUG: Get all rentals (temporary for debugging)
const debugAllRentals = async (req, res) => {
  try {
    console.log('🐛 DEBUG - Fetching ALL rentals...');
    const allRentals = await Rental.find()
      .populate("renter", "fullName email")
      .populate("vehicle", "model plateNumber")
      .sort({ createdAt: -1 })
      .limit(20);
    
    console.log('🐛 DEBUG - Total rentals in DB:', allRentals.length);
    
    const formatted = allRentals.map(r => ({
      _id: r._id,
      renter: {
        _id: r.renter?._id,
        name: r.renter?.fullName,
        email: r.renter?.email
      },
      vehicle: r.vehicle?.model,
      status: r.status,
      paymentStatus: r.paymentStatus,
      orderCode: r.orderCode,
      createdAt: r.createdAt
    }));
    
    console.log('🐛 DEBUG - Sample rentals:', JSON.stringify(formatted.slice(0, 3), null, 2));
    
    res.json({
      total: allRentals.length,
      currentUserId: req.user._id,
      currentUserEmail: req.user.email,
      rentals: formatted
    });
  } catch (err) {
    console.error('❌ DEBUG - Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  findNearbyStations,
  listAvailableVehicles,
  createReservation,
  myRentals,
  myAnalytics,
  debugAllRentals,
};
