/**
 * Middleware để map field names giữa Frontend và Backend cho Vehicle
 * Frontend sử dụng naming khác Backend model
 */

// Map từ Frontend field names sang Backend field names
const frontendToBackendMap = {
  plateNumber: 'licensePlate',
  seats: 'seatingCapacity',
  hourlyRate: 'pricePerHour',
  dailyRate: 'pricePerDay',
  monthlyRate: 'pricePerMonth',
  maxRange: 'range',
  vehicleType: 'type',
  images: 'imageGallery',
  depositAmount: 'rentalConditions.depositVND'
  // name, brand, model, year, color không cần map vì giống nhau
};

// Map từ Backend field names sang Frontend field names
const backendToFrontendMap = {
  licensePlate: 'plateNumber',
  seatingCapacity: 'seats',
  pricePerHour: 'hourlyRate',
  pricePerDay: 'dailyRate',
  pricePerMonth: 'monthlyRate',
  range: 'maxRange',
  type: 'vehicleType',
  imageGallery: 'images'
};

/**
 * Convert Frontend payload to Backend format
 */
const mapFrontendToBackend = (frontendData) => {
  const backendData = { ...frontendData };
  
  Object.keys(frontendToBackendMap).forEach(frontendKey => {
    if (frontendData.hasOwnProperty(frontendKey)) {
      const backendKey = frontendToBackendMap[frontendKey];
      
      // Handle nested fields (like rentalConditions.depositVND)
      if (backendKey.includes('.')) {
        const [parent, child] = backendKey.split('.');
        if (!backendData[parent]) backendData[parent] = {};
        backendData[parent][child] = frontendData[frontendKey];
      } else {
        backendData[backendKey] = frontendData[frontendKey];
      }
      
      // Remove frontend key if it's different from backend key
      if (frontendKey !== backendKey && !backendKey.includes('.')) {
        delete backendData[frontendKey];
      }
    }
  });
  
  return backendData;
};

/**
 * Convert Backend document to Frontend format
 */
const mapBackendToFrontend = (backendDoc) => {
  if (!backendDoc) return null;
  
  // Convert mongoose document to plain object
  const backendData = backendDoc.toObject ? backendDoc.toObject() : { ...backendDoc };
  const frontendData = { ...backendData };
  
  Object.keys(backendToFrontendMap).forEach(backendKey => {
    if (backendData.hasOwnProperty(backendKey)) {
      const frontendKey = backendToFrontendMap[backendKey];
      frontendData[frontendKey] = backendData[backendKey];
      
      // Keep both keys for compatibility
      // delete frontendData[backendKey];
    }
  });
  
  // Handle nested rentalConditions.depositVND -> depositAmount
  if (backendData.rentalConditions?.depositVND) {
    frontendData.depositAmount = backendData.rentalConditions.depositVND;
  }
  
  // Handle depositPolicy
  if (backendData.rentalConditions?.payment?.terms) {
    frontendData.depositPolicy = backendData.rentalConditions.payment.terms;
  }
  
  // Ensure imageGallery is mapped to images
  if (backendData.imageGallery && !frontendData.images) {
    frontendData.images = backendData.imageGallery;
  }
  
  // If no images array but has image, create array with single image
  if (!frontendData.images && backendData.image) {
    frontendData.images = [backendData.image];
  }
  
  return frontendData;
};

/**
 * Middleware to map request body from frontend to backend
 */
const mapRequestBody = (req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    req.body = mapFrontendToBackend(req.body);
  }
  next();
};

/**
 * Helper to map response data from backend to frontend
 */
const mapResponseData = (data) => {
  if (Array.isArray(data)) {
    return data.map(item => mapBackendToFrontend(item));
  }
  return mapBackendToFrontend(data);
};

module.exports = {
  mapFrontendToBackend,
  mapBackendToFrontend,
  mapRequestBody,
  mapResponseData
};

