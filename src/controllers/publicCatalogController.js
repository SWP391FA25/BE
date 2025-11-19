// Sử dụng collection Vehicle (xe thực tế) thay vì CatalogVehicle
const Vehicle = require("../models/Vehicle");
const Background = require("../models/Background");
const Station = require("../models/Station");

// List vehicles with optional filters for type/model/name/station
const listCatalogVehicles = async (req, res) => {
  try {
    const { type, model, name, station } = req.query;
    // GUEST can see ALL vehicles (including offline, reserved, rented, maintenance, etc.)
    // Frontend will handle filtering based on login status
    // Build filter - start with empty filter (show all)
    const filterConditions = [];
    
    // Add other filters (but NOT status filter for GUEST)
    if (type) filterConditions.push({ type });
    if (model) filterConditions.push({ model });
    if (name) filterConditions.push({ name });
    if (station) filterConditions.push({ station });
    
    const filter = filterConditions.length > 0 ? { $and: filterConditions } : {};
    
    // First, get total count of all vehicles in DB (for debugging)
    const totalVehiclesInDB = await Vehicle.countDocuments({});
    console.log(`[listCatalogVehicles] Total vehicles in DB: ${totalVehiclesInDB}`);
    
    // Get all vehicles to check status breakdown
    const allVehicles = await Vehicle.find({});
    const allStatusCounts = allVehicles.reduce((acc, v) => {
      const status = v.status || 'null/undefined';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    console.log(`[listCatalogVehicles] All vehicles status breakdown:`, allStatusCounts);
    
    // Now apply filter
    const vehicles = await Vehicle.find(filter).populate("station").sort({ createdAt: -1 });
    
    // Log for debugging
    console.log(`[listCatalogVehicles] Filter applied:`, JSON.stringify(filter, null, 2));
    console.log(`[listCatalogVehicles] Found ${vehicles.length} vehicles (all vehicles, no status filter)`);
    const statusCounts = vehicles.reduce((acc, v) => {
      const status = v.status || 'null/undefined';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    console.log(`[listCatalogVehicles] Filtered vehicles status breakdown:`, statusCounts);
    
    // Log which vehicles are missing (if any)
    if (vehicles.length < totalVehiclesInDB) {
      const filteredVehicleIds = new Set(vehicles.map(v => v._id.toString()));
      const missingVehicles = allVehicles.filter(v => !filteredVehicleIds.has(v._id.toString()));
      console.log(`[listCatalogVehicles] Missing vehicles (${missingVehicles.length}):`, 
        missingVehicles.map(v => ({
          _id: v._id,
          name: v.name,
          model: v.model,
          status: v.status || 'null/undefined'
        }))
      );
    }
    
    res.json(vehicles);
  } catch (err) {
    console.error('[listCatalogVehicles] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get by id
const getCatalogVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const v = await Vehicle.findById(id);
    if (!v) return res.status(404).json({ message: "Không tìm thấy xe" });
    res.json(v);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get by identifier (id | model | name)
const getByIdentifier = async (req, res) => {
  try {
    const { identifier } = req.params;
    if (!identifier) return res.status(400).json({ message: "Thiếu identifier" });
    // try id
    let v = null;
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      v = await Vehicle.findById(identifier);
      if (v) return res.json(v);
    }
    // try model
    v = await Vehicle.findOne({ model: identifier });
    if (v) return res.json(v);
    // try name
    v = await Vehicle.findOne({ name: identifier });
    if (v) return res.json(v);
    return res.status(404).json({ message: "Không tìm thấy xe" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all backgrounds
const getBackgrounds = async (req, res) => {
  try {
    const backgrounds = await Background.find({ isActive: true }).sort({ order: 1 });
    res.json(backgrounds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// List all active stations (public - no auth required)
const listStations = async (req, res) => {
  try {
    const stations = await Station.find({ active: true }).sort({ name: 1 });
    
    // Get vehicle count for each station
    const stationsWithVehicles = await Promise.all(
      stations.map(async (station) => {
        const totalVehicles = await Vehicle.countDocuments({ station: station._id });
        const availableVehicles = await Vehicle.countDocuments({ 
          station: station._id, 
          status: 'available' 
        });
        
        return {
          _id: station._id,
          id: station._id,
          name: station.name,
          address: station.address,
          phone: station.phone,
          location: station.location,
          position: station.location?.coordinates ? [
            station.location.coordinates[1], // lat
            station.location.coordinates[0]  // lng
          ] : null,
          totalVehicles,
          availableVehicles,
          available: `${availableVehicles}/${totalVehicles} xe có sẵn`,
          rating: 4.5 // TODO: Calculate from reviews
        };
      })
    );
    
    res.json(stationsWithVehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get vehicles by station ID
const getVehiclesByStation = async (req, res) => {
  try {
    const { stationId } = req.params;
    const vehicles = await Vehicle.find({ 
      station: stationId,
      status: 'available' // Only show available vehicles
    }).populate("station").sort({ model: 1 });
    
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  listCatalogVehicles,
  getCatalogVehicleById,
  getByIdentifier,
  getBackgrounds,
  listStations,
  getVehiclesByStation,
};


