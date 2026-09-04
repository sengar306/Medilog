const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const { protect } = require('../middleware/auth');
const { getUserScope, verifyOwnership } = require('../utils/userScope');

// @desc    Get customer loyalty profile
// @route   GET /loyalty/:customerId
// @access  Private
router.get('/:customerId', protect, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    if (!verifyOwnership(req, customer)) {
      return res.status(403).json({ message: 'Access Denied: You do not own this customer profile' });
    }

    const sales = await Sale.find({ customer: req.params.customerId })
      .sort({ saleDate: -1 })
      .limit(10);

    const totalSalesCount = await Sale.countDocuments({ customer: req.params.customerId });

    let tier = 'Bronze';
    if (customer.totalSpent >= 50000) tier = 'Platinum';
    else if (customer.totalSpent >= 20000) tier = 'Gold';
    else if (customer.totalSpent >= 5000) tier = 'Silver';

    const pointsValue = customer.loyaltyPoints; // 1 point = ₹1

    res.json({
      customer,
      loyalty: {
        points: customer.loyaltyPoints,
        pointsValue,
        tier,
        totalSpent: customer.totalSpent,
        visitCount: customer.visitCount,
        totalSalesCount
      },
      recentSales: sales
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching loyalty profile' });
  }
});

// @desc    Get top customers by loyalty points
// @route   GET /loyalty/leaderboard
// @access  Private
router.get('/top/leaderboard', protect, async (req, res) => {
  try {
    const userScope = getUserScope(req);
    const topCustomers = await Customer.find({ ...userScope, visitCount: { $gt: 0 } })
      .sort({ totalSpent: -1 })
      .limit(10);

    const leaderboard = topCustomers.map((c, idx) => {
      let tier = 'Bronze';
      if (c.totalSpent >= 50000) tier = 'Platinum';
      else if (c.totalSpent >= 20000) tier = 'Gold';
      else if (c.totalSpent >= 5000) tier = 'Silver';

      return {
        rank: idx + 1,
        customer: c,
        tier,
        points: c.loyaltyPoints,
        totalSpent: c.totalSpent,
        visitCount: c.visitCount
      };
    });

    res.json({ leaderboard });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching leaderboard' });
  }
});

// @desc    Manually adjust loyalty points (Admin / Owner)
// @route   POST /loyalty/:customerId/adjust
// @access  Private
router.post('/:customerId/adjust', protect, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    if (!verifyOwnership(req, customer)) {
      return res.status(403).json({ message: 'Access Denied: You cannot adjust points for another user\'s customer' });
    }

    const { points, reason } = req.body;
    if (typeof points !== 'number') {
      return res.status(400).json({ message: 'Points must be a number (positive to add, negative to deduct)' });
    }

    customer.loyaltyPoints += points;
    await customer.save();

    res.json({
      success: true,
      customer,
      adjustment: points,
      reason,
      newBalance: customer.loyaltyPoints
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error adjusting loyalty points' });
  }
});

module.exports = router;
