const mongoose = require('mongoose');

const PurchaseSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
  },
  invoiceNumber: {
    type: String,
    required: true,
    trim: true,
  },
  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  subTotal: {
    type: Number,
    required: true,
    default: 0,
  },
  gstTotal: {
    type: Number,
    required: true,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Draft', 'Completed'],
    default: 'Completed',
  },
  remarks: {
    type: String,
  }
}, { timestamps: true });

// Compound index to ensure invoice numbers are unique per supplier
PurchaseSchema.index({ supplier: 1, invoiceNumber: 1 }, { unique: true });

module.exports = mongoose.model('Purchase', PurchaseSchema);
