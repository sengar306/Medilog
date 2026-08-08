const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
  },
  strength: {
    type: String, // e.g. 500mg, 10ml
    trim: true,
  },
  category: {
    type: String, // e.g. Tablet, Syrup, Injection, Capsule
    trim: true,
  },
  genericName: {
    type: String, // e.g. Paracetamol
    trim: true,
  },
  rack: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rack',
  },
  minStockLevel: {
    type: Number,
    default: 10,
  },
  description: {
    type: String,
  },
  isRxOnly: {
    type: Boolean,
    default: false   // Rx-only: requires prescription to dispense
  },
  manufacturer: {
    type: String,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Medicine', MedicineSchema);
