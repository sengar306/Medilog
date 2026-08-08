const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  saleDate: {
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
  discountAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  totalAmount: { // Final net payable
    type: Number,
    required: true,
    default: 0,
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Mixed'],
    default: 'Cash',
  },
  cashier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Sale', SaleSchema);
