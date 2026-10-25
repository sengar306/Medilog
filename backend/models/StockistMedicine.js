const mongoose = require('mongoose');

const StockistMedicineSchema = new mongoose.Schema({
  stockist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: String,
    trim: true,
    default: ''
  },
  category: {
    type: String,
    required: true,
    default: 'Tablet'
  },
  packSize: {
    type: String,
    default: '10x10 Tablets'
  },
  wholesalePrice: {
    type: Number,
    required: true
  },
  mrp: {
    type: Number,
    required: true
  },
  stockQuantity: {
    type: Number,
    required: true,
    default: 0
  },
  minOrderQty: {
    type: Number,
    default: 1
  },
  batchNumber: {
    type: String,
    default: ''
  },
  expiryDate: {
    type: Date
  },
  description: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: ''
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('StockistMedicine', StockistMedicineSchema);
