const payOS = require('../config/payos');
const Rental = require('../models/Rental');
const Vehicle = require('../models/Vehicle');
const crypto = require('crypto');

/**
 * Payment Controller - PayOS Integration
 * Chức năng thanh toán thật qua PayOS
 */

/**
 * Tạo link thanh toán PayOS
 * POST /api/payment/create-payment
 */
const createPaymentLink = async (req, res) => {
    try {
        const { rentalId, returnUrl, cancelUrl } = req.body;
        
        // Validate rentalId
        if (!rentalId) {
            return res.status(400).json({ message: 'Thiếu thông tin rentalId' });
        }
        
        // Lấy thông tin rental
        const rental = await Rental.findById(rentalId)
            .populate('renter', 'fullName email phone')
            .populate('vehicle', 'name model plateNumber')
            .populate('pickupStation', 'name address');
            
        if (!rental) {
            return res.status(404).json({ message: 'Không tìm thấy đơn thuê xe' });
        }

        if (!rental.vehicle) {
            return res.status(400).json({ message: 'Thông tin xe không tồn tại' });
        }

        // Kiểm tra trạng thái rental
        if (rental.status !== 'reserved') {
            return res.status(400).json({ 
                message: 'Đơn thuê xe không ở trạng thái chờ thanh toán',
                currentStatus: rental.status
            });
        }

        // Kiểm tra đã thanh toán chưa
        if (rental.paymentStatus === 'paid') {
            return res.status(400).json({ 
                message: 'Đơn thuê xe đã được thanh toán',
                paymentStatus: rental.paymentStatus
            });
        }

        // Sử dụng orderCode đã có từ rental
        const orderCode = rental.orderCode;
        const amount = rental.totalAmount || rental.depositAmount;
        
        // Tạo dữ liệu thanh toán PayOS
        const vehicleName = rental.vehicle?.name || rental.vehicle?.model || 'Xe';
        const plateNumber = rental.vehicle?.plateNumber || 'N/A';
        
        // PayOS giới hạn description <= 25 ký tự
        const shortDescription = `Thue xe ${orderCode}`.substring(0, 25);
        
        const paymentData = {
            orderCode: parseInt(orderCode),
            amount: amount,
            description: shortDescription,
            items: [
                {
                    name: `${vehicleName} - ${plateNumber}`.substring(0, 50), // Item name có thể dài hơn
                    quantity: 1,
                    price: amount
                }
            ],
            returnUrl: returnUrl || `${process.env.FRONTEND_URL}/payment/success?orderCode=${orderCode}`,
            cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/payment/cancel?orderCode=${orderCode}`
        };

        console.log('📦 Creating PayOS payment with data:', {
            orderCode: paymentData.orderCode,
            amount: paymentData.amount,
            description: paymentData.description
        });

        // Tạo link thanh toán PayOS THẬT
        const paymentLinkResponse = await payOS.paymentRequests.create(paymentData);
        
        console.log('✅ PayOS payment link created:', {
            checkoutUrl: paymentLinkResponse.checkoutUrl,
            orderCode: orderCode
        });

        // Cập nhật rental với orderCode (nếu chưa có)
        if (!rental.orderCode) {
            rental.orderCode = orderCode;
        }
        rental.paymentStatus = 'pending';
        await rental.save();

        // Trả về response
        console.log('📦 PayOS Full Response:', JSON.stringify(paymentLinkResponse, null, 2));
        
        // PayOS trả về qrCode là string (EMVCo format), cần convert sang image URL
        let qrCodeImageUrl = null;
        if (paymentLinkResponse.qrCode) {
            // Sử dụng Google Charts API để generate QR code image
            qrCodeImageUrl = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(paymentLinkResponse.qrCode)}&choe=UTF-8`;
        }
        
        res.json({
            success: true,
            paymentLink: paymentLinkResponse.checkoutUrl,
            qrCode: qrCodeImageUrl, // QR code image URL
            qrCodeData: paymentLinkResponse.qrCode, // Raw QR code string (backup)
            orderCode: orderCode,
            amount: amount,
            description: paymentData.description,
            paymentLinkId: paymentLinkResponse.paymentLinkId,
            bankInfo: {
                bin: paymentLinkResponse.bin,
                accountNumber: paymentLinkResponse.accountNumber,
                accountName: paymentLinkResponse.accountName
            }
        });

    } catch (error) {
        console.error('❌ PayOS Create Payment Error:', error);
        res.status(500).json({ 
            message: 'Lỗi tạo link thanh toán', 
            error: error.message,
            details: error.response?.data || null
        });
    }
};

/**
 * Webhook xử lý từ PayOS
 * POST /api/payment/webhook
 */
const handleWebhook = async (req, res) => {
    try {
        console.log('🔔 PayOS Webhook received:', req.body);

        const webhookData = req.body;
        
        // Verify webhook signature từ PayOS
        const isValidSignature = verifyPayOSSignature(webhookData);
        
        if (!isValidSignature) {
            console.error('❌ Invalid PayOS webhook signature');
            return res.status(400).json({ 
                error: 'Invalid signature',
                code: '01'
            });
        }

        const { orderCode, code, desc, data } = webhookData;
        
        console.log('📦 Webhook data:', { orderCode, code, desc });

        // Tìm rental theo orderCode
        const rental = await Rental.findOne({ orderCode: orderCode.toString() });
        
        if (!rental) {
            console.error('❌ Rental not found for orderCode:', orderCode);
            return res.json({
                error: 'Order not found',
                code: '01'
            });
        }

        // Kiểm tra mã trạng thái thanh toán
        if (code === '00') {
            // Thanh toán thành công
            if (rental.paymentStatus !== 'paid') {
                rental.paymentStatus = 'paid';
                rental.paymentTime = new Date();
                rental.status = 'reserved'; // Giữ trạng thái reserved cho đến khi nhận xe
                await rental.save();

                // Cập nhật trạng thái xe
                await Vehicle.findByIdAndUpdate(rental.vehicle, { 
                    status: 'reserved' 
                });

                console.log('✅ Payment confirmed via webhook for rental:', rental._id);
            }
        } else {
            // Thanh toán thất bại hoặc bị hủy
            if (rental.paymentStatus === 'pending') {
                rental.paymentStatus = 'failed';
                await rental.save();
                
                console.log('❌ Payment failed via webhook for rental:', rental._id);
            }
        }

        // Trả về success cho PayOS
        res.json({
            error: 0,
            message: 'Webhook processed successfully',
            data: null
        });
        
    } catch (error) {
        console.error('❌ Webhook Error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            code: '99',
            message: error.message 
        });
    }
};

/**
 * Xác minh chữ ký webhook từ PayOS
 */
const verifyPayOSSignature = (webhookData) => {
    try {
        const { signature, ...data } = webhookData;
        
        if (!signature) {
            console.warn('⚠️  No signature provided in webhook');
            return true; // Tạm thời accept nếu không có signature (dev mode)
        }

        // Tạo signature từ data
        const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
        const sortedData = sortObject(data);
        const dataString = JSON.stringify(sortedData);
        
        const calculatedSignature = crypto
            .createHmac('sha256', checksumKey)
            .update(dataString)
            .digest('hex');

        const isValid = calculatedSignature === signature;
        
        if (!isValid) {
            console.error('❌ Signature mismatch:', {
                received: signature,
                calculated: calculatedSignature
            });
        }

        return isValid;
    } catch (error) {
        console.error('❌ Signature verification error:', error);
        return false;
    }
};

/**
 * Sắp xếp object theo key
 */
const sortObject = (obj) => {
    const sorted = {};
    Object.keys(obj).sort().forEach(key => {
        sorted[key] = obj[key];
    });
    return sorted;
};

/**
 * Kiểm tra trạng thái thanh toán
 * GET /api/payment/status/:orderCode
 */
