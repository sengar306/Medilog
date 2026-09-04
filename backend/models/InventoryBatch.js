const mongoose = require('mongoose');

const InventoryBatchSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true,
  },
  batchNumber: {
    type: String,
    required: true,
    trim: true,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  initialQuantity: {
    type: Number,
    required: true,
    min: 0,
  },
  purchaseRate: {
    type: Number,
    required: true,
    min: 0,
  },
  mrp: {
    type: Number,
    required: true,
    min: 0,
  },
  gstPercent: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
}, { timestamps: true });

// Compound index to ensure batch numbers are unique per medicine per chemist user
InventoryBatchSchema.index({ medicine: 1, batchNumber: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('InventoryBatch', InventoryBatchSchema);
