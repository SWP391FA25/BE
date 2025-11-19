const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/contractController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Apply authentication middleware to all routes
router.use(protect);

// Contract CRUD
router.post("/create", ctrl.createContractFromRental); // Tạo hợp đồng tự động từ rental (sau thanh toán)
router.post("/", ctrl.createContract); // Tạo hợp đồng mới manual (cho admin/staff)
router.get("/", authorize("admin", "staff"), ctrl.getAllContracts); // Lấy tất cả hợp đồng (Admin/Staff)
router.get("/customer/:customerId", ctrl.getCustomerContracts); // Lấy hợp đồng của khách hàng
router.get("/:id", ctrl.getContractById); // Lấy chi tiết hợp đồng
router.put("/:id/status", authorize("admin", "staff"), ctrl.updateContractStatus); // Cập nhật trạng thái (Admin/Staff)
router.put("/:id/cancel", ctrl.cancelContract); // Hủy hợp đồng
router.post("/:id/sign", ctrl.signContract); // Ký hợp đồng điện tử

// Statistics
router.get("/stats/overview", ctrl.getContractStats); // Thống kê hợp đồng

module.exports = router;