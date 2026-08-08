const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const PurchaseItem = require('../models/PurchaseItem');
const InventoryBatch = require('../models/InventoryBatch');
const Medicine = require('../models/Medicine');
const StockTransaction = require('../models/StockTransaction');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/logger');

// @desc    Get all purchases
// @route   GET /api/purchase/list
// @access  Private
router.get('/list', protect, async (req, res) => {
  try {
    const purchases = await Purchase.find({}).populate('supplier').sort({ createdAt: -1 });
    res.json(purchases);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching purchases' });
  }
});

// @desc    Get a specific purchase details
// @route   GET /api/purchase/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id).populate('supplier');
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase record not found' });
    }
    const items = await PurchaseItem.find({ purchase: purchase._id }).populate('medicine');
    res.json({ purchase, items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching purchase details' });
  }
});

// @desc    Create a new purchase (manually or confirmed from parser)
// @route   POST /api/purchase
// @access  Private (Admin, User)
router.post('/', protect, authorize('Admin', 'User'), async (req, res) => {
  try {
    const { supplierId, invoiceNumber, invoiceDate, items, remarks } = req.body;

    if (!supplierId || !invoiceNumber || !items || items.length === 0) {
      return res.status(400).json({ message: 'Please provide supplierId, invoiceNumber, and items' });
    }

    // 1. Calculate totals
    let subTotal = 0;
    let gstTotal = 0;
    let totalAmount = 0;

    const validatedItems = [];

    for (const item of items) {
      const { medicineId, batchNumber, expiryDate, quantity, purchaseRate, mrp, gstPercent } = item;
      
      if (!medicineId || !batchNumber || !expiryDate || !quantity || purchaseRate === undefined || mrp === undefined) {
        return res.status(400).json({ message: 'Missing fields in one or more items' });
      }

      const medicine = await Medicine.findById(medicineId);
      if (!medicine) {
        return res.status(400).json({ message: `Medicine not found: ${medicineId}` });
      }

      const qty = parseFloat(quantity);
      const rate = parseFloat(purchaseRate);
      const m = parseFloat(mrp);
      const gstP = parseFloat(gstPercent || 0);

      const itemSubtotal = qty * rate;
      const itemGst = itemSubtotal * (gstP / 100);
      const itemTotal = itemSubtotal + itemGst;

      subTotal += itemSubtotal;
      gstTotal += itemGst;
      totalAmount += itemTotal;

      validatedItems.push({
        medicineId,
        batchNumber,
        expiryDate: new Date(expiryDate),
        quantity: qty,
        purchaseRate: rate,
        mrp: m,
        gstPercent: gstP,
        gstAmount: itemGst,
        totalAmount: itemTotal,
      });
    }

    // 2. Create Purchase record
    const purchase = new Purchase({
      supplier: supplierId,
      invoiceNumber,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      subTotal: Math.round(subTotal * 100) / 100,
      gstTotal: Math.round(gstTotal * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      status: 'Completed',
      remarks,
    });

    const savedPurchase = await purchase.save();

    // 3. Process each item: Save PurchaseItem, update InventoryBatch, write StockTransaction
    for (const item of validatedItems) {
      // Save PurchaseItem
      const pItem = new PurchaseItem({
        purchase: savedPurchase._id,
        medicine: item.medicineId,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        quantity: item.quantity,
        purchaseRate: item.purchaseRate,
        mrp: item.mrp,
        gstPercent: item.gstPercent,
        gstAmount: Math.round(item.gstAmount * 100) / 100,
        totalAmount: Math.round(item.totalAmount * 100) / 100,
      });
      await pItem.save();

      // Find or create InventoryBatch
      let batch = await InventoryBatch.findOne({
        medicine: item.medicineId,
        batchNumber: item.batchNumber,
      });

      let prevStock = 0;
      if (batch) {
        prevStock = batch.quantity;
        batch.quantity += item.quantity;
        // Update batch parameters if they changed (optional, MRP/Expiry should match)
        batch.expiryDate = item.expiryDate;
        batch.purchaseRate = item.purchaseRate;
        batch.mrp = item.mrp;
        batch.gstPercent = item.gstPercent;
        batch.supplier = supplierId;
      } else {
        batch = new InventoryBatch({
          medicine: item.medicineId,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
          initialQuantity: item.quantity,
          purchaseRate: item.purchaseRate,
          mrp: item.mrp,
          gstPercent: item.gstPercent,
          supplier: supplierId,
        });
      }
      const savedBatch = await batch.save();

      // Write StockTransaction
      const transaction = new StockTransaction({
        medicine: item.medicineId,
        batchNumber: item.batchNumber,
        transactionType: 'Purchase',
        quantity: item.quantity,
        previousStock: prevStock,
        newStock: savedBatch.quantity,
        referenceId: savedPurchase._id,
        referenceType: 'Purchase',
        remarks: `Purchased via Invoice #${invoiceNumber}`,
        user: req.user._id,
      });
      await transaction.save();
    }

    await logAudit(
      'Purchase Completed',
      'Purchase',
      `Processed purchase invoice #${invoiceNumber} for total ${savedPurchase.totalAmount}`,
      req.user._id,
      req
    );

    res.status(201).json({ purchase: savedPurchase, items: validatedItems });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate purchase invoice for this supplier' });
    }
    res.status(500).json({ message: 'Server error processing purchase' });
  }
});

module.exports = router;
