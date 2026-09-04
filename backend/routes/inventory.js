const express = require('express');
const router = express.Router();
const InventoryBatch = require('../models/InventoryBatch');
const Medicine = require('../models/Medicine');
const StockTransaction = require('../models/StockTransaction');
const { protect } = require('../middleware/auth');
const { getUserScope, verifyOwnership } = require('../utils/userScope');
const mongoose = require('mongoose');

// @desc    Get all inventory batches
// @route   GET /api/inventory
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, medicineId, search } = req.query;
    const userScope = getUserScope(req);
    let query = { ...userScope, quantity: { $gt: 0 } };

    if (medicineId) {
      query.medicine = medicineId;
    }

    if (search) {
      const medSearchQuery = {
        ...userScope,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { genericName: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } }
        ]
      };

      const matchingMedicines = await Medicine.find(medSearchQuery).select('_id');
      const medIds = matchingMedicines.map(m => m._id);

      query.$or = [
        { medicine: { $in: medIds } },
        { batchNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const today = new Date();
    
    if (status === 'expired') {
      query.expiryDate = { $lt: today };
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
        populate: [
          { path: 'rack' },
          { path: 'user', select: 'username email chemistName' }
        ]
      })
      .populate('supplier')
      .populate('user', 'username email chemistName')
      .sort({ expiryDate: 1 });

    res.json(batches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching inventory batches' });
  }
});

// @desc    Get single inventory batch
// @route   GET /api/inventory/batch/:id
// @access  Private
router.get('/batch/:id', protect, async (req, res) => {
  try {
    const batch = await InventoryBatch.findById(req.params.id)
      .populate('medicine')
      .populate('supplier')
      .populate('user', 'username email chemistName');

    if (!batch) {
      return res.status(404).json({ message: 'Inventory batch not found' });
    }

    if (!verifyOwnership(req, batch)) {
      return res.status(403).json({ message: 'Access Denied: You do not own this inventory batch' });
    }

    res.json(batch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching inventory batch' });
  }
});

// @desc    Update inventory batch
// @route   PUT /api/inventory/batch/:id
// @access  Private
router.put('/batch/:id', protect, async (req, res) => {
  try {
    const batch = await InventoryBatch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: 'Inventory batch not found' });
    }

    if (!verifyOwnership(req, batch)) {
      return res.status(403).json({ message: 'Access Denied: You cannot modify another user\'s inventory batch' });
    }

    const { quantity, purchaseRate, mrp, expiryDate } = req.body;
    if (quantity !== undefined) batch.quantity = quantity;
    if (purchaseRate !== undefined) batch.purchaseRate = purchaseRate;
    if (mrp !== undefined) batch.mrp = mrp;
    if (expiryDate !== undefined) batch.expiryDate = new Date(expiryDate);

    await batch.save();
    res.json(batch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating batch' });
  }
});

// @desc    Delete inventory batch
// @route   DELETE /api/inventory/batch/:id
// @access  Private
router.delete('/batch/:id', protect, async (req, res) => {
  try {
    const batch = await InventoryBatch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: 'Inventory batch not found' });
    }

    if (!verifyOwnership(req, batch)) {
      return res.status(403).json({ message: 'Access Denied: You cannot delete another user\'s inventory batch' });
    }

    await InventoryBatch.findByIdAndDelete(req.params.id);
    res.json({ message: 'Inventory batch deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting batch' });
  }
});

// @desc    Get low stock medicines
// @route   GET /api/inventory/low-stock
// @access  Private
router.get('/low-stock', protect, async (req, res) => {
  try {
    const userScope = getUserScope(req);
    let medQuery = { ...userScope };
    let batchMatch = { quantity: { $gt: 0 } };

    if (userScope.user) {
      batchMatch.user = new mongoose.Types.ObjectId(userScope.user);
    }

    // 1. Get all medicines for target user scope
    const medicines = await Medicine.find(medQuery)
      .populate('rack')
      .populate('user', 'username email chemistName');
    
    // 2. Aggregate quantities per medicine from batches that are active and have stock
    const today = new Date();
    batchMatch.expiryDate = { $gte: today };

    const batchAgg = await InventoryBatch.aggregate([
      {
        $match: batchMatch
      },
      {
        $group: {
          _id: '$medicine',
          totalStock: { $sum: '$quantity' }
        }
      }
    ]);

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
    const userScope = getUserScope(req);
    let query = { ...userScope };

    if (medicineId) {
      query.medicine = medicineId;
    }

    const transactions = await StockTransaction.find(query)
      .populate('medicine')
      .populate('user', 'username email chemistName')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching stock ledger' });
  }
});

module.exports = router;
