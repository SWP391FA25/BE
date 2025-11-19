const Vehicle = require("../models/Vehicle");
const { mapResponseData } = require("../middleware/vehicleFieldMapper");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename: remove special characters, keep extension
    const sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .toLowerCase();
    const uniqueName = `${Date.now()}-${sanitizedName}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  // Extended list of supported image formats
  const allowedTypes = [
    "image/jpeg",       // .jpg, .jpeg
    "image/png",        // .png
    "image/webp",       // .webp (modern, efficient)
    "image/gif",        // .gif (animated support)
    "image/svg+xml",    // .svg (vector graphics)
    "image/avif",       // .avif (next-gen format)
    "image/heic",       // .heic (iPhone photos)
    "image/heif",       // .heif (high efficiency)
    "image/bmp",        // .bmp (bitmap)
    "image/tiff",       // .tiff, .tif
    "image/x-icon",     // .ico (icons)
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Định dạng không được hỗ trợ: ${file.mimetype}. Chỉ chấp nhận: JPG, PNG, WebP, GIF, SVG, AVIF, HEIC, BMP, TIFF`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 10 * 1024 * 1024,  // 10MB per file (increased from 5MB)
    files: 20                     // Max 20 files per request
  },
});

/**
 * Upload images for a vehicle
 * POST /api/admin/vehicles/:id/images
 */
const uploadVehicleImages = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findById(id);
    
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle không tồn tại" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Không có file nào được upload" });
    }

    // Add new image paths to imageGallery
    const newImages = req.files.map((file) => `/uploads/${file.filename}`);
    
    if (!vehicle.imageGallery) {
      vehicle.imageGallery = [];
    }
    
    vehicle.imageGallery.push(...newImages);
    
    // If no main image, set first uploaded image as main
    if (!vehicle.image && newImages.length > 0) {
      vehicle.image = newImages[0];
    }
    
    await vehicle.save();
    
    // Map to frontend format
    const responseData = mapResponseData(vehicle);
    res.json(responseData);
  } catch (err) {
    console.error("Error uploading images:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete an image from a vehicle
 * DELETE /api/admin/vehicles/:id/images
 */
const deleteVehicleImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ message: "Thiếu thông tin ảnh cần xóa" });
    }

    const vehicle = await Vehicle.findById(id);
    
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle không tồn tại" });
    }

    // Remove from imageGallery
    if (vehicle.imageGallery) {
      vehicle.imageGallery = vehicle.imageGallery.filter((img) => img !== image);
    }
    
    // If deleting main image, set another one
    if (vehicle.image === image) {
      vehicle.image = vehicle.imageGallery && vehicle.imageGallery.length > 0 
        ? vehicle.imageGallery[0] 
        : null;
    }
    
    // Delete file from filesystem
    try {
      const filePath = path.join(__dirname, "../../", image);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileErr) {
      console.error("Error deleting file:", fileErr);
      // Continue even if file deletion fails
    }
    
    await vehicle.save();
    
    // Map to frontend format
    const responseData = mapResponseData(vehicle);
    res.json(responseData);
  } catch (err) {
    console.error("Error deleting image:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  upload,
  uploadVehicleImages,
  deleteVehicleImage,
};
