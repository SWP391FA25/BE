// Knowledge Base cho AI Chatbot - EV Station-based Rental System
// Chứa thông tin về quy định, pháp lý, giá thuê, hợp đồng

const KNOWLEDGE_BASE = {
  // Thông tin về dịch vụ
  service: {
    name: "EV Station-based Rental System",
    description: "Hệ thống cho thuê xe điện tại điểm thuê",
    types: ["Thuê xe theo giờ", "Thuê xe theo ngày", "Thuê xe theo tháng"],
  },

  // Quy định thuê xe
  rentalPolicies: {
    // Điều kiện thuê xe
    requirements: {
      age: "Từ 18 tuổi trở lên",
      license: "Phải có bằng lái xe hợp lệ (B1 hoặc B2 tùy loại xe)",
      documents: [
        "CMND/CCCD còn hiệu lực",
        "Bằng lái xe còn hiệu lực",
        "Hộ khẩu hoặc giấy tờ chứng minh nơi cư trú"
      ],
      deposit: "Đặt cọc theo quy định (tùy loại xe, thường 20-30% giá trị xe)"
    },

    // Quy định về quãng đường
    distance: {
      dailyLimit: "300km/ngày (mặc định)",
      overLimitFee: "3.000 - 5.000 VNĐ/km vượt quá",
      unlimited: "Có gói không giới hạn km với phụ phí"
    },

    // Quy định về nhiên liệu/pin
    battery: {
      pickupLevel: "100% khi nhận xe (hoặc theo thỏa thuận)",
      returnLevel: "Trả xe với mức pin tối thiểu 20%",
      chargingFee: "Miễn phí sạc tại các trạm VinFast",
      lowBatteryPenalty: "100.000 - 300.000 VNĐ nếu trả xe dưới 20%"
    },

    // Bảo hiểm
    insurance: {
      basic: "Bảo hiểm bắt buộc TNDS đã bao gồm trong giá thuê",
      comprehensive: "Bảo hiểm vật chất xe: 200.000 - 500.000 VNĐ/ngày (tùy chọn)",
      coverage: "Bảo hiểm không bao gồm: Lốp xe, gầm xe, và các thiệt hại do lái xe trong tình trạng có cồn/ma túy"
    },

    // Chính sách hủy/đổi
    cancellation: {
      before24h: "Hoàn 100% tiền đặt cọc nếu hủy trước 24h",
      before12h: "Hoàn 50% tiền đặt cọc nếu hủy trước 12h",
      lessThan12h: "Không hoàn tiền nếu hủy dưới 12h",
      modification: "Đổi lịch miễn phí 1 lần, lần sau tính phí 100.000 VNĐ"
    },

    // Quy định sử dụng xe
    usage: {
      prohibited: [
        "Không sử dụng xe vào mục đích phi pháp",
        "Không cho thuê lại xe",
        "Không chở quá số người quy định",
        "Không chở hàng hóa cấm",
        "Không đua xe, lái xe tốc độ cao",
        "Không lái xe khi có cồn/ma túy"
      ],
      allowed: [
        "Sử dụng trong lãnh thổ Việt Nam",
        "Đi du lịch, công tác cá nhân",
        "Đi sự kiện (có thông báo trước)"
      ]
    },

    // Vi phạm và phạt
    penalties: {
      lateReturn: "100.000 VNĐ/giờ trễ (giờ đầu), 200.000 VNĐ/giờ (từ giờ thứ 2)",
      smoking: "500.000 - 1.000.000 VNĐ (làm sạch nội thất)",
      damage: "Chi phí sửa chữa thực tế + 20% phí quản lý",
      accident: "Khách hàng chịu 100% nếu không mua bảo hiểm, hoặc theo điều khoản bảo hiểm",
      trafficViolation: "Khách hàng chịu 100% phí vi phạm giao thông",
      theft: "Khách hàng bồi thường 100% giá trị xe nếu không mua bảo hiểm"
    }
  },

  // Bảng giá tham khảo (giá cụ thể lấy từ DB)
  pricing: {
    hourly: {
      description: "Thuê theo giờ",
      minHours: 3,
      note: "Tối thiểu 3 giờ. Giá dao động 50.000 - 300.000 VNĐ/giờ tùy dòng xe"
    },
    daily: {
      description: "Thuê theo ngày",
      note: "Giá dao động 500.000 - 3.000.000 VNĐ/ngày tùy dòng xe. Giảm giá nếu thuê nhiều ngày"
    },
    monthly: {
      description: "Thuê theo tháng",
      note: "Giá dao động 10.000.000 - 50.000.000 VNĐ/tháng tùy dòng xe. Ưu đãi dài hạn"
    },
    deposit: {
      minicar: "3.000.000 - 5.000.000 VNĐ (VF3, VF5)",
      suv: "10.000.000 - 30.000.000 VNĐ (VF6-9)",
      luxury: "30.000.000 - 100.000.000 VNĐ (VF9 Plus, President)"
    }
  },

  // Quy trình thuê xe
  rentalProcess: {
    steps: [
      {
        step: 1,
        title: "Đặt xe online",
        description: "Chọn xe, thời gian, điểm nhận/trả xe trên website"
      },
      {
        step: 2,
        title: "Xác nhận và thanh toán",
        description: "Thanh toán đặt cọc online qua PayOS (VNPay, MoMo, etc.)"
      },
      {
        step: 3,
        title: "Chuẩn bị giấy tờ",
        description: "Mang đầy đủ CMND, bằng lái, giấy tờ cần thiết"
      },
      {
        step: 4,
        title: "Nhận xe tại trạm",
        description: "Kiểm tra xe, ký hợp đồng, nhận chìa khóa"
      },
      {
        step: 5,
        title: "Sử dụng xe",
        description: "Tự do di chuyển trong phạm vi quy định"
      },
      {
        step: 6,
        title: "Trả xe và thanh toán",
        description: "Trả xe đúng giờ, thanh toán phí phát sinh (nếu có)"
      }
    ]
  },

  // Hợp đồng thuê xe
  contract: {
    terms: [
      "Bên A (Bên cho thuê): Hệ thống EV Station-based Rental",
      "Bên B (Bên thuê): Khách hàng",
      "Thời gian thuê: Theo booking",
      "Giá thuê: Theo bảng giá và booking",
      "Đặt cọc: Theo quy định từng dòng xe",
      "Bảo hiểm: Bảo hiểm TNDS bắt buộc đã bao gồm",
      "Trách nhiệm: Khách hàng chịu trách nhiệm về xe trong suốt thời gian thuê",
      "Điều khoản vi phạm: Theo bảng phạt quy định",
      "Giải quyết tranh chấp: Thương lượng, hòa giải, hoặc tòa án"
    ],
    signatureRequired: true,
    legalBasis: [
      "Luật Giao thông đường bộ 2008",
      "Bộ luật Dân sự 2015",
      "Nghị định 100/2019/NĐ-CP về xử phạt vi phạm giao thông"
    ]
  },

  // FAQ
  faq: [
    {
      question: "Tôi cần giấy tờ gì để thuê xe?",
      answer: "Bạn cần: CMND/CCCD, Bằng lái xe (B1/B2), và Hộ khẩu hoặc giấy tờ chứng minh nơi cư trú."
    },
    {
      question: "Có cần đặt cọc không?",
      answer: "Có, bạn cần đặt cọc từ 3-100 triệu VNĐ tùy dòng xe. Cọc sẽ được hoàn lại sau khi trả xe không có vấn đề gì."
    },
    {
      question: "Xe có bảo hiểm không?",
      answer: "Xe đã bao gồm bảo hiểm TNDS bắt buộc. Bạn có thể mua thêm bảo hiểm vật chất xe với 200.000-500.000 VNĐ/ngày."
    },
    {
      question: "Tôi có thể lái xe đi tỉnh không?",
      answer: "Có, bạn có thể lái xe đi bất kỳ đâu trong lãnh thổ Việt Nam trong phạm vi quãng đường quy định."
    },
    {
      question: "Nếu tôi trả xe trễ thì sao?",
      answer: "Bạn sẽ bị phạt 100.000 VNĐ/giờ trễ (giờ đầu) và 200.000 VNĐ/giờ từ giờ thứ 2 trở đi."
    },
    {
      question: "Xe hết pin thì phải làm sao?",
      answer: "Bạn có thể sạc miễn phí tại tất cả các trạm sạc VinFast trên toàn quốc. Hệ thống xe sẽ hiển thị trạm sạc gần nhất."
    },
    {
      question: "Tôi có thể hủy booking không?",
      answer: "Có, bạn được hoàn 100% nếu hủy trước 24h, 50% nếu hủy trước 12h, và không hoàn tiền nếu hủy dưới 12h."
    },
    {
      question: "Xe có giới hạn km không?",
      answer: "Có, mặc định 300km/ngày. Vượt quá sẽ tính phí 3.000-5.000 VNĐ/km. Bạn có thể đăng ký gói không giới hạn."
    }
  ],

  // Contact và support
  support: {
    hotline: "1900-xxxx (24/7)",
    email: "support@evrentalsystem.vn",
    workingHours: "Trạm mở cửa: 6:00 - 22:00 hàng ngày",
    emergencySupport: "Hỗ trợ khẩn cấp 24/7 qua hotline"
  }
};

module.exports = KNOWLEDGE_BASE;
