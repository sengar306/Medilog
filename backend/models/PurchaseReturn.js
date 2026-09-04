const mongoose = require('mongoose');

const PurchaseReturnItemSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },
  batchNumber: {
    type: String,
    required: true,
    trim: true
  },
  returnQuantity: {
    type: Number,
    required: true,
    min: 1
  },
  purchaseRate: {
    type: Number,
    required: true,
    min: 0
  },
  returnAmount: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    trim: true
  }
}, { _id: false });

const PurchaseReturnSchema = new mongoose.Schema({
  purchase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
    required: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  returnNumber: {
    type: String,
    required: true,
    trim: true
  },
  returnDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  reason: {
    type: String,
    trim: true
  },
  items: [PurchaseReturnItemSchema],
  totalReturnAmount: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  debitNoteNumber: {
    type: String,
    trim: true
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  remarks: {
    type: String
  }
}, { timestamps: true });

PurchaseReturnSchema.index({ returnNumber: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('PurchaseReturn', PurchaseReturnSchema);
