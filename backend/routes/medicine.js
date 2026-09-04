const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const Rack = require('../models/Rack');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/logger');
const { getUserScope, verifyOwnership } = require('../utils/userScope');

// @desc    Get all medicines
// @route   GET /api/medicines
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const query = getUserScope(req);

    const medicines = await Medicine.find(query)
      .populate('rack')
      .populate('user', 'username email chemistName');

    res.json(medicines);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching medicines' });
  }
});

// @desc    Get all racks (Must be defined BEFORE /:id parameterized route)
// @route   GET /api/medicines/racks
// @access  Private
router.get('/racks', protect, async (req, res) => {
  try {
    const query = getUserScope(req);
    let racks = await Rack.find(query);

    // Auto-seed default racks for user if none exist yet
    if (racks.length === 0 && req.user && req.user._id) {
      const defaultRacks = [
        { name: 'Rack A (Main Shelf)', description: 'Primary drug storage shelf', user: req.user._id },
        { name: 'Rack B (Top Shelf)', description: 'Secondary drug storage shelf', user: req.user._id },
        { name: 'Cold Storage (Refrig)', description: 'Refrigerated storage unit', user: req.user._id }
      ];
      try {
        await Rack.insertMany(defaultRacks);
        racks = await Rack.find(query);
      } catch (err) {
        console.error('Error auto-seeding racks:', err);
      }
    }

    res.json(racks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching racks' });
  }
});

// @desc    Create a new rack (Must be defined BEFORE /:id parameterized route)
// @route   POST /api/medicines/racks
// @access  Private (Admin, User, Chemist)
router.post('/racks', protect, authorize('Admin', 'User', 'Chemist'), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Rack name is required' });
    }

    let targetUserId = req.user._id;
    if (req.user && req.user.role) {
      const rName = typeof req.user.role === 'string' ? req.user.role : (req.user.role.name || '');
      if ((rName === 'Admin' || rName === 'Super Admin') && req.body.userId) {
        targetUserId = req.body.userId;
      }
    }

    const rackExists = await Rack.findOne({ name, user: targetUserId });
    if (rackExists) {
      return res.status(400).json({ message: 'Rack with this name already exists' });
    }

    const rack = new Rack({
      name,
      user: targetUserId,
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

// @desc    Get single medicine details
// @route   GET /api/medicines/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id)
      .populate('rack')
      .populate('user', 'username email chemistName');

    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    if (!verifyOwnership(req, medicine)) {
      return res.status(403).json({ message: 'Access Denied: You do not own this medicine record' });
    }

    res.json(medicine);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching medicine' });
  }
});

// @desc    Create new medicine
// @route   POST /api/medicines
// @access  Private (Admin, User, Chemist)
router.post('/', protect, authorize('Admin', 'User', 'Chemist'), async (req, res) => {
  try {
    const { name, code, strength, category, genericName, rackId, minStockLevel, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Medicine name is required' });
    }

    let targetUserId = req.user._id;
    if (req.user && req.user.role) {
      const rName = typeof req.user.role === 'string' ? req.user.role : (req.user.role.name || '');
      if ((rName === 'Admin' || rName === 'Super Admin') && req.body.userId) {
        targetUserId = req.body.userId;
      }
    }

    const medicineExists = await Medicine.findOne({ name, user: targetUserId });
    if (medicineExists) {
      return res.status(400).json({ message: 'Medicine with this name already exists in inventory' });
    }

    let rack = null;
    if (rackId) {
      rack = await Rack.findById(rackId);
      if (!rack) {
        return res.status(400).json({ message: 'Invalid rack ID' });
      }
      if (!verifyOwnership(req, rack)) {
        return res.status(403).json({ message: 'Access Denied: Selected rack belongs to another user' });
      }
    }

    const medicine = new Medicine({
      name,
      code,
      strength,
      category,
      genericName,
      user: targetUserId,
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

    const populated = await Medicine.findById(createdMedicine._id)
      .populate('rack')
      .populate('user', 'username email chemistName');
      
    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating medicine' });
  }
});

// @desc    Update medicine
// @route   PUT /api/medicines/:id
// @access  Private
router.put('/:id', protect, authorize('Admin', 'User', 'Chemist'), async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    if (!verifyOwnership(req, medicine)) {
      return res.status(403).json({ message: 'Access Denied: You cannot modify another user\'s medicine' });
    }

    const { name, code, strength, category, genericName, rackId, minStockLevel, description } = req.body;
    if (name) medicine.name = name;
    if (code !== undefined) medicine.code = code;
    if (strength !== undefined) medicine.strength = strength;
    if (category !== undefined) medicine.category = category;
    if (genericName !== undefined) medicine.genericName = genericName;
    if (rackId !== undefined) medicine.rack = rackId || undefined;
    if (minStockLevel !== undefined) medicine.minStockLevel = minStockLevel;
    if (description !== undefined) medicine.description = description;

    await medicine.save();

    await logAudit(
      'Update Medicine',
      'Medicine',
      `Updated medicine '${medicine.name}'`,
      req.user._id,
      req
    );

    const populated = await Medicine.findById(medicine._id)
      .populate('rack')
      .populate('user', 'username email chemistName');

    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating medicine' });
  }
});

// @desc    Delete medicine
// @route   DELETE /api/medicines/:id
// @access  Private
router.delete('/:id', protect, authorize('Admin', 'User', 'Chemist'), async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    if (!verifyOwnership(req, medicine)) {
      return res.status(403).json({ message: 'Access Denied: You cannot delete another user\'s medicine' });
    }

    await Medicine.findByIdAndDelete(req.params.id);

    await logAudit(
      'Delete Medicine',
      'Medicine',
      `Deleted medicine '${medicine.name}'`,
      req.user._id,
      req
    );

    res.json({ message: 'Medicine deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting medicine' });
  }
});

module.exports = router;
