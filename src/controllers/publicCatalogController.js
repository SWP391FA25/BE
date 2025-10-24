// Sử dụng collection Vehicle (xe thực tế) thay vì CatalogVehicle
const Vehicle = require("../models/Vehicle");
const Background = require("../models/Background");

// List vehicles with optional filters for type/model/name
const listCatalogVehicles = async (req, res) => {
  try {
    const { type, model, name } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (model) filter.model = model;
    if (name) filter.name = name;
    const vehicles = await Vehicle.find(filter).sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
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

module.exports = {
  listCatalogVehicles,
  getCatalogVehicleById,
  getByIdentifier,
  getBackgrounds,
};


