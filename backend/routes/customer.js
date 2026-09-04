const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');
const { logAudit } = require('../utils/logger');
const { getUserScope, verifyOwnership } = require('../utils/userScope');

// @desc    Get all customers
// @route   GET /customers
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const query = getUserScope(req);
    const customers = await Customer.find(query).sort({ name: 1 });
    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching customers' });
  }
});

// @desc    Get single customer
// @route   GET /customers/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (!verifyOwnership(req, customer)) {
      return res.status(403).json({ message: 'Access Denied: You do not own this customer record' });
    }

    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching customer' });
  }
});

// @desc    Create new customer
// @route   POST /customers
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Customer name is required' });
    }

    const targetUserId = ((req.user.role.name === 'Admin' || req.user.role.name === 'Super Admin') && req.body.userId) ? req.body.userId : req.user._id;

    if (phone) {
      const exists = await Customer.findOne({ phone, user: targetUserId });
      if (exists) {
        return res.status(400).json({ message: 'Customer with this phone number already exists' });
      }
    }

    const customer = new Customer({
      name,
      phone,
      email,
      address,
      user: targetUserId
    });

    const savedCustomer = await customer.save();
    
    await logAudit(
      'Create Customer',
      'Customer',
      `Registered customer '${name}' (${phone || 'No phone'})`,
      req.user._id,
      req
    );

    res.status(201).json(savedCustomer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating customer' });
  }
});

// @desc    Update customer details
// @route   PUT /customers/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (!verifyOwnership(req, customer)) {
      return res.status(403).json({ message: 'Access Denied: You cannot modify another user\'s customer' });
    }

    const { name, phone, email, address } = req.body;
    if (name) customer.name = name;
    if (phone !== undefined) customer.phone = phone;
    if (email !== undefined) customer.email = email;
    if (address !== undefined) customer.address = address;

    await customer.save();
    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating customer' });
  }
});

// @desc    Delete customer
// @route   DELETE /customers/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (!verifyOwnership(req, customer)) {
      return res.status(403).json({ message: 'Access Denied: You cannot delete another user\'s customer' });
    }

    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting customer' });
  }
});

module.exports = router;
