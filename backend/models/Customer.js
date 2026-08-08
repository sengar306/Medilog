const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
  },
  email: {
    type: String,
    trim: true,
    sparse: true,
  },
  address: {
    type: String,
    trim: true,
  },
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  visitCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);
