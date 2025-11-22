const Rental = require('../models/Rental');

// Get rental by ID with full details including payment info
const getRentalById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const rental = await Rental.findById(id)
            .populate('renter', 'fullName email phone')
            .populate('vehicle', 'name model plateNumber')
            .populate('pickupStation', 'name address')
            .populate('returnStation', 'name address');
        
        if (!rental) {
            return res.status(404).json({ message: 'Không tìm thấy đơn thuê xe' });
        }
        
        // Check permission: only renter or staff/admin can view
        const isOwner = rental.renter._id.toString() === req.user._id.toString();
        const isStaffOrAdmin = req.user.role === 'staff' || req.user.role === 'admin';
        
        if (!isOwner && !isStaffOrAdmin) {
            return res.status(403).json({ message: 'Không có quyền xem đơn thuê này' });
        }
        
        // Calculate payment info
        // totalAmount trong DB = tiền thuê + tiền cọc
        // baseCost = chỉ tiền thuê (không bao gồm cọc)
        const baseCost = rental.totalAmount - rental.depositAmount;
        const weekendFee = 0; // TODO: nếu sau này có phụ phí cuối tuần thì cộng thêm vào đây
        const rentalTotal = baseCost + weekendFee; // Tổng tiền thuê (không cộng cọc)
        const paymentTotal = rentalTotal + rental.depositAmount; // Thanh toán = tổng tiền + cọc

        const paymentInfo = {
            baseCost,           // 4.000 (chỉ tiền thuê)
            weekendFee,         // 0
            depositAmount: rental.depositAmount,  // 1.000
            totalAmount: rentalTotal,  // 4.000 (tiền thuê, không cộng cọc)
            paymentTotal: paymentTotal  // 5.000 (tiền thuê + cọc)
        };
        
        // Return rental with payment info
        const response = {
            ...rental.toObject(),
            paymentInfo: paymentInfo,
            renterName: rental.renter.fullName,
            renterPhone: rental.renter.phone,
            renterEmail: rental.renter.email
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('Error getting rental by ID:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

module.exports = {
    getRentalById
};
