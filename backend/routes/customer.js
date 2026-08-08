const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');
const { logAudit } = require('../utils/logger');

// @desc    Get all customers
// @route   GET /customers
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const customers = await Customer.find({}).sort({ name: 1 });
    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching customers' });
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

    if (phone) {
      const exists = await Customer.findOne({ phone });
      if (exists) {
        return res.status(400).json({ message: 'Customer with this phone number already exists' });
      }
    }

    const customer = new Customer({
      name,
      phone,
      email,
      address
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

module.exports = router;
