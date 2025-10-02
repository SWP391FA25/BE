const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-passwordHash");
      if (!req.user) return res.status(401).json({ message: "User không tồn tại" });

      next();
    } catch (err) {
      return res.status(401).json({ message: "Token không hợp lệ" });
    }
  } else {
    return res.status(401).json({ message: "Không có token, truy cập bị từ chối" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }
    next();
  };
};

module.exports = { protect, authorize };
