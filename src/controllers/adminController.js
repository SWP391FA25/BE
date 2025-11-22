const User = require("../models/User");
const Station = require("../models/Station");
const Vehicle = require("../models/Vehicle");
const Rental = require("../models/Rental");
const { mapFrontendToBackend, mapResponseData } = require("../middleware/vehicleFieldMapper");

// Helpers
const parseDateRange = (start, end) => {
  const startDate = start ? new Date(start) : new Date(0);
  const endDate = end ? new Date(end) : new Date();
  return { startDate, endDate };
};

// Stations CRUD
const createStation = async (req, res) => {
  try {
    const { name, address, longitude, latitude, contactPhone, capacity, active } = req.body;
    const station = await Station.create({
      name,
      address,
      contactPhone: contactPhone || undefined,
      capacity: capacity || 10,
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
    // Add vehicleCount for each station
    const stationsWithCounts = await Promise.all(
      stations.map(async (station) => {
        const vehicleCount = await Vehicle.countDocuments({ station: station._id });
        return {
          ...station.toObject(),
          vehicleCount
        };
      })
    );
    res.json(stationsWithCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateStation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, longitude, latitude, contactPhone, capacity, active } = req.body;
    const payload = { name, address, active };
    if (contactPhone !== undefined) payload.contactPhone = contactPhone;
    if (capacity !== undefined) payload.capacity = capacity;
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
    console.log('🚗 createVehicle - Request body:', JSON.stringify(req.body, null, 2));
    // Map frontend fields to backend fields
    const mappedData = mapFrontendToBackend(req.body);
    console.log('🚗 createVehicle - Mapped data:', JSON.stringify(mappedData, null, 2));
    const vehicle = await Vehicle.create(mappedData);
    console.log('🚗 createVehicle - Vehicle created successfully:', vehicle._id);
    // Map backend fields to frontend fields for response
    const responseData = mapResponseData(vehicle);
    res.json(responseData);
  } catch (err) {
    console.error('❌ createVehicle - Error:', err);
    console.error('❌ createVehicle - Error message:', err.message);
    console.error('❌ createVehicle - Error stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
};

const listVehicles = async (req, res) => {
  try {
    const { station } = req.query;
    const filter = station ? { station } : {};
    const vehicles = await Vehicle.find(filter).populate("station");
    // Map backend fields to frontend fields
    const responseData = mapResponseData(vehicles);
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    // Map frontend fields to backend fields
    const mappedData = mapFrontendToBackend(req.body);

    // Auto-sync isOutOfStock based on status
    if (mappedData.status) {
      mappedData.isOutOfStock = (mappedData.status === 'out_of_stock');
    }

    const vehicle = await Vehicle.findByIdAndUpdate(id, mappedData, { new: true });
    if (!vehicle) return res.status(404).json({ message: "Vehicle không tồn tại" });
    // Map backend fields to frontend fields for response
    const responseData = mapResponseData(vehicle);
    res.json(responseData);
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
    // Get both staff and admin users
    const staff = await User.find({ role: { $in: ["staff", "admin"] } })
      .populate("stationId")
      .sort({ createdAt: -1 });
    console.log('👥 listStaff - Found staff:', staff.length);
    staff.forEach(user => {
      console.log(`👥 Staff ${user.fullName} (${user._id}): stationId =`, user.stationId?._id || user.stationId || 'null', 'stationName =', user.stationId?.name || 'N/A');
    });
    res.json(staff);
  } catch (err) {
    console.error('❌ listStaff - Error:', err);
    res.status(500).json({ error: err.message });
  }
};

const createStaff = async (req, res) => {
  try {
    const { fullName, email, password, phone, stationId, role } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc: fullName, email, password" });
    }
    // Chỉ admin mới có thể tạo admin, nếu không phải admin thì mặc định là staff
    const currentUser = req.user; // Từ middleware authenticate
    const userRole = (currentUser?.role === 'admin' && role === 'admin') ? 'admin' : 'staff';
    
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      fullName, 
      email, 
      passwordHash: hashedPassword, 
      role: userRole, 
      isVerified: true,
      phone: phone || undefined,
      stationId: stationId || undefined
    });
    // Populate stationId before returning
    await user.populate("stationId");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, stationId, isVerified } = req.body;
    const payload = {};
    if (fullName !== undefined) payload.fullName = fullName;
    if (email !== undefined) payload.email = email;
    if (phone !== undefined) payload.phone = phone;
    if (stationId !== undefined) payload.stationId = stationId || null;
    if (isVerified !== undefined) payload.isVerified = isVerified;
    
    const user = await User.findOneAndUpdate(
      { _id: id, role: { $in: ["staff", "admin"] } }, 
      payload, 
      { new: true }
    ).populate("stationId");
    if (!user) return res.status(404).json({ message: "Staff không tồn tại" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    // Chỉ cho phép xóa staff, không cho phép xóa admin
    const user = await User.findOne({ _id: id, role: "staff" });
    if (!user) {
      return res.status(404).json({ message: "Staff không tồn tại hoặc không thể xóa (có thể là admin)" });
    }
    await User.deleteOne({ _id: id, role: "staff" });
    res.json({ message: "Đã xóa staff" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const resetStaffPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ message: "Thiếu newPassword" });
    }
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findOneAndUpdate(
      { _id: id, role: { $in: ["staff", "admin"] } },
      { passwordHash: hashedPassword },
      { new: true }
    ).populate("stationId");
    if (!user) return res.status(404).json({ message: "Staff không tồn tại" });
    res.json({ message: "Reset mật khẩu thành công", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Customer management
const listCustomers = async (req, res) => {
  try {
    const users = await User.find({ role: "renter" });
    console.log('📊 listCustomers - Found users:', users.length);
    
    // Add rental count and average rating for each customer
    const customersWithStats = await Promise.all(users.map(async (user) => {
      const rentals = await Rental.find({ renter: user._id });
      const rentalCount = rentals.length;
      const avgRating = rentals.length > 0 
        ? rentals.reduce((sum, rental) => sum + (rental.rating || 0), 0) / rentals.length 
        : 0;
      
      console.log(`📊 Customer ${user.fullName} (${user._id}): ${rentalCount} rentals, avgRating: ${avgRating}`);
      
      return {
        ...user.toObject(),
        rentalCount,
        avgRating
      };
    }));
    
    console.log('📊 listCustomers - Returning customers with stats:', customersWithStats.length);
    res.json(customersWithStats);
  } catch (err) {
    console.error('❌ listCustomers - Error:', err);
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

const verifyCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified, verifyNote } = req.body;
    const updateData = { 
      isVerified: !!isVerified,
    };
    if (verifyNote !== undefined) {
      updateData.verifyNote = verifyNote;
    }
    const user = await User.findOneAndUpdate({ _id: id, role: "renter" }, updateData, { new: true });
    if (!user) return res.status(404).json({ message: "Customer không tồn tại" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCustomerRentals = async (req, res) => {
  try {
    const { id } = req.params;
    const rentals = await Rental.find({ renter: id })
      .populate('vehicle')
      .populate('pickupStation')
      .populate('returnStation')
      .sort({ createdAt: -1 });
    res.json(rentals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Reports
const reportRevenueByStation = async (req, res) => {
  try {
    const { start, end, station } = req.query;
    const { startDate, endDate } = parseDateRange(start, end);

    // Build match conditions
    // Bao gồm tất cả các status có thể có trong DB
    const matchConditions = {
      status: { $in: ['completed', 'ongoing', 'reserved', 'confirmed'] }, // Bao gồm cả 'confirmed'
    };
    
    // Chỉ tính các đơn đã thanh toán (uncomment nếu muốn)
    // matchConditions.paymentStatus = 'paid';

    // Filter by date range (dựa trên returnTime hoặc createdAt nếu chưa có returnTime)
    const dateConditions = [];
    if (startDate && endDate) {
      dateConditions.push(
        { returnTime: { $gte: startDate, $lte: endDate } },
        { 
          $and: [
            { returnTime: { $exists: false } },
            { createdAt: { $gte: startDate, $lte: endDate } }
          ]
        }
      );
    }

    // Filter by station if specified
    let stationMatch = null;
    if (station && station !== 'all') {
      // Convert string to ObjectId if needed
      const mongoose = require('mongoose');
      const stationId = mongoose.Types.ObjectId.isValid(station) 
        ? new mongoose.Types.ObjectId(station) 
        : station;
      
      stationMatch = {
        $or: [
          { returnStation: stationId },
          { pickupStation: stationId }
        ]
      };
    }

    // Combine all conditions
    const andConditions = [matchConditions];
    if (dateConditions.length > 0) {
      andConditions.push({ $or: dateConditions });
    }
    if (stationMatch) {
      andConditions.push(stationMatch);
    }

    const finalMatch = andConditions.length > 1 ? { $and: andConditions } : matchConditions;

    // Debug: Đếm số rental match với điều kiện
    const totalMatchCount = await Rental.countDocuments(finalMatch);
    console.log('🔍 Revenue report - Match conditions:', JSON.stringify(finalMatch, null, 2));
    console.log('🔍 Total rentals matching conditions:', totalMatchCount);

    const data = await Rental.aggregate([
      { $match: finalMatch },
      {
        $group: {
          _id: { 
            $ifNull: ["$returnStation", "$pickupStation"] 
          }, // Group by return station, fallback to pickup station
          revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
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
          stationName: { 
            $ifNull: ["$station.name", "Chưa xác định"] 
          },
          revenue: { $ifNull: ["$revenue", 0] },
          rentals: { $ifNull: ["$rentals", 0] },
          _id: 0,
        },
      },
      { $sort: { revenue: -1 } }, // Sort by revenue descending
    ]);

    // If filtering by specific station and no data, try grouping by pickupStation only
    if (station && station !== 'all' && data.length === 0) {
      const mongoose = require('mongoose');
      const stationId = mongoose.Types.ObjectId.isValid(station) 
        ? new mongoose.Types.ObjectId(station) 
        : station;
      
      const pickupMatchConditions = {
        ...matchConditions,
        pickupStation: stationId
      };
      
      // Add date conditions if exists
      const pickupAndConditions = [pickupMatchConditions];
      if (dateConditions.length > 0) {
        pickupAndConditions.push({ $or: dateConditions });
      }
      const pickupMatch = pickupAndConditions.length > 1 ? { $and: pickupAndConditions } : pickupMatchConditions;
      
      const pickupData = await Rental.aggregate([
        { $match: pickupMatch },
        {
          $group: {
            _id: "$pickupStation",
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
            stationName: { 
              $ifNull: ["$station.name", "Chưa xác định"] 
            },
            revenue: { $ifNull: ["$revenue", 0] },
            rentals: { $ifNull: ["$rentals", 0] },
            _id: 0,
          },
        },
      ]);
      
      if (pickupData.length > 0) {
        data.push(...pickupData);
      }
    }

    console.log('📊 Revenue report result:', {
      totalStations: data.length,
      totalRevenue: data.reduce((sum, item) => sum + (item.revenue || 0), 0),
      totalRentals: data.reduce((sum, item) => sum + (item.rentals || 0), 0),
      totalMatchCount: totalMatchCount,
      matchConditions: finalMatch,
      sampleData: data.slice(0, 3) // Show first 3 results for debugging
    });

    res.json(data);
  } catch (err) {
    console.error('Error in reportRevenueByStation:', err);
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

// Get unique vehicle types from database
const getVehicleTypes = async (req, res) => {
  try {
    const types = await Vehicle.distinct("type");
    // Sort alphabetically
    const sortedTypes = types.filter(t => t).sort();
    res.json(sortedTypes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get recent activities for dashboard
const getRecentActivities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const activities = [];

    // Get recent rentals
    const recentRentals = await Rental.find()
      .populate('renter', 'fullName email')
      .populate('vehicle', 'model licensePlate plateNumber')
      .populate('pickupStation', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);

    recentRentals.forEach(rental => {
      const plateNumber = rental.vehicle?.plateNumber || rental.vehicle?.licensePlate || 'N/A';
      activities.push({
        type: 'rental',
        action: rental.status === 'reserved' ? 'Đặt xe' : 
                rental.status === 'ongoing' ? 'Bắt đầu thuê' :
                rental.status === 'completed' ? 'Hoàn thành thuê' : 'Thuê xe',
        description: `${rental.renter?.fullName || 'Khách hàng'} ${rental.status === 'reserved' ? 'đã đặt' : rental.status === 'ongoing' ? 'đã bắt đầu thuê' : 'đã hoàn thành thuê'} xe ${rental.vehicle?.model || 'N/A'} (${plateNumber}) tại ${rental.pickupStation?.name || 'N/A'}`,
        timestamp: rental.createdAt || rental.updatedAt,
        icon: 'car',
        color: rental.status === 'completed' ? 'green' : rental.status === 'ongoing' ? 'blue' : 'orange'
      });
    });

    // Get recent new users (customers)
    const recentUsers = await User.find({ role: 'renter' })
      .sort({ createdAt: -1 })
      .limit(5);

    recentUsers.forEach(user => {
      activities.push({
        type: 'user',
        action: 'Đăng ký',
        description: `Khách hàng ${user.fullName} (${user.email}) đã đăng ký tài khoản mới`,
        timestamp: user.createdAt,
        icon: 'user',
        color: 'blue'
      });
    });

    // Get recent new vehicles
    const recentVehicles = await Vehicle.find()
      .populate('station', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    recentVehicles.forEach(vehicle => {
      activities.push({
        type: 'vehicle',
        action: 'Thêm xe',
        description: `Xe mới ${vehicle.model} (${vehicle.licensePlate}) đã được thêm vào hệ thống${vehicle.station ? ` tại trạm ${vehicle.station.name}` : ''}`,
        timestamp: vehicle.createdAt,
        icon: 'car',
        color: 'green'
      });
    });

    // Get recent new staff
    const recentStaff = await User.find({ role: { $in: ['staff', 'admin'] } })
      .sort({ createdAt: -1 })
      .limit(5);

    recentStaff.forEach(staff => {
      activities.push({
        type: 'staff',
        action: 'Thêm nhân viên',
        description: `Nhân viên ${staff.fullName} (${staff.email}) đã được thêm vào hệ thống`,
        timestamp: staff.createdAt,
        icon: 'team',
        color: 'purple'
      });
    });

    // Get recent new stations
    const recentStations = await Station.find()
      .sort({ createdAt: -1 })
      .limit(5);

    recentStations.forEach(station => {
      activities.push({
        type: 'station',
        action: 'Thêm trạm',
        description: `Trạm xe ${station.name} đã được thêm vào hệ thống`,
        timestamp: station.createdAt,
        icon: 'shop',
        color: 'cyan'
      });
    });

    // Sort all activities by timestamp (most recent first) and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivities = activities.slice(0, limit);

    res.json(limitedActivities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get active rentals with customer details
const getActiveRentals = async (req, res) => {
  try {
    const activeRentals = await Rental.find({
      status: { $in: ['ongoing', 'rented', 'reserved'] }
    })
      .populate('renter', 'fullName email phone')
      .populate('vehicle', 'model plateNumber licensePlate')
      .populate('pickupStation', 'name address')
      .populate('returnStation', 'name address')
      .sort({ createdAt: -1 });

    res.json(activeRentals);
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
  resetStaffPassword,
  // customers
  listCustomers,
  markRiskyCustomer,
  verifyCustomer,
  getCustomerRentals,
  // reports
  reportRevenueByStation,
  reportUtilization,
  reportPeakHours,
  // vehicle types
  getVehicleTypes,
  // activities
  getRecentActivities,
  // active rentals
  getActiveRentals,
};


