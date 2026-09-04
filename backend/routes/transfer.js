const express = require('express');
const router = express.Router();
const MedicineTransfer = require('../models/MedicineTransfer');
const Medicine = require('../models/Medicine');
const InventoryBatch = require('../models/InventoryBatch');
const StockTransaction = require('../models/StockTransaction');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/logger');

// @desc    Get all transfers (Incoming & Outgoing)
// @route   GET /api/transfers
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const transfers = await MedicineTransfer.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
      .populate('sender', 'username email chemistName')
      .populate('receiver', 'username email chemistName')
      .populate('medicine')
      .sort({ createdAt: -1 });

    res.json(transfers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching medicine transfers' });
  }
});

// @desc    Initiate a new medicine transfer
// @route   POST /api/transfers
// @access  Private (Admin, User, Chemist)
router.post('/', protect, authorize('Admin', 'User', 'Chemist'), async (req, res) => {
  try {
    const { receiverId, medicineId, batchNumber, quantity, remarks } = req.body;

    if (!receiverId || !medicineId || !batchNumber || !quantity) {
      return res.status(400).json({ message: 'Receiver, Medicine, Batch Number, and Quantity are required' });
    }

    const transferQty = parseInt(quantity, 10);
    if (isNaN(transferQty) || transferQty <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive integer' });
    }

    if (receiverId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot transfer medicine to your own store account' });
    }

    const receiverUser = await User.findById(receiverId);
    if (!receiverUser) {
      return res.status(404).json({ message: 'Receiver store/user not found' });
    }

    // Find active batch under sender's inventory
    const senderBatch = await InventoryBatch.findOne({
      medicine: medicineId,
      batchNumber,
      user: req.user._id,
      quantity: { $gte: transferQty }
    }).populate('medicine');

    if (!senderBatch) {
      return res.status(400).json({ message: 'Insufficient stock in selected batch for transfer' });
    }

    const previousStock = senderBatch.quantity;
    senderBatch.quantity -= transferQty;
    await senderBatch.save();

    // Create Transfer Record
    const transferNumber = `TRF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const transfer = new MedicineTransfer({
      transferNumber,
      sender: req.user._id,
      receiver: receiverId,
      medicine: medicineId,
      batchNumber: senderBatch.batchNumber,
      expiryDate: senderBatch.expiryDate,
      quantity: transferQty,
      purchaseRate: senderBatch.purchaseRate,
      mrp: senderBatch.mrp,
      gstPercent: senderBatch.gstPercent,
      status: 'Pending',
      remarks
    });

    const savedTransfer = await transfer.save();

    // Log Stock Deduction
    const tx = new StockTransaction({
      medicine: medicineId,
      user: req.user._id,
      transactionType: 'Adjustment',
      batchNumber: senderBatch.batchNumber,
      quantity: -transferQty,
      previousStock,
      newStock: senderBatch.quantity,
      remarks: `Pending Transfer #${transferNumber} to ${receiverUser.chemistName || receiverUser.username}`
    });
    await tx.save();

    await logAudit(
      'Initiate Medicine Transfer',
      'Inventory',
      `Transferred ${transferQty} units of '${senderBatch.medicine.name}' (Batch: ${senderBatch.batchNumber}) to '${receiverUser.chemistName || receiverUser.username}'`,
      req.user._id,
      req
    );

    const populated = await MedicineTransfer.findById(savedTransfer._id)
      .populate('sender', 'username email chemistName')
      .populate('receiver', 'username email chemistName')
      .populate('medicine');

    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error initiating medicine transfer' });
  }
});

// @desc    Accept incoming medicine transfer
// @route   POST /api/transfers/:id/accept
// @access  Private
router.post('/:id/accept', protect, authorize('Admin', 'User', 'Chemist'), async (req, res) => {
  try {
    const transfer = await MedicineTransfer.findById(req.params.id)
      .populate('medicine')
      .populate('sender', 'username chemistName');

    if (!transfer) {
      return res.status(404).json({ message: 'Transfer request not found' });
    }

    if (transfer.receiver.toString() !== req.user._id.toString() && req.user.role?.name !== 'Admin') {
      return res.status(403).json({ message: 'Only the designated receiver store can accept this transfer' });
    }

    if (transfer.status !== 'Pending') {
      return res.status(400).json({ message: `Transfer is already ${transfer.status}` });
    }

    const sourceMed = transfer.medicine;

    // 1. Resolve or Create Medicine record for receiver store
    let receiverMed = await Medicine.findOne({
      name: sourceMed.name,
      user: req.user._id
    });

    if (!receiverMed) {
      receiverMed = new Medicine({
        name: sourceMed.name,
        code: sourceMed.code,
        strength: sourceMed.strength,
        category: sourceMed.category,
        genericName: sourceMed.genericName,
        user: req.user._id,
        minStockLevel: sourceMed.minStockLevel || 10,
        description: `Received via Transfer #${transfer.transferNumber}`
      });
      await receiverMed.save();
    }

    // 2. Add / Merge Inventory Batch for receiver store
    let receiverBatch = await InventoryBatch.findOne({
      medicine: receiverMed._id,
      batchNumber: transfer.batchNumber,
      user: req.user._id
    });

    let previousStock = 0;
    if (receiverBatch) {
      previousStock = receiverBatch.quantity;
      receiverBatch.quantity += transfer.quantity;
      receiverBatch.initialQuantity += transfer.quantity;
      await receiverBatch.save();
    } else {
      receiverBatch = new InventoryBatch({
        medicine: receiverMed._id,
        user: req.user._id,
        batchNumber: transfer.batchNumber,
        expiryDate: transfer.expiryDate,
        quantity: transfer.quantity,
        initialQuantity: transfer.quantity,
        purchaseRate: transfer.purchaseRate,
        mrp: transfer.mrp,
        gstPercent: transfer.gstPercent
      });
      await receiverBatch.save();
    }

    // Update Transfer Status
    transfer.status = 'Accepted';
    transfer.actionDate = new Date();
    await transfer.save();

    // Log Stock Transaction for receiver
    const tx = new StockTransaction({
      medicine: receiverMed._id,
      user: req.user._id,
      transactionType: 'Purchase',
      batchNumber: transfer.batchNumber,
      quantity: transfer.quantity,
      previousStock,
      newStock: previousStock + transfer.quantity,
      remarks: `Accepted Transfer #${transfer.transferNumber} from ${transfer.sender.chemistName || transfer.sender.username}`
    });
    await tx.save();

    await logAudit(
      'Accept Medicine Transfer',
      'Inventory',
      `Accepted ${transfer.quantity} units of '${sourceMed.name}' from '${transfer.sender.chemistName || transfer.sender.username}'`,
      req.user._id,
      req
    );

    const updated = await MedicineTransfer.findById(transfer._id)
      .populate('sender', 'username email chemistName')
      .populate('receiver', 'username email chemistName')
      .populate('medicine');

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error accepting transfer' });
  }
});

