const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const Rental = require("../models/Rental");
const Station = require("../models/Station");

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
    const { station } = req.query;
    if (!station) return res.status(400).json({ message: "Thiếu station" });
    const vehicles = await Vehicle.find({ station }).populate("station");
    res.json(vehicles);
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
    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      { stateOfChargePct, status, notes, odometerKm },
      { new: true }
    );
    if (!vehicle) return res.status(404).json({ message: "Xe không tồn tại" });
    res.json(vehicle);
  } catch (err) {
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

module.exports = {
  getPendingUsers,
  verifyUser,
  listStationVehicles,
  updateVehicleByStaff,
  checkoutRental,
  checkinRental,
};
