// AI Context Builder - Xây dựng context cho chatbot từ DB và knowledge base
const Vehicle = require('../models/Vehicle');
const Rental = require('../models/Rental');
const Station = require('../models/Station');
const User = require('../models/User');
const KNOWLEDGE_BASE = require('../config/knowledgeBase');

/**
 * Fetch context từ DB dựa trên user query
 * @param {string} userMessage - Tin nhắn từ user
 * @returns {Promise<Object>} - Context object
 */
async function buildContext(userMessage) {
    const context = {
        knowledgeBase: KNOWLEDGE_BASE,
        vehicleData: null,
        pricingData: null,
        stationData: null,
        rentalStats: null,
        staffData: null,
        vehicleStats: null
    };

    try {
        const messageLower = userMessage.toLowerCase();

        // Nếu hỏi về xe hoặc giá thuê
        if (
            messageLower.includes('xe') ||
            messageLower.includes('giá') ||
            messageLower.includes('thuê') ||
            messageLower.includes('vf') ||
            messageLower.includes('vinfast') ||
            messageLower.includes('sẵn') ||
            messageLower.includes('available') ||
            messageLower.includes('có xe')
        ) {
            // CHỈ lấy xe thực sự AVAILABLE và ĐÃ được phân công trạm
            const vehicles = await Vehicle.find({
                status: 'available',
                isOutOfStock: false,
                station: { $ne: null } // CHỈ lấy xe đã có trạm
            })
            .select('name brand model type pricePerHour pricePerDay pricePerMonth seatingCapacity range features status licensePlate station')
            .populate('station', 'name address')
            .limit(20)
            .lean();

            console.log(`[AI Context] 📊 Found ${vehicles.length} available vehicles (with station assigned)`);
            context.vehicleData = vehicles;
        }

        // Nếu hỏi về trạm/địa điểm
        if (
            messageLower.includes('trạm') ||
            messageLower.includes('địa điểm') ||
            messageLower.includes('chỗ') ||
            messageLower.includes('đâu')
        ) {
            const stations = await Station.find({ isActive: true })
            .select('name address city phone')
            .limit(10)
            .lean();

            context.stationData = stations;
        }

        // Nếu hỏi về bảng giá tổng quan
        if (
            messageLower.includes('bảng giá') ||
            messageLower.includes('giá cả') ||
            messageLower.includes('chi phí')
        ) {
            const pricingStats = await Vehicle.aggregate([
                { $match: { status: 'available' } },
                {
                    $group: {
                        _id: '$type',
                        minPricePerHour: { $min: '$pricePerHour' },
                        maxPricePerHour: { $max: '$pricePerHour' },
                        minPricePerDay: { $min: '$pricePerDay' },
                        maxPricePerDay: { $max: '$pricePerDay' },
                        minPricePerMonth: { $min: '$pricePerMonth' },
                        maxPricePerMonth: { $max: '$pricePerMonth' }
                    }
                }
            ]);

            context.pricingData = pricingStats;
        }

        // Nếu hỏi về thống kê xe hoặc tình trạng
        if (
            messageLower.includes('thống kê') ||
            messageLower.includes('tổng số') ||
            messageLower.includes('bao nhiêu xe') ||
            messageLower.includes('có mấy') ||
            messageLower.includes('đang thuê') ||
            messageLower.includes('đang bảo trì')
        ) {
            // Thống kê xe theo trạng thái
            const vehicleStats = await Vehicle.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        models: { $push: '$model' }
                    }
                }
            ]);

            console.log(`[AI Context] 📈 Vehicle stats loaded`);
            context.vehicleStats = vehicleStats;
        }

        // Nếu hỏi về nhân viên hoặc admin
        if (
            messageLower.includes('nhân viên') ||
            messageLower.includes('staff') ||
            messageLower.includes('admin') ||
            messageLower.includes('quản lý')
        ) {
            // Query User với role staff hoặc admin
            const staffCount = await User.countDocuments({
                role: { $in: ['staff', 'admin'] }
            });

            const staffList = await User.find({
                role: { $in: ['staff', 'admin'] }
            })
            .select('fullName email phone role stationId')
            .populate('stationId', 'name')
            .limit(10)
            .lean();

            context.staffData = {
                count: staffCount,
                list: staffList
            };

            console.log(`[AI Context] 👥 Staff/Admin data loaded: ${staffCount} users`);
        }

        // Nếu hỏi về đơn thuê hoặc booking
        if (
            messageLower.includes('đơn thuê') ||
            messageLower.includes('booking') ||
            messageLower.includes('đặt xe') ||
            messageLower.includes('rental')
        ) {
            // Thống kê rental theo status
            const rentalStats = await Rental.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$totalAmount' }
                    }
                }
            ]);

            // Đơn thuê gần đây
            const recentRentals = await Rental.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select('status totalAmount createdAt')
                .populate('vehicle', 'name model')
                .lean();

            context.rentalStats = {
                stats: rentalStats,
                recent: recentRentals
            };

            console.log(`[AI Context] 📋 Rental stats loaded`);
        }

    } catch (error) {
        console.error('[AI Context] ❌ Error building context:', error);
        // Không throw error, vẫn trả về context cơ bản
    }

    return context;
}