// @desc    Reject incoming medicine transfer
// @route   POST /api/transfers/:id/reject
// @access  Private
router.post('/:id/reject', protect, authorize('Admin', 'User', 'Chemist'), async (req, res) => {
  try {
    const transfer = await MedicineTransfer.findById(req.params.id).populate('medicine');

    if (!transfer) {
      return res.status(404).json({ message: 'Transfer request not found' });
    }

    if (transfer.receiver.toString() !== req.user._id.toString() && req.user.role?.name !== 'Admin') {
      return res.status(403).json({ message: 'Only the designated receiver store can reject this transfer' });
    }

    if (transfer.status !== 'Pending') {
      return res.status(400).json({ message: `Transfer is already ${transfer.status}` });
    }

    // Return stock to sender's inventory batch
    let senderBatch = await InventoryBatch.findOne({
      medicine: transfer.medicine._id,
      batchNumber: transfer.batchNumber,
      user: transfer.sender
    });

    if (senderBatch) {
      senderBatch.quantity += transfer.quantity;
      await senderBatch.save();
    } else {
      senderBatch = new InventoryBatch({
        medicine: transfer.medicine._id,
        user: transfer.sender,
        batchNumber: transfer.batchNumber,
        expiryDate: transfer.expiryDate,
        quantity: transfer.quantity,
        initialQuantity: transfer.quantity,
        purchaseRate: transfer.purchaseRate,
        mrp: transfer.mrp,
        gstPercent: transfer.gstPercent
      });
      await senderBatch.save();
    }

    transfer.status = 'Rejected';
    transfer.actionDate = new Date();
    await transfer.save();

    await logAudit(
      'Reject Medicine Transfer',
      'Inventory',
      `Rejected transfer #${transfer.transferNumber} of ${transfer.quantity} units of '${transfer.medicine.name}'`,
      req.user._id,
      req
    );

    const updated = await MedicineTransfer.findById(transfer._id)
      .populate('sender', 'username email chemistName')
      .populate('receiver', 'username email chemistName')
      .populate('medicine');

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error rejecting transfer' });
  }
});

// @desc    Cancel outgoing medicine transfer (Sender)
// @route   POST /api/transfers/:id/cancel
// @access  Private
router.post('/:id/cancel', protect, authorize('Admin', 'User', 'Chemist'), async (req, res) => {
  try {
    const transfer = await MedicineTransfer.findById(req.params.id).populate('medicine');

    if (!transfer) {
      return res.status(404).json({ message: 'Transfer request not found' });
    }

    if (transfer.sender.toString() !== req.user._id.toString() && req.user.role?.name !== 'Admin') {
      return res.status(403).json({ message: 'Only the sender store can cancel this transfer' });
    }

    if (transfer.status !== 'Pending') {
      return res.status(400).json({ message: `Cannot cancel transfer with status ${transfer.status}` });
    }

    // Return stock to sender's inventory batch
    let senderBatch = await InventoryBatch.findOne({
      medicine: transfer.medicine._id,
      batchNumber: transfer.batchNumber,
      user: transfer.sender
    });

    if (senderBatch) {
      senderBatch.quantity += transfer.quantity;
      await senderBatch.save();
    } else {
      senderBatch = new InventoryBatch({
        medicine: transfer.medicine._id,
        user: transfer.sender,
        batchNumber: transfer.batchNumber,
        expiryDate: transfer.expiryDate,
        quantity: transfer.quantity,
        initialQuantity: transfer.quantity,
        purchaseRate: transfer.purchaseRate,
        mrp: transfer.mrp,
        gstPercent: transfer.gstPercent
      });
      await senderBatch.save();
    }

    transfer.status = 'Cancelled';
    transfer.actionDate = new Date();
    await transfer.save();

    await logAudit(
      'Cancel Medicine Transfer',
      'Inventory',
      `Cancelled transfer #${transfer.transferNumber} of ${transfer.quantity} units of '${transfer.medicine.name}'`,
      req.user._id,
      req
    );

    const updated = await MedicineTransfer.findById(transfer._id)
      .populate('sender', 'username email chemistName')
      .populate('receiver', 'username email chemistName')
      .populate('medicine');

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error cancelling transfer' });
  }
});

module.exports = router;
