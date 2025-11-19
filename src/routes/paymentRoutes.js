const express = require('express');
const router = express.Router();
const { 
    createPaymentLink,
    handleWebhook,
    checkPaymentStatus,
    cancelPayment
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

/**
 * Payment Routes - PayOS Integration
 * Các endpoint cho chức năng thanh toán thật qua PayOS
 */

// Tạo link thanh toán PayOS (cần đăng nhập)
router.post('/create-payment', protect, createPaymentLink);

// Webhook từ PayOS (không cần authentication - PayOS gọi tự động)
router.post('/webhook', handleWebhook);

// Kiểm tra trạng thái thanh toán (public - để frontend check)
router.get('/status/:orderCode', checkPaymentStatus);

// Hủy thanh toán (cần đăng nhập)
router.post('/cancel/:orderCode', protect, cancelPayment);

module.exports = router;
