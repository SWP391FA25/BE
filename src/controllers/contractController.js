const Rental = require("../models/Rental");
const Vehicle = require("../models/Vehicle");
const Station = require("../models/Station");

// TODO: Contract model needs to be created
// For now, we'll work with rentals as they already have contract reference

// Tạo hợp đồng tự động từ rental (sau thanh toán)
const createContractFromRental = async (req, res) => {
  try {
    const { rentalId } = req.body;
    
    const rental = await Rental.findById(rentalId)
      .populate("renter", "fullName email phone")
      .populate("vehicle")
      .populate("pickupStation")
      .populate("returnStation");
    
    if (!rental) {
      return res.status(404).json({ message: "Không tìm thấy đơn thuê xe" });
    }
    
    // Check if rental belongs to user
    if (rental.renter._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Không có quyền tạo hợp đồng cho đơn này" });
    }
    
    // TODO: Create actual contract document in Contract collection
    // For now, return rental as contract (rental already has contract info)
    
    res.json({
      success: true,
      message: "Hợp đồng đã được tạo",
      contract: {
        _id: rental._id, // Tạm dùng rentalId làm contractId
        rentalId: rental._id,
        renter: rental.renter,
        vehicle: rental.vehicle,
        pickupStation: rental.pickupStation,
        returnStation: rental.returnStation,
        startDate: rental.startDate,
        endDate: rental.endDate,
        totalAmount: rental.totalAmount,
        depositAmount: rental.depositAmount,
        status: 'pending_signature',
        createdAt: new Date()
      }
    });
  } catch (err) {
    console.error("❌ createContractFromRental Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Tạo hợp đồng mới manual (cho admin/staff)
const createContract = async (req, res) => {
  try {
    // TODO: Implement
    res.status(501).json({ message: "Not implemented yet" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy tất cả hợp đồng (Admin/Staff)
const getAllContracts = async (req, res) => {
  try {
    // TODO: Implement with Contract model
    res.status(501).json({ message: "Not implemented yet" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy hợp đồng của khách hàng
const getCustomerContracts = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    // For now, return rentals as "contracts"
    const rentals = await Rental.find({ renter: customerId })
      .populate("vehicle")
      .populate("pickupStation")
      .populate("returnStation")
      .sort({ createdAt: -1 });
    
    res.json(rentals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy chi tiết hợp đồng
const getContractById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📡 getContractById - Contract/Rental ID:', id);
    
    // Try to find as rental first (since we're using rental as contract for now)
    const rental = await Rental.findById(id)
      .populate("renter", "fullName email phone address city district ward dob nationalId licenseNumber nationalIdImage driverLicenseImage")
      .populate("vehicle")
      .populate("pickupStation")
      .populate("returnStation");
    
    if (!rental) {
      return res.status(404).json({ message: "Không tìm thấy hợp đồng" });
    }
    
    // Check if user has permission to view
    const isOwner = rental.renter._id.toString() === req.user._id.toString();
    const isStaffOrAdmin = req.user.role === 'staff' || req.user.role === 'admin';
    
    if (!isOwner && !isStaffOrAdmin) {
      return res.status(403).json({ message: "Không có quyền xem hợp đồng này" });
    }
    
    // Calculate rental duration
    const startDate = new Date(rental.scheduledPickupDate);
    const endDate = new Date(rental.scheduledReturnDate);
    const startTime = rental.scheduledPickupTime?.split(':') || [0, 0];
    const endTime = rental.scheduledReturnTime?.split(':') || [0, 0];
    
    const startDateTime = new Date(startDate.setHours(parseInt(startTime[0]), parseInt(startTime[1])));
    const endDateTime = new Date(endDate.setHours(parseInt(endTime[0]), parseInt(endTime[1])));
    
    const diffMs = endDateTime - startDateTime;
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    let rentalDuration = '';
    if (rental.rentalMode === 'hour') {
      const hours = Math.floor(diffHours);
      const minutes = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      rentalDuration = minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
    } else {
      rentalDuration = `${diffDays} ngày`;
    }
    
    // Format as contract structure (compatible with frontend expectations)
    const contractData = {
      _id: rental._id,
      contractNumber: rental.orderCode || `HD-${rental._id.toString().slice(-8)}`,
      status: rental.paymentStatus === 'paid' ? 
        (rental.contract ? 'signed' : 'pending_signature') : 
        'draft',
      
      // Renter info
      renter: {
        _id: rental.renter._id,
        fullName: rental.fullName || rental.renter.fullName,
        email: rental.email || rental.renter.email,
        phone: rental.phone || rental.renter.phone,
        address: rental.renter.address,
        city: rental.renter.city,
        district: rental.renter.district,
        ward: rental.renter.ward,
        dob: rental.renter.dob,
        nationalId: rental.renter.nationalId,
        licenseNumber: rental.renter.licenseNumber,
        nationalIdImage: rental.renter.nationalIdImage,
        driverLicenseImage: rental.renter.driverLicenseImage
      },
      
      // Vehicle info
      vehicle: {
        _id: rental.vehicle._id,
        name: rental.vehicle.name,
        model: rental.vehicle.model,
        plateNumber: rental.vehicle.plateNumber || rental.vehicle.licensePlate,
        licensePlate: rental.vehicle.licensePlate,
        brand: rental.vehicle.brand || 'VinFast',
        type: rental.vehicle.type,
        color: rental.vehicle.color,
        year: rental.vehicle.year,
        batteryCapacityKWh: rental.vehicle.batteryCapacityKWh || 0,
        rangeKm: rental.vehicle.rangeKm,
        range: rental.vehicle.range,
        seats: rental.vehicle.seats || rental.vehicle.seatingCapacity,
        horsepower: rental.vehicle.horsepower,
        airbags: rental.vehicle.airbags,
        trunk: rental.vehicle.trunk,
        dailyDistanceLimitKm: rental.vehicle.dailyDistanceLimitKm,
        features: rental.vehicle.features || []
      },
      
      // Rental period
      rentalPeriod: {
        startDate: rental.scheduledPickupDate,
        endDate: rental.scheduledReturnDate,
        startTime: rental.scheduledPickupTime,
        endTime: rental.scheduledReturnTime
      },
      
      // Rental mode and pricing
      rentalMode: rental.rentalMode,
      pricePerHour: rental.pricePerHour,
      pricePerDay: rental.pricePerDay,
      rentalDuration: rentalDuration,
      
      // Station info
      pickupStation: rental.pickupStation ? {
        _id: rental.pickupStation._id,
        name: rental.pickupStation.name,
        address: rental.pickupStation.address || rental.pickupStation.location
      } : null,
      returnStation: rental.returnStation ? {
        _id: rental.returnStation._id,
        name: rental.returnStation.name,
        address: rental.returnStation.address || rental.returnStation.location
      } : null,
      
      // Payment info - Tính lại từ rental data thực tế (fix cho orders cũ)
      paymentInfo: (() => {
        let baseCost = 0;
        if (rental.rentalMode === 'hour' && rental.pricePerHour) {
          const startDate = new Date(rental.scheduledPickupDate);
          const endDate = new Date(rental.scheduledReturnDate);
          const startTime = rental.scheduledPickupTime?.split(':') || [0, 0];
          const endTime = rental.scheduledReturnTime?.split(':') || [0, 0];
          const startDateTime = new Date(startDate.setHours(parseInt(startTime[0]), parseInt(startTime[1])));
          const endDateTime = new Date(endDate.setHours(parseInt(endTime[0]), parseInt(endTime[1])));
          const diffMs = endDateTime - startDateTime;
          const exactHours = Math.max(1, diffMs / (1000 * 60 * 60));
          baseCost = rental.pricePerHour * exactHours;
        } else if (rental.rentalMode === 'day' && rental.pricePerDay) {
          const startDate = new Date(rental.scheduledPickupDate);
          const endDate = new Date(rental.scheduledReturnDate);
          const diffMs = Math.max(0, endDate - startDate);
          const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          baseCost = rental.pricePerDay * days;
        } else {
          baseCost = rental.totalAmount || 0;
        }
        const weekendFee = 0;
        const subtotal = baseCost + weekendFee;
        const deposit = rental.depositAmount || 0;
        return {
          baseCost,
          weekendFee,
          totalAmount: subtotal,
          depositAmount: deposit,
          paymentTotal: subtotal + deposit,
          paymentMethod: 'PayOS',
          paymentStatus: rental.paymentStatus,
          paymentDate: rental.paymentTime
        };
      })(),
      
      // Contract content (terms)
      contractContent: {
        terms: generateContractTerms(rental),
        conditions: generateContractConditions(rental),
        responsibilities: generateContractResponsibilities(),
        penalties: generateContractPenalties()
      },
      
      // Digital signature - Get from rental.contractSignature
      contractSignature: rental.contractSignature || null,
      digitalSignature: {
        renterSignature: rental.contractSignature?.data || null,
        renterSignedAt: rental.contractSignature?.signedAt || null,
        ipAddress: rental.contractSignature?.ipAddress || null,
        userAgent: rental.contractSignature?.userAgent || null
      },
      
      // Timestamps
      createdAt: rental.createdAt,
      effectiveDate: rental.scheduledPickupDate,
      expiryDate: rental.scheduledReturnDate,
      
      // Notes
      notes: rental.note
    };
    
    console.log('✅ Contract data prepared for rental:', rental._id);
    
    res.json(contractData);
  } catch (err) {
    console.error('❌ getContractById Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Cập nhật trạng thái hợp đồng (Admin/Staff)
const updateContractStatus = async (req, res) => {
  try {
    // TODO: Implement
    res.status(501).json({ message: "Not implemented yet" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Hủy hợp đồng
const cancelContract = async (req, res) => {
  try {
    const { id } = req.params;
    
    const rental = await Rental.findById(id);
    if (!rental) {
      return res.status(404).json({ message: "Không tìm thấy hợp đồng" });
    }
    
    // Check permission
    if (rental.renter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Không có quyền hủy hợp đồng này" });
    }
    
    rental.status = 'cancelled';
    await rental.save();
    
    res.json({ success: true, message: "Đã hủy hợp đồng" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Ký hợp đồng điện tử
const signContract = async (req, res) => {
  try {
    const { id } = req.params;
    const { signature, ipAddress, userAgent } = req.body;
    
    console.log('✍️ [signContract] Contract ID:', id);
    console.log('✍️ [signContract] User ID:', req.user?._id);
    console.log('✍️ [signContract] Signature length:', signature?.length);
    
    const rental = await Rental.findById(id)
      .populate("renter", "_id");
    
    if (!rental) {
      console.log('❌ [signContract] Rental not found:', id);
      return res.status(404).json({ message: "Không tìm thấy hợp đồng" });
    }
    
    console.log('🔵 [signContract] Rental found:', {
      rentalId: rental._id,
      renterId: rental.renter?._id || rental.renter,
      renterType: typeof rental.renter,
      status: rental.status
    });
    
    // Check permission - handle both populated and non-populated renter
    const renterId = (rental.renter?._id || rental.renter)?.toString();
    const userId = req.user._id.toString();
    
    console.log('🔵 [signContract] Permission check:', {
      renterId,
      userId,
      match: renterId === userId
    });
    
    if (renterId !== userId) {
      console.log('❌ [signContract] Permission denied');
      return res.status(403).json({ message: "Không có quyền ký hợp đồng này" });
    }
    
    // Check if already signed - return success (idempotent operation)
    if (rental.contractSignature && rental.contractSignature.signedAt) {
      console.log('✅ [signContract] Already signed, returning success (idempotent)');
      return res.json({
        success: true,
        message: "Hợp đồng đã được ký trước đó",
        alreadySigned: true,
        rental: {
          _id: rental._id,
          status: rental.status,
          contractSignature: rental.contractSignature
        }
      });
    }
    
    // Save signature data (base64 image)
    // TODO: Save signature to file/storage if needed
    const signatureData = {
      data: signature,
      signedAt: new Date(),
      ipAddress: ipAddress || req.ip || req.connection.remoteAddress,
      userAgent: userAgent || req.headers['user-agent']
    };
    
    // Update rental contract signature (KHÔNG đổi status, giữ nguyên 'reserved')
    // rental.status vẫn là 'reserved' cho đến khi staff xác nhận giao xe
    rental.contractSignature = signatureData; // Store signature data
    await rental.save();
    
    console.log('✅ [signContract] Contract signed successfully for rental:', rental._id);
    
    res.json({
      success: true,
      message: "Ký hợp đồng thành công",
      rental: {
        _id: rental._id,
        status: rental.status,
        contractSignature: {
          signedAt: signatureData.signedAt
        }
      }
    });
  } catch (err) {
    console.error('❌ [signContract] Error:', err);
    console.error('❌ [signContract] Error stack:', err.stack);
    res.status(500).json({ 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Thống kê hợp đồng
const getContractStats = async (req, res) => {
  try {
    // TODO: Implement
    res.status(501).json({ message: "Not implemented yet" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper functions to generate contract content
function generateContractTerms(rental) {
  // Format địa chỉ đầy đủ
  const addressParts = [];
  if (rental.renter?.address) addressParts.push(rental.renter.address);
  if (rental.renter?.ward) addressParts.push(`Phường ${rental.renter.ward}`);
  if (rental.renter?.district) addressParts.push(`Quận ${rental.renter.district}`);
  if (rental.renter?.city) addressParts.push(`Thành phố ${rental.renter.city}`);
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Chưa cập nhật';

  return `Hợp đồng này được lập giữa:

  BÊN CHO THUÊ: CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ DỊCH VỤ EV-STATION :

  BÊN THUÊ:
    Họ và Tên : ${rental.fullName || rental.renter?.fullName || 'N/A'}
    Địa chỉ: ${fullAddress}
    Điện thoại: ${rental.phone || rental.renter?.phone || 'N/A'}
    Email: ${rental.email || rental.renter?.email || 'N/A'}`;
}

function generateContractConditions(rental) {
  // Tính lại baseCost từ rental data thực tế (fix cho orders cũ)
  let baseCost = 0;
  if (rental.rentalMode === 'hour' && rental.pricePerHour) {
    // Tính số giờ thuê
    const startDate = new Date(rental.scheduledPickupDate);
    const endDate = new Date(rental.scheduledReturnDate);
    const startTime = rental.scheduledPickupTime?.split(':') || [0, 0];
    const endTime = rental.scheduledReturnTime?.split(':') || [0, 0];
    
    const startDateTime = new Date(startDate.setHours(parseInt(startTime[0]), parseInt(startTime[1])));
    const endDateTime = new Date(endDate.setHours(parseInt(endTime[0]), parseInt(endTime[1])));
    const diffMs = endDateTime - startDateTime;
    const exactHours = Math.max(1, diffMs / (1000 * 60 * 60));
    
    baseCost = rental.pricePerHour * exactHours;
  } else if (rental.rentalMode === 'day' && rental.pricePerDay) {
    const startDate = new Date(rental.scheduledPickupDate);
    const endDate = new Date(rental.scheduledReturnDate);
    const diffMs = Math.max(0, endDate - startDate);
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    baseCost = rental.pricePerDay * days;
  } else {
    // Fallback: dùng totalAmount nếu không tính được
    baseCost = rental.totalAmount || 0;
  }
  
  const weekendFee = 0; // TODO: Calculate from rental data if available
  const subtotal = baseCost + weekendFee;
  const deposit = rental.depositAmount || 0;
  const paymentTotal = subtotal + deposit;

  return `II. THÔNG TIN XE
  - Model: ${rental.vehicle?.model || 'N/A'}
  - Biển số: ${rental.vehicle?.plateNumber || rental.vehicle?.licensePlate || 'N/A'}
  - Màu sắc: ${rental.vehicle?.color || 'Xanh'}

III. THỜI HẠN VÀ GIÁ THUÊ

  Thời hạn thuê:
  - Thời gian nhận xe: ${new Date(rental.scheduledPickupDate).toLocaleDateString('vi-VN')} ${rental.scheduledPickupTime}
  - Thời gian trả xe: ${new Date(rental.scheduledReturnDate).toLocaleDateString('vi-VN')} ${rental.scheduledReturnTime}
  - Hình thức thuê: ${rental.rentalMode === 'hour' ? 'Theo giờ' : 'Theo ngày'}

  Giá thuê:
  - Cước phí niêm yết: ${baseCost.toLocaleString('vi-VN')}đ
  - Phụ phí cuối tuần: ${weekendFee.toLocaleString('vi-VN')}đ
  - Tổng tiền: ${subtotal.toLocaleString('vi-VN')}đ
  - Tiền đặt cọc (thế chấp)*: ${deposit.toLocaleString('vi-VN')}đ
    * Tiền đặt cọc là khoản tiền tạm giữ để đảm bảo. Sau khi trả xe và kiểm tra xe không có hư hỏng, tiền đặt cọc sẽ được hoàn lại trong vòng 3-5 ngày làm việc.
  - Thanh toán*: ${paymentTotal.toLocaleString('vi-VN')}đ`;
}

function generateContractResponsibilities() {
  return `A. Quyền và nghĩa vụ của Bên cho thuê:
    1. Giao xe đúng thời gian, địa điểm đã thỏa thuận
    2. Xe giao phải đảm bảo tình trạng kỹ thuật tốt, sạch sẽ
    3. Hướng dẫn khách hàng sử dụng xe an toàn
    4. Hỗ trợ 24/7 trong thời gian thuê xe

B. Quyền và nghĩa vụ của Bên thuê:
    1. Kiểm tra xe trước khi nhận
    2. Sử dụng xe đúng mục đích, tuân thủ luật giao thông
    3. Bảo quản xe cẩn thận, không cho người khác thuê lại
    4. Trả xe đúng thời hạn, địa điểm đã thỏa thuận
    5. Chịu trách nhiệm về mọi vi phạm giao thông trong thời gian thuê`;
}

function generateContractPenalties() {
  return `V. ĐIỀU KHOẢN VỀ SỰ CỐ VÀ BẢO HIỂM
    1. Bên thuê phải thông báo ngay cho Bên cho thuê khi xảy ra sự cố
    2. Mọi chi phí sửa chữa do lỗi của Bên thuê sẽ do Bên thuê chi trả
    3. Trường hợp mất cắp, Bên thuê phải báo công an và thông báo cho Bên cho thuê

VI. ĐIỀU KHOẢN THANH TOÁN
    1. Tiền cọc được hoàn trả sau khi trả xe và kiểm tra không có hư hỏng
    2. Phụ phí phát sinh (nếu có) sẽ được trừ vào tiền cọc
    3. Trả xe trễ: Phạt 20% giá thuê/giờ

VII. ĐIỀU KHOẢN CHUNG
    1. Hợp đồng có hiệu lực kể từ ngày ký
    2. Mọi tranh chấp sẽ được giải quyết thông qua thương lượng
    3. Hai bên cam kết thực hiện đúng các điều khoản đã thỏa thuận

VIII. CHỮ KÝ XÁC NHẬN
Bằng việc ký hợp đồng điện tử này, Bên thuê xác nhận đã đọc, hiểu và đồng ý với tất cả các điều khoản nêu trên.`;
}

module.exports = {
  createContractFromRental,
  createContract,
  getAllContracts,
  getCustomerContracts,
  getContractById,
  updateContractStatus,
  cancelContract,
  signContract,
  getContractStats,
};

