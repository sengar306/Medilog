const express = require('express');
const router = express.Router();
const InventoryBatch = require('../models/InventoryBatch');
const Medicine = require('../models/Medicine');
const { protect } = require('../middleware/auth');

// In-memory dismissed notifications store (per session)
const dismissedIds = new Set();

// @desc    Get active notifications (low stock + near expiry)
// @route   GET /notifications/active
// @access  Private
router.get('/active', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const ninetyDays = new Date();
    ninetyDays.setDate(ninetyDays.getDate() + 90);

    // 1. Near expiry in 30 days (CRITICAL)
    const criticalExpiry = await InventoryBatch.find({
      quantity: { $gt: 0 },
      expiryDate: { $gte: today, $lte: thirtyDays }
    }).populate('medicine', 'name strength category');

    // 2. Near expiry 31–90 days (WARNING)
    const warningExpiry = await InventoryBatch.find({
      quantity: { $gt: 0 },
      expiryDate: { $gt: thirtyDays, $lte: ninetyDays }
    }).populate('medicine', 'name strength category');

    // 3. Expired with stock
    const expired = await InventoryBatch.find({
      quantity: { $gt: 0 },
      expiryDate: { $lt: today }
    }).populate('medicine', 'name strength category');

    // 4. Low stock
    const medicines = await Medicine.find({});
    const batchAgg = await InventoryBatch.aggregate([
      {
        $match: {
          quantity: { $gt: 0 },
          expiryDate: { $gte: today }
        }
      },
      { $group: { _id: '$medicine', totalStock: { $sum: '$quantity' } } }
    ]);
    const stockMap = {};
    batchAgg.forEach(item => { stockMap[item._id.toString()] = item.totalStock; });

    const lowStockAlerts = medicines
      .filter(m => (stockMap[m._id.toString()] || 0) < m.minStockLevel)
      .map(m => ({
        id: `low-stock-${m._id}`,
        type: 'low_stock',
        severity: 'warning',
        title: 'Low Stock Alert',
        message: `${m.name} ${m.strength || ''} has only ${stockMap[m._id.toString()] || 0} units (min: ${m.minStockLevel})`,
        medicine: { _id: m._id, name: m.name, strength: m.strength, category: m.category },
        currentStock: stockMap[m._id.toString()] || 0,
        minStock: m.minStockLevel
      }));

    const notifications = [
      ...expired.map(b => ({
        id: `expired-${b._id}`,
        type: 'expired',
        severity: 'critical',
        title: 'Expired Stock',
        message: `Batch ${b.batchNumber} of ${b.medicine?.name} expired on ${new Date(b.expiryDate).toLocaleDateString('en-IN')} — ${b.quantity} units remaining`,
        batch: b,
        expiryDate: b.expiryDate
      })),
      ...criticalExpiry.map(b => ({
        id: `near-expiry-critical-${b._id}`,
        type: 'near_expiry_critical',
        severity: 'critical',
        title: 'Expiring in 30 Days',
        message: `Batch ${b.batchNumber} of ${b.medicine?.name} expires ${new Date(b.expiryDate).toLocaleDateString('en-IN')} — ${b.quantity} units`,
        batch: b,
        expiryDate: b.expiryDate
      })),
      ...lowStockAlerts,
      ...warningExpiry.map(b => ({
        id: `near-expiry-warn-${b._id}`,
        type: 'near_expiry_warning',
        severity: 'warning',
        title: 'Expiring within 90 Days',
        message: `Batch ${b.batchNumber} of ${b.medicine?.name} expires ${new Date(b.expiryDate).toLocaleDateString('en-IN')}`,
        batch: b,
        expiryDate: b.expiryDate
      }))
    ].filter(n => !dismissedIds.has(n.id));

    res.json({
      notifications,
      total: notifications.length,
      counts: {
        expired: expired.length,
        criticalExpiry: criticalExpiry.length,
        warningExpiry: warningExpiry.length,
        lowStock: lowStockAlerts.length
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// @desc    Dismiss a notification for this session
// @route   POST /notifications/dismiss/:id
// @access  Private
router.post('/dismiss/:id', protect, (req, res) => {
  dismissedIds.add(req.params.id);
  res.json({ success: true, dismissed: req.params.id });
});

// @desc    Clear all dismissed notifications
// @route   POST /notifications/clear-dismissed
// @access  Private
router.post('/clear-dismissed', protect, (req, res) => {
  dismissedIds.clear();
  res.json({ success: true, message: 'All dismissed notifications cleared' });
});

module.exports = router;
