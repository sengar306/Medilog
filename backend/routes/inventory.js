const express = require('express');
const router = express.Router();
const InventoryBatch = require('../models/InventoryBatch');
const Medicine = require('../models/Medicine');
const StockTransaction = require('../models/StockTransaction');
const { protect } = require('../middleware/auth');

// @desc    Get all inventory batches
// @route   GET /api/inventory
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, medicineId } = req.query;
    let query = { quantity: { $gt: 0 } };

    if (medicineId) {
      query.medicine = medicineId;
    }

    const today = new Date();
    
    if (status === 'expired') {
      query.expiryDate = { $lt: today };
      // For expired items, we might want to list everything, even if quantity is 0 or check only items with stock
      // Let's filter expired items that still have stock
      query.quantity = { $gt: 0 };
    } else if (status === 'near-expiry') {
      const nearExpiryDate = new Date();
      nearExpiryDate.setDate(today.getDate() + 90); // 90 days threshold
      query.expiryDate = { $gte: today, $lte: nearExpiryDate };
      query.quantity = { $gt: 0 };
    } else if (status === 'active') {
      query.expiryDate = { $gte: today };
      query.quantity = { $gt: 0 };
    }

    const batches = await InventoryBatch.find(query)
      .populate({
        path: 'medicine',
        populate: { path: 'rack' }
      })
      .populate('supplier')
      .sort({ expiryDate: 1 }); // Sort by expiry first (FEFO helpful)

    res.json(batches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching inventory batches' });
  }
});

// @desc    Get low stock medicines
// @route   GET /api/inventory/low-stock
// @access  Private
router.get('/low-stock', protect, async (req, res) => {
  try {
    // 1. Get all medicines
    const medicines = await Medicine.find({}).populate('rack');
    
    // 2. Aggregate quantities per medicine from batches that are active and have stock
    const today = new Date();
    const batchAgg = await InventoryBatch.aggregate([
      {
        $match: {
          quantity: { $gt: 0 },
          expiryDate: { $gte: today } // Don't count expired stock as usable stock
        }
      },
      {
        $group: {
          _id: '$medicine',
          totalStock: { $sum: '$quantity' }
        }
      }
    ]);

    // Create a map for quick lookup
    const stockMap = {};
    batchAgg.forEach(item => {
      stockMap[item._id.toString()] = item.totalStock;
    });

    // 3. Filter medicines where total stock < minimum stock level
    const lowStockList = medicines.map(med => {
      const currentStock = stockMap[med._id.toString()] || 0;
      return {
        medicine: med,
        currentStock,
        minStockLevel: med.minStockLevel,
        isLow: currentStock < med.minStockLevel
      };
    }).filter(item => item.isLow);

    res.json(lowStockList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error checking low stock' });
  }
});

// @desc    Get stock transaction ledger
// @route   GET /api/inventory/ledger
// @access  Private
router.get('/ledger', protect, async (req, res) => {
  try {
    const { medicineId } = req.query;
    let query = {};
    if (medicineId) {
      query.medicine = medicineId;
    }

    const transactions = await StockTransaction.find(query)
      .populate('medicine')
      .populate('user', 'username')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching stock ledger' });
  }
});

module.exports = router;
