const express = require('express');
const router = express.Router();
const PurchaseReturn = require('../models/PurchaseReturn');
const Purchase = require('../models/Purchase');
const InventoryBatch = require('../models/InventoryBatch');
const StockTransaction = require('../models/StockTransaction');
const { protect } = require('../middleware/auth');
const { logAudit } = require('../utils/logger');

// @desc    Get all purchase returns
// @route   GET /purchase-returns
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const returns = await PurchaseReturn.find({})
      .populate('purchase', 'invoiceNumber invoiceDate')
      .populate('supplier', 'name contactPerson phone')
      .populate('processedBy', 'username')
      .sort({ returnDate: -1 });

    res.json({ returns, total: returns.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching purchase returns' });
  }
});

// @desc    Get single purchase return
// @route   GET /purchase-returns/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const ret = await PurchaseReturn.findById(req.params.id)
      .populate('purchase', 'invoiceNumber invoiceDate totalAmount')
      .populate('supplier', 'name contactPerson phone address')
      .populate('processedBy', 'username')
      .populate('items.medicine', 'name strength category');

    if (!ret) return res.status(404).json({ message: 'Purchase return not found' });
    res.json(ret);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching purchase return' });
  }
});

// @desc    Create a new purchase return
// @route   POST /purchase-returns
// @access  Private (Admin, Pharmacist)
router.post('/', protect, async (req, res) => {
  try {
    const { purchaseId, reason, items, remarks } = req.body;

    if (!purchaseId || !items || items.length === 0) {
      return res.status(400).json({ message: 'Purchase reference and return items are required' });
    }

    const purchase = await Purchase.findById(purchaseId).populate('supplier');
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

    const returnNumber = `RTN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const debitNoteNumber = `DN-${Date.now().toString().slice(-8)}`;

    let totalReturnAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const { medicineId, batchNumber, returnQuantity, reason: itemReason } = item;

      if (!medicineId || !batchNumber || !returnQuantity || returnQuantity <= 0) {
        return res.status(400).json({ message: 'Invalid return item data' });
      }

      // Find the inventory batch to get purchaseRate and validate stock
      const batch = await InventoryBatch.findOne({ medicine: medicineId, batchNumber });
      if (!batch) {
        return res.status(404).json({ message: `Batch ${batchNumber} not found for this medicine` });
      }

      if (batch.quantity < returnQuantity) {
        return res.status(400).json({ message: `Cannot return ${returnQuantity} units. Only ${batch.quantity} available in batch ${batchNumber}` });
      }

      const returnAmount = batch.purchaseRate * returnQuantity;
      totalReturnAmount += returnAmount;

      validatedItems.push({
        medicine: medicineId,
        batchNumber,
        returnQuantity,
        purchaseRate: batch.purchaseRate,
        returnAmount: Math.round(returnAmount * 100) / 100,
        reason: itemReason
      });
    }

    // Create the return record
    const purchaseReturn = new PurchaseReturn({
      purchase: purchaseId,
      supplier: purchase.supplier._id,
      returnNumber,
      returnDate: new Date(),
      reason,
      items: validatedItems,
      totalReturnAmount: Math.round(totalReturnAmount * 100) / 100,
      debitNoteNumber,
      processedBy: req.user._id,
      remarks,
      status: 'Approved'
    });

    const saved = await purchaseReturn.save();

    // Revert inventory batch quantities & log stock transactions
    for (const item of validatedItems) {
      const batch = await InventoryBatch.findOne({ medicine: item.medicine, batchNumber: item.batchNumber });
      if (batch) {
        const prevStock = batch.quantity;
        batch.quantity -= item.returnQuantity;
        await batch.save();

        await new StockTransaction({
          medicine: item.medicine,
          batchNumber: item.batchNumber,
          transactionType: 'Return',
          quantity: -item.returnQuantity,
          previousStock: prevStock,
          newStock: batch.quantity,
          referenceId: saved._id,
          referenceType: 'PurchaseReturn',
          remarks: `Returned to supplier — Debit Note #${debitNoteNumber}`,
          user: req.user._id
        }).save();
      }
    }

    await logAudit(
      'Purchase Return Created',
      'PurchaseReturn',
      `Return ${returnNumber} created for purchase ${purchase.invoiceNumber} — ₹${totalReturnAmount}`,
      req.user._id,
      req
    );

    const populated = await PurchaseReturn.findById(saved._id)
      .populate('purchase', 'invoiceNumber')
      .populate('supplier', 'name')
      .populate('items.medicine', 'name strength');

    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error processing purchase return' });
  }
});

// @desc    Update return status
// @route   PATCH /purchase-returns/:id/status
// @access  Private (Admin)
router.patch('/:id/status', protect, async (req, res) => {
  try {
    if (req.user.role.name !== 'Admin') {
      return res.status(403).json({ message: 'Only Admin can update return status' });
    }

    const { status } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updated = await PurchaseReturn.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    ).populate('supplier', 'name').populate('purchase', 'invoiceNumber');

    if (!updated) return res.status(404).json({ message: 'Return not found' });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating return status' });
  }
});

module.exports = router;