const checkPaymentStatus = async (req, res) => {
    try {
        const { orderCode } = req.params;
        
        console.log('🔍 Checking payment status for orderCode:', orderCode);
        
        // Tìm rental trong database
        const rental = await Rental.findOne({ orderCode })
            .populate('vehicle', 'name plateNumber')
            .populate('renter', 'fullName email');
            
        if (!rental) {
            return res.status(404).json({ 
                message: 'Không tìm thấy đơn thuê xe' 
            });
        }

        // Nếu đã thanh toán rồi, trả về luôn
        if (rental.paymentStatus === 'paid') {
            return res.json({
                success: true,
                orderCode: rental.orderCode,
                paymentStatus: 'paid',
                rentalId: rental._id,
                rentalStatus: rental.status,
                amount: rental.totalAmount || rental.depositAmount,
                paymentTime: rental.paymentTime,
                vehicle: rental.vehicle,
                renter: rental.renter
            });
        }

        // Nếu chưa paid, check với PayOS API
        try {
            const paymentInfo = await payOS.paymentRequests.get(parseInt(orderCode));
            
            console.log('📦 PayOS payment info:', paymentInfo);

            // Cập nhật status nếu đã paid trên PayOS
            if (paymentInfo.status === 'PAID' && rental.paymentStatus !== 'paid') {
                rental.paymentStatus = 'paid';
                rental.paymentTime = new Date();
                rental.status = 'reserved';
                await rental.save();

                // Cập nhật trạng thái xe
                await Vehicle.findByIdAndUpdate(rental.vehicle, { 
                    status: 'reserved' 
                });

                console.log('✅ Payment status updated from PayOS API');
            } else if (paymentInfo.status === 'CANCELLED') {
                rental.paymentStatus = 'cancelled';
                await rental.save();
            }

        } catch (payosError) {
            console.warn('⚠️  PayOS API error (probably payment link not found):', payosError.message);
            // Không throw error, chỉ log warning
        }

        // Trả về status hiện tại
        res.json({
            success: true,
            orderCode: rental.orderCode,
            paymentStatus: rental.paymentStatus,
            rentalId: rental._id,
            rentalStatus: rental.status,
            amount: rental.totalAmount || rental.depositAmount,
            paymentTime: rental.paymentTime,
            vehicle: rental.vehicle,
            renter: rental.renter
        });
        
    } catch (error) {
        console.error('❌ Check Payment Status Error:', error);
        res.status(500).json({ 
            message: 'Lỗi kiểm tra trạng thái thanh toán', 
            error: error.message 
        });
    }
};

/**
 * Hủy thanh toán
 * POST /api/payment/cancel/:orderCode
 */
const cancelPayment = async (req, res) => {
    try {
        const { orderCode } = req.params;
        
        const rental = await Rental.findOne({ orderCode });
        
        if (!rental) {
            return res.status(404).json({ 
                message: 'Không tìm thấy đơn thuê xe' 
            });
        }

        // Chỉ cho phép hủy nếu chưa thanh toán
        if (rental.paymentStatus === 'paid') {
            return res.status(400).json({ 
                message: 'Không thể hủy đơn đã thanh toán' 
            });
        }

        rental.paymentStatus = 'cancelled';
        rental.status = 'cancelled';
        await rental.save();

        // Giải phóng xe
        await Vehicle.findByIdAndUpdate(rental.vehicle, { 
            status: 'available' 
        });

        // Hủy payment link trên PayOS (nếu có API)
        try {
            await payOS.paymentRequests.cancel(parseInt(orderCode));
            console.log('✅ Payment link cancelled on PayOS');
        } catch (error) {
            console.warn('⚠️  Could not cancel payment link on PayOS:', error.message);
            // Không throw error, vẫn cho phép hủy local
        }

        console.log('ℹ️  Payment cancelled for rental:', rental._id);

        res.json({
            success: true,
            message: 'Đã hủy đơn thanh toán',
            rental: rental
        });
        
    } catch (error) {
        console.error('❌ Cancel Payment Error:', error);
        res.status(500).json({ 
            message: 'Lỗi hủy thanh toán', 
            error: error.message 
        });
    }
};

module.exports = {
    createPaymentLink,
    handleWebhook,
    checkPaymentStatus,
    cancelPayment
};
