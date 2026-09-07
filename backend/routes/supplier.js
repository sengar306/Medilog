const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/logger');
const { getUserScope, verifyOwnership } = require('../utils/userScope');

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const query = getUserScope(req);
    const suppliers = await Supplier.find(query).sort({ name: 1 });
    res.json(suppliers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching suppliers' });
  }
});

// @desc    Get single supplier details
// @route   GET /api/suppliers/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    if (!verifyOwnership(req, supplier)) {
      return res.status(403).json({ message: 'Access Denied: You do not own this supplier record' });
    }

    res.json(supplier);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching supplier details' });
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

    const targetUserId = ((req.user.role.name === 'Admin' || req.user.role.name === 'Super Admin') && req.body.userId) ? req.body.userId : req.user._id;

    const escapedName = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const supplierExists = await Supplier.findOne({ 
      name: new RegExp(`^${escapedName}$`, 'i'), 
      user: targetUserId 
    });
    if (supplierExists) {
      return res.status(400).json({ message: 'Supplier with this name already exists in your account' });
    }

    const supplier = new Supplier({
      name: name.trim(),
      user: targetUserId,
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
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Supplier with this name already exists in your account' });
    }
    res.status(500).json({ message: 'Server error creating supplier' });
  }
});

// @desc    Update supplier details
// @route   PUT /api/suppliers/:id
// @access  Private
router.put('/:id', protect, authorize('Admin', 'User'), async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    if (!verifyOwnership(req, supplier)) {
      return res.status(403).json({ message: 'Access Denied: You cannot modify another user\'s supplier' });
    }

    const { name, contactPerson, email, phone, address, gstNumber } = req.body;
    if (name) supplier.name = name;
    if (contactPerson !== undefined) supplier.contactPerson = contactPerson;
    if (email !== undefined) supplier.email = email;
    if (phone !== undefined) supplier.phone = phone;
    if (address !== undefined) supplier.address = address;
    if (gstNumber !== undefined) supplier.gstNumber = gstNumber;

    await supplier.save();

    await logAudit(
      'Update Supplier',
      'Supplier',
      `Updated supplier details for '${supplier.name}'`,
      req.user._id,
      req
    );

    res.json(supplier);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating supplier' });
  }
});

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private
router.delete('/:id', protect, authorize('Admin', 'User'), async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    if (!verifyOwnership(req, supplier)) {
      return res.status(403).json({ message: 'Access Denied: You cannot delete another user\'s supplier' });
    }

    await Supplier.findByIdAndDelete(req.params.id);

    await logAudit(
      'Delete Supplier',
      'Supplier',
      `Deleted supplier '${supplier.name}'`,
      req.user._id,
      req
    );

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting supplier' });
  }
});

module.exports = router;
