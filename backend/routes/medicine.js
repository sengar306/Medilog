const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const Rack = require('../models/Rack');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/logger');

// @desc    Get all medicines
// @route   GET /api/medicines
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const medicines = await Medicine.find({}).populate('rack');
    res.json(medicines);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching medicines' });
  }
});

// @desc    Create new medicine
// @route   POST /api/medicines
// @access  Private (Admin, User)
router.post('/', protect, authorize('Admin', 'User'), async (req, res) => {
  try {
    const { name, code, strength, category, genericName, rackId, minStockLevel, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Medicine name is required' });
    }

    const medicineExists = await Medicine.findOne({ name });
    if (medicineExists) {
      return res.status(400).json({ message: 'Medicine with this name already exists' });
    }

    let rack = null;
    if (rackId) {
      rack = await Rack.findById(rackId);
      if (!rack) {
        return res.status(400).json({ message: 'Invalid rack ID' });
      }
    }

    const medicine = new Medicine({
      name,
      code,
      strength,
      category,
      genericName,
      rack: rackId || undefined,
      minStockLevel: minStockLevel || 10,
      description
    });

    const createdMedicine = await medicine.save();
    
    await logAudit(
      'Create Medicine',
      'Medicine',
      `Created medicine '${name}' (${strength || 'N/A'})`,
      req.user._id,
      req
    );

    const populated = await Medicine.findById(createdMedicine._id).populate('rack');
    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating medicine' });
  }
});

// @desc    Get all racks
// @route   GET /api/medicines/racks
// @access  Private
router.get('/racks', protect, async (req, res) => {
  try {
    const racks = await Rack.find({});
    res.json(racks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching racks' });
  }
});

// @desc    Create a new rack
// @route   POST /api/medicines/racks
// @access  Private (Admin, User)
router.post('/racks', protect, authorize('Admin', 'User'), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Rack name is required' });
    }

    const rackExists = await Rack.findOne({ name });
    if (rackExists) {
      return res.status(400).json({ message: 'Rack with this name already exists' });
    }

    const rack = new Rack({
      name,
      description
    });

    const createdRack = await rack.save();
    
    await logAudit(
      'Create Rack',
      'Medicine',
      `Created storage rack '${name}'`,
      req.user._id,
      req
    );

    res.status(201).json(createdRack);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating rack' });
  }
});

module.exports = router;
