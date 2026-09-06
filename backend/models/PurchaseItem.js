const mongoose = require('mongoose');

const PurchaseItemSchema = new mongoose.Schema({
  purchase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
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
    min: 1,
  },
  freeQuantity: {
    type: Number,
    default: 0,
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
  discountPercent: {
    type: Number,
    default: 0,
  },
  discount2Percent: {
    type: Number,
    default: 0,
  },
  gstPercent: {
    type: Number,
    required: true,
    default: 0,
  },
  gstAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
  }
}, { timestamps: true });

module.exports = mongoose.model('PurchaseItem', PurchaseItemSchema);
