const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const Rental = require("../models/Rental");
const Station = require("../models/Station");
const { mapBackendToFrontend } = require("../middleware/vehicleFieldMapper");

/**
 * Lấy danh sách user chờ xác minh
 */
const getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ isVerified: false });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Nhân viên xác minh CCCD
 */
const verifyUser = async (req, res) => {
  try {
    const { userId, status, note } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    // Nếu duyệt, cần kiểm tra đã đủ hồ sơ
    if (status === "approved") {
      const hasPhone = !!user.phone;
      const hasNationalId = !!user.nationalId;
      const hasLicense = !!user.licenseNumber;
      const hasCCCDImg = !!user.nationalIdImage;
      const hasDLImg = !!user.driverLicenseImage;
      if (!hasPhone || !hasNationalId || !hasLicense || !hasCCCDImg || !hasDLImg) {
        return res.status(400).json({
          message: "Hồ sơ chưa đầy đủ. Cần phone, nationalId, licenseNumber, nationalIdImage, driverLicenseImage để duyệt."
        });
      }
      user.isVerified = true;
    } else if (status === "rejected") {
      user.isVerified = false;
    }
    user.verifyNote = note || "";

    await user.save();
    res.json({ message: "Xác minh thành công", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getPendingUsers, verifyUser };

/**
 * Danh sách xe theo trạm (available/reserved/rented/maintenance)
 */
const listStationVehicles = async (req, res) => {
  try {
    const { station, stationId } = req.query;
    const stationParam = stationId || station;
    if (!stationParam) return res.status(400).json({ message: "Thiếu station hoặc stationId" });
    const vehicles = await Vehicle.find({ station: stationParam }).populate("station");
    
    // Format data để match với frontend (thêm rentalInfo nếu có và map fields)
    const formattedVehicles = await Promise.all(vehicles.map(async (vehicle) => {
      // Map backend fields to frontend format (licensePlate -> plateNumber, etc.)
      let vehicleObj = mapBackendToFrontend(vehicle) || vehicle.toObject();
      
      // Ensure plateNumber exists (map from licensePlate if needed)
      if (!vehicleObj.plateNumber && vehicleObj.licensePlate) {
        vehicleObj.plateNumber = vehicleObj.licensePlate;
      }
      
      // Tìm rental liên quan nếu xe đang reserved hoặc rented
      if (vehicle.status === 'reserved' || vehicle.status === 'rented') {
        const rental = await Rental.findOne({
          vehicle: vehicle._id,
          status: { $in: ['reserved', 'ongoing', 'checked_out'] }
        })
          .populate('renter', 'fullName phone')
          .sort({ createdAt: -1 });
        
        if (rental) {
          const startDate = rental.checkoutTime || rental.reservationTime || rental.createdAt;
          const endDate = rental.returnTime || rental.expectedReturnTime;
          
          vehicleObj.rentalInfo = {
            renterName: rental.renter?.fullName,
            renterPhone: rental.renter?.phone,
            startDate: startDate ? new Date(startDate).toISOString().split('T')[0] : null,
            startTime: startDate ? new Date(startDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null,
            endDate: endDate ? new Date(endDate).toISOString().split('T')[0] : null,
            endTime: endDate ? new Date(endDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null,
            status: rental.status,
            totalAmount: rental.totalAmount
          };
        }
      }
      
      return vehicleObj;
    }));
    
    res.json(formattedVehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Staff cập nhật tình trạng xe (pin, kỹ thuật, status)
 */
const updateVehicleByStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { stateOfChargePct, status, notes, odometerKm } = req.body;
    
    // Build update object (only include fields that are provided)
    const updateData = {};
    if (stateOfChargePct !== undefined) updateData.stateOfChargePct = stateOfChargePct;
    if (status !== undefined) updateData.status = status;
    if (odometerKm !== undefined) updateData.odometerKm = odometerKm;
    // Handle notes - if it's a string, convert to array; if array, keep as is
    if (notes !== undefined) {
      if (typeof notes === 'string') {
        updateData.notes = notes ? [notes] : [];
      } else if (Array.isArray(notes)) {
        updateData.notes = notes;
      }
    }
    
    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('station');
    
    if (!vehicle) return res.status(404).json({ message: "Xe không tồn tại" });
    
    // Map backend fields to frontend format
    const mappedVehicle = mapBackendToFrontend(vehicle) || vehicle.toObject();
    
    // Ensure plateNumber exists
    if (!mappedVehicle.plateNumber && mappedVehicle.licensePlate) {
      mappedVehicle.plateNumber = mappedVehicle.licensePlate;
    }
    
    res.json(mappedVehicle);
  } catch (err) {
    console.error('Error updating vehicle by staff:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Checkout: bàn giao xe cho khách (từ reservation hoặc walk-in)
 */
const checkoutRental = async (req, res) => {
  try {
    const {
      rentalId,
      renterId,
      vehicleId,
      pickupStationId,
      pricePerHour,
      depositAmount = 0,
      batteryPct,
      note,
    } = req.body;

    let rental;
    if (rentalId) {
      rental = await Rental.findById(rentalId).populate("vehicle");
      if (!rental) return res.status(404).json({ message: "Không tìm thấy rental" });
    } else {
      if (!renterId || !vehicleId || !pickupStationId)
        return res.status(400).json({ message: "Thiếu renterId/vehicleId/pickupStationId" });

      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle || String(vehicle.station) !== String(pickupStationId))
        return res.status(400).json({ message: "Xe không thuộc trạm hoặc không tồn tại" });
      if (vehicle.status !== "available" && vehicle.status !== "reserved")
        return res.status(400).json({ message: "Xe không sẵn sàng để bàn giao" });

      rental = await Rental.create({
        renter: renterId,
        vehicle: vehicleId,
        pickupStation: pickupStationId,
        reservationTime: rentalId ? undefined : new Date(),
        status: "reserved",
        pricePerHour,
        depositAmount,
      });
      rental = await Rental.findById(rental._id).populate("vehicle");
    }

    // Ảnh bàn giao
    const photos = (req.files?.photos || []).map((f) => f.path);

    // Cập nhật rental + vehicle
    rental.checkoutTime = new Date();
    rental.status = "checked_out";
    rental.conditionCheckout = { photos, note, batteryPct };
    await rental.save();

    const vehicleToUpdate = await Vehicle.findById(rental.vehicle);
    vehicleToUpdate.status = "rented";
    await vehicleToUpdate.save();

    res.json(rental);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Checkin: nhận xe về, tính tiền, cập nhật tình trạng
 */
const checkinRental = async (req, res) => {
  try {
    const { rentalId, dropoffStationId, batteryPct, note, distanceKm = 0 } = req.body;
    if (!rentalId || !dropoffStationId) return res.status(400).json({ message: "Thiếu rentalId/dropoffStationId" });

    const rental = await Rental.findById(rentalId).populate("vehicle");
    if (!rental) return res.status(404).json({ message: "Không tìm thấy rental" });

    const photos = (req.files?.photos || []).map((f) => f.path);

    rental.checkinTime = new Date();
    rental.dropoffStation = dropoffStationId;
    rental.status = "checked_in";
    rental.conditionCheckin = { photos, note, batteryPct };
    rental.distanceKm = Number(distanceKm) || 0;

    // Tính tiền đơn giản theo giờ
    const start = rental.checkoutTime || rental.reservationTime || new Date();
    const end = rental.checkinTime;
    const hours = Math.max(1 / 60, (end.getTime() - start.getTime()) / 3600000); // tối thiểu 1 phút
    const total = Math.round(hours * rental.pricePerHour * 100) / 100;
    rental.totalAmount = total;
    await rental.save();

    // Cập nhật xe: về available ở trạm trả
    const vehicle = await Vehicle.findById(rental.vehicle._id);
    vehicle.status = "available";
    vehicle.station = dropoffStationId;
    await vehicle.save();

    res.json(rental);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Lấy lịch sử thuê xe của trạm
 */
const getRentalHistory = async (req, res) => {
  try {
    const { stationId } = req.query;
    if (!stationId) {
      return res.status(400).json({ message: 'Thiếu stationId' });
    }
    
    const rentals = await Rental.find({
      $or: [
        { pickupStation: stationId },
        { returnStation: stationId }
      ]
    })
      .populate('vehicle', 'licensePlate model') // Use licensePlate (backend field)
      .populate('renter', 'fullName phone email')
      .populate('pickupStation', 'name address')
      .populate('returnStation', 'name address')
      .sort({ createdAt: -1 })
      .limit(100);
    
    // Format data để match với frontend
    const formattedRentals = rentals.map(rental => {
      const startDate = rental.checkoutTime || rental.reservationTime || rental.createdAt;
      const endDate = rental.checkinTime || rental.returnTime;
      
      // Map licensePlate to plateNumber for frontend
      const vehiclePlateNumber = rental.vehicle?.licensePlate || rental.vehicle?.plateNumber;
      
      return {
        _id: rental._id,
        plateNumber: vehiclePlateNumber, // Add plateNumber at root level for table display
        model: rental.vehicle?.model,
        vehicle: {
          _id: rental.vehicle?._id,
          plateNumber: vehiclePlateNumber, // Map licensePlate -> plateNumber
          model: rental.vehicle?.model
        },
        rentalInfo: {
          renterName: rental.renter?.fullName,
          renterPhone: rental.renter?.phone,
          startDate: startDate ? new Date(startDate).toISOString().split('T')[0] : null,
          startTime: startDate ? new Date(startDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null,
          endDate: endDate ? new Date(endDate).toISOString().split('T')[0] : null,
          endTime: endDate ? new Date(endDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null,
          status: rental.status,
          totalAmount: rental.totalAmount
        }
      };
    });
    
    res.json(formattedRentals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Lấy thông tin trạm của staff hiện tại
 */
const getStaffStation = async (req, res) => {
  try {
    const staffId = req.user._id;
    const staff = await User.findById(staffId).populate('stationId');
    
    if (!staff) {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
    }
    
    if (!staff.stationId) {
      return res.status(404).json({ message: 'Nhân viên chưa được phân công trạm' });
    }
    
    res.json(staff.stationId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Lấy thống kê cho staff dashboard
 */
const getStaffStats = async (req, res) => {
  try {
    const { stationId } = req.query;
    if (!stationId) {
      return res.status(400).json({ message: 'Thiếu stationId' });
    }
    
    const vehicles = await Vehicle.find({ station: stationId });
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter(v => v.status === 'available').length;
    const reservedVehicles = vehicles.filter(v => v.status === 'reserved').length;
    const rentedVehicles = vehicles.filter(v => v.status === 'rented').length;
    
    // Đếm số giao nhận hôm nay
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayHandovers = await Rental.countDocuments({
      $and: [
        {
          $or: [
            { pickupStation: stationId },
            { returnStation: stationId }
          ]
        },
        {
          $or: [
            { checkoutTime: { $gte: today, $lt: tomorrow } },
            { checkinTime: { $gte: today, $lt: tomorrow } }
          ]
        }
      ]
    });
    
    res.json({
      totalVehicles,
      availableVehicles,
      reservedVehicles,
      rentedVehicles,
      todayHandovers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getPendingUsers,
  verifyUser,
  listStationVehicles,
  updateVehicleByStaff,
  checkoutRental,
  checkinRental,
  getStaffStation,
  getStaffStats,
  getRentalHistory,
};
