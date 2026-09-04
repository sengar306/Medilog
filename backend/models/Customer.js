const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  phone: {
    type: String,
    trim: true,
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

CustomerSchema.index({ phone: 1, user: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Customer', CustomerSchema);
