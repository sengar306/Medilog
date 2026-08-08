const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/logger');

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const suppliers = await Supplier.find({});
    res.json(suppliers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching suppliers' });
  }
});

// @desc    Create new supplier
// @route   POST /api/suppliers
// @access  Private (Admin, User)
router.post('/', protect, authorize('Admin', 'User'), async (req, res) => {
  try {
    const { name, contactPerson, email, phone, address, gstNumber } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Supplier name is required' });
    }

    const supplierExists = await Supplier.findOne({ name });
    if (supplierExists) {
      return res.status(400).json({ message: 'Supplier with this name already exists' });
    }

    const supplier = new Supplier({
      name,
      contactPerson,
      email,
      phone,
      address,
      gstNumber
    });

    const createdSupplier = await supplier.save();
    
    await logAudit(
      'Create Supplier',
      'Supplier',
      `Registered supplier '${name}'`,
      req.user._id,
      req
    );

    res.status(201).json(createdSupplier);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating supplier' });
  }
});

module.exports = router;
