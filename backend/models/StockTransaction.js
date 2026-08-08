const mongoose = require('mongoose');

const StockTransactionSchema = new mongoose.Schema({
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
  transactionType: {
    type: String,
    enum: ['Purchase', 'Sale', 'Adjustment', 'Expiry'],
    required: true,
  },
  quantity: { // Positive for additions, negative for deductions
    type: Number,
    required: true,
  },
  previousStock: {
    type: Number,
    required: true,
  },
  newStock: {
    type: Number,
    required: true,
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  referenceType: {
    type: String,
    enum: ['Purchase', 'Sale', 'Manual'],
  },
  remarks: {
    type: String,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('StockTransaction', StockTransactionSchema);