/**
 * Format context thành prompt text cho AI
 * @param {Object} context - Context object từ buildContext()
 * @returns {string} - Formatted prompt
 */
function formatContextForPrompt(context) {
    let prompt = `# Hệ Thống Thông Tin\n\n`;

    // 1. Quy định thuê xe
    prompt += `## QUY ĐỊNH THUÊ XE\n\n`;

    prompt += `### Điều kiện thuê xe:\n`;
    prompt += `- Độ tuổi: ${context.knowledgeBase.rentalPolicies.requirements.age}\n`;
    prompt += `- Bằng lái: ${context.knowledgeBase.rentalPolicies.requirements.license}\n`;
    prompt += `- Giấy tờ cần thiết:\n`;
    context.knowledgeBase.rentalPolicies.requirements.documents.forEach(doc => {
        prompt += `  + ${doc}\n`;
    });
    prompt += `- Đặt cọc: ${context.knowledgeBase.rentalPolicies.requirements.deposit}\n\n`;

    prompt += `### Quy định về quãng đường:\n`;
    prompt += `- Giới hạn: ${context.knowledgeBase.rentalPolicies.distance.dailyLimit}\n`;
    prompt += `- Phí vượt: ${context.knowledgeBase.rentalPolicies.distance.overLimitFee}\n\n`;

    prompt += `### Quy định về pin:\n`;
    prompt += `- Nhận xe: ${context.knowledgeBase.rentalPolicies.battery.pickupLevel}\n`;
    prompt += `- Trả xe: ${context.knowledgeBase.rentalPolicies.battery.returnLevel}\n`;
    prompt += `- Sạc điện: ${context.knowledgeBase.rentalPolicies.battery.chargingFee}\n`;
    prompt += `- Phạt pin thấp: ${context.knowledgeBase.rentalPolicies.battery.lowBatteryPenalty}\n\n`;

    prompt += `### Bảo hiểm:\n`;
    prompt += `- Cơ bản: ${context.knowledgeBase.rentalPolicies.insurance.basic}\n`;
    prompt += `- Toàn diện: ${context.knowledgeBase.rentalPolicies.insurance.comprehensive}\n`;
    prompt += `- Không bao gồm: ${context.knowledgeBase.rentalPolicies.insurance.coverage}\n\n`;

    prompt += `### Chính sách hủy/đổi:\n`;
    prompt += `- Trước 24h: ${context.knowledgeBase.rentalPolicies.cancellation.before24h}\n`;
    prompt += `- Trước 12h: ${context.knowledgeBase.rentalPolicies.cancellation.before12h}\n`;
    prompt += `- Dưới 12h: ${context.knowledgeBase.rentalPolicies.cancellation.lessThan12h}\n`;
    prompt += `- Đổi lịch: ${context.knowledgeBase.rentalPolicies.cancellation.modification}\n\n`;

    prompt += `### Vi phạm và phạt:\n`;
    prompt += `- Trả xe trễ: ${context.knowledgeBase.rentalPolicies.penalties.lateReturn}\n`;
    prompt += `- Hút thuốc: ${context.knowledgeBase.rentalPolicies.penalties.smoking}\n`;
    prompt += `- Hư hỏng: ${context.knowledgeBase.rentalPolicies.penalties.damage}\n`;
    prompt += `- Tai nạn: ${context.knowledgeBase.rentalPolicies.penalties.accident}\n`;
    prompt += `- Vi phạm giao thông: ${context.knowledgeBase.rentalPolicies.penalties.trafficViolation}\n\n`;

    // 2. Bảng giá
    prompt += `## BẢNG GIÁ\n\n`;
    prompt += `### Thuê theo giờ:\n`;
    prompt += `- ${context.knowledgeBase.pricing.hourly.description}\n`;
    prompt += `- ${context.knowledgeBase.pricing.hourly.note}\n\n`;

    prompt += `### Thuê theo ngày:\n`;
    prompt += `- ${context.knowledgeBase.pricing.daily.note}\n\n`;

    prompt += `### Thuê theo tháng:\n`;
    prompt += `- ${context.knowledgeBase.pricing.monthly.note}\n\n`;

    prompt += `### Đặt cọc theo loại xe:\n`;
    prompt += `- Minicar (VF3, VF5): ${context.knowledgeBase.pricing.deposit.minicar}\n`;
    prompt += `- SUV (VF6-9): ${context.knowledgeBase.pricing.deposit.suv}\n`;
    prompt += `- Cao cấp: ${context.knowledgeBase.pricing.deposit.luxury}\n\n`;

    // 3. Dữ liệu xe từ DB (nếu có)
    if (context.vehicleData && context.vehicleData.length > 0) {
        prompt += `## DANH SÁCH XE THỰC SỰ SẴN SÀNG CHO THUÊ (${context.vehicleData.length} xe)\n\n`;
        prompt += `**LƯU Ý QUAN TRỌNG**: Chỉ liệt kê xe thỏa mãn TẤT CẢ điều kiện sau:\n`;
        prompt += `- status="available" (sẵn sàng)\n`;
        prompt += `- isOutOfStock=false (không hết hàng)\n`;
        prompt += `- station != null (ĐÃ được phân công trạm)\n`;
        prompt += `KHÔNG đếm xe: reserved, rented, maintenance, hoặc CHƯA có trạm.\n\n`;

        context.vehicleData.forEach((vehicle, index) => {
            prompt += `${index + 1}. **${vehicle.name}** (${vehicle.model})\n`;
            prompt += `   - Biển số: ${vehicle.licensePlate}\n`;
            prompt += `   - Loại: ${vehicle.type}\n`;
            prompt += `   - Số chỗ: ${vehicle.seatingCapacity} chỗ\n`;
            prompt += `   - Giá giờ: ${vehicle.pricePerHour.toLocaleString('vi-VN')} VNĐ\n`;
            prompt += `   - Giá ngày: ${vehicle.pricePerDay.toLocaleString('vi-VN')} VNĐ\n`;
            prompt += `   - Giá tháng: ${vehicle.pricePerMonth.toLocaleString('vi-VN')} VNĐ\n`;
            prompt += `   - Tầm hoạt động: ${vehicle.range || 'N/A'}\n`;
            if (vehicle.station) {
                prompt += `   - Trạm: ${vehicle.station.name}\n`;
            }
            prompt += `   - Trạng thái: SẴN SÀNG\n\n`;
        });

        prompt += `**TỔNG SỐ XE SẴN SÀNG: ${context.vehicleData.length} xe**\n\n`;
    }

    // 4. Bảng giá theo loại xe từ DB (nếu có)
    if (context.pricingData && context.pricingData.length > 0) {
        prompt += `## BẢNG GIÁ THEO LOẠI XE\n\n`;
        context.pricingData.forEach(pricing => {
            prompt += `**${pricing._id}:**\n`;
            prompt += `- Giá giờ: ${pricing.minPricePerHour.toLocaleString('vi-VN')} - ${pricing.maxPricePerHour.toLocaleString('vi-VN')} VNĐ\n`;
            prompt += `- Giá ngày: ${pricing.minPricePerDay.toLocaleString('vi-VN')} - ${pricing.maxPricePerDay.toLocaleString('vi-VN')} VNĐ\n`;
            prompt += `- Giá tháng: ${pricing.minPricePerMonth.toLocaleString('vi-VN')} - ${pricing.maxPricePerMonth.toLocaleString('vi-VN')} VNĐ\n\n`;
        });
    }

    // 5. Trạm thuê xe (nếu có)
    if (context.stationData && context.stationData.length > 0) {
        prompt += `## CÁC TRẠM THUÊ XE\n\n`;
        context.stationData.forEach((station, index) => {
            prompt += `${index + 1}. **${station.name}**\n`;
            prompt += `   - Địa chỉ: ${station.address}\n`;
            prompt += `   - Thành phố: ${station.city}\n`;
            prompt += `   - Hotline: ${station.phone}\n\n`;
        });
    }

    // 5a. Thống kê xe theo trạng thái (nếu có)
    if (context.vehicleStats && context.vehicleStats.length > 0) {
        prompt += `## THỐNG KÊ XE THEO TRẠNG THÁI\n\n`;
        context.vehicleStats.forEach(stat => {
            const statusName = {
                'available': 'Sẵn sàng',
                'rented': 'Đang cho thuê',
                'reserved': 'Đã đặt trước',
                'maintenance': 'Đang bảo trì',
                'offline': 'Offline',
                'out_of_stock': 'Hết xe'
            }[stat._id] || stat._id;

            prompt += `- **${statusName}**: ${stat.count} xe\n`;
        });
        prompt += `\n`;
    }

    // 5b. Thông tin nhân viên và admin (nếu có)
    if (context.staffData) {
        prompt += `## THÔNG TIN NHÂN VIÊN VÀ QUẢN LÝ\n\n`;
        prompt += `- Tổng số nhân viên & quản lý: ${context.staffData.count}\n\n`;

        if (context.staffData.list && context.staffData.list.length > 0) {
            prompt += `Danh sách:\n`;
            context.staffData.list.forEach((user, index) => {
                const roleText = {
                    'admin': 'Quản trị viên',
                    'staff': 'Nhân viên',
                    'renter': 'Khách hàng'
                }[user.role] || user.role;

                prompt += `${index + 1}. **${user.fullName}** - ${roleText}\n`;
                prompt += `   - Email: ${user.email}\n`;
                if (user.phone) {
                    prompt += `   - Phone: ${user.phone}\n`;
                }
                if (user.stationId) {
                    prompt += `   - Trạm phụ trách: ${user.stationId.name}\n`;
                }
                prompt += `\n`;
            });
        }
    }

    // 5c. Thống kê đơn thuê (nếu có)
    if (context.rentalStats) {
        prompt += `## THỐNG KÊ ĐƠN THUÊ\n\n`;

        if (context.rentalStats.stats && context.rentalStats.stats.length > 0) {
            prompt += `Theo trạng thái:\n`;
            context.rentalStats.stats.forEach(stat => {
                const statusName = {
                    'reserved': 'Đã đặt',
                    'confirmed': 'Đã xác nhận',
                    'ongoing': 'Đang thuê',
                    'completed': 'Hoàn thành',
                    'cancelled': 'Đã hủy'
                }[stat._id] || stat._id;

                prompt += `- **${statusName}**: ${stat.count} đơn`;
                if (stat.totalAmount) {
                    prompt += ` (Tổng: ${stat.totalAmount.toLocaleString('vi-VN')} VNĐ)`;
                }
                prompt += `\n`;
            });
            prompt += `\n`;
        }

        if (context.rentalStats.recent && context.rentalStats.recent.length > 0) {
            prompt += `Đơn thuê gần đây:\n`;
            context.rentalStats.recent.forEach((rental, index) => {
                const vehicleName = rental.vehicle ? rental.vehicle.name : 'N/A';
                const statusName = {
                    'reserved': 'Đã đặt',
                    'confirmed': 'Đã xác nhận',
                    'ongoing': 'Đang thuê',
                    'completed': 'Hoàn thành',
                    'cancelled': 'Đã hủy'
                }[rental.status] || rental.status;

                prompt += `${index + 1}. ${vehicleName} - ${statusName}`;
                if (rental.totalAmount) {
                    prompt += ` - ${rental.totalAmount.toLocaleString('vi-VN')} VNĐ`;
                }
                prompt += `\n`;
            });
            prompt += `\n`;
        }
    }

    // 6. Quy trình thuê xe
    prompt += `## QUY TRÌNH THUÊ XE\n\n`;
    context.knowledgeBase.rentalProcess.steps.forEach(step => {
        prompt += `**Bước ${step.step}: ${step.title}**\n`;
        prompt += `${step.description}\n\n`;
    });

    // 7. Hợp đồng
    prompt += `## HỢP ĐỒNG THUÊ XE\n\n`;
    prompt += `### Các điều khoản chính:\n`;
    context.knowledgeBase.contract.terms.forEach(term => {
        prompt += `- ${term}\n`;
    });
    prompt += `\n### Cơ sở pháp lý:\n`;
    context.knowledgeBase.contract.legalBasis.forEach(law => {
        prompt += `- ${law}\n`;
    });
    prompt += `\n`;

    // 8. Liên hệ và hỗ trợ
    prompt += `## LIÊN HỆ VÀ HỖ TRỢ\n\n`;
    prompt += `- Hotline: ${context.knowledgeBase.support.hotline}\n`;
    prompt += `- Email: ${context.knowledgeBase.support.email}\n`;
    prompt += `- Giờ làm việc: ${context.knowledgeBase.support.workingHours}\n`;
    prompt += `- Hỗ trợ khẩn cấp: ${context.knowledgeBase.support.emergencySupport}\n\n`;

    return prompt;
}

module.exports = {
    buildContext,
    formatContextForPrompt
};
