const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockistMedicine',
    required: true
  },
  name: { type: String, required: true },
  packSize: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true }
});

const StockistOrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  stockist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chemist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chemistName: {
    type: String,
    default: ''
  },
  chemistPhone: {
    type: String,
    default: ''
  },
  deliveryAddress: {
    type: String,
    default: ''
  },
  items: [OrderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Out for Delivery', 'Delivered', 'Rejected', 'Cancelled'],
    default: 'Pending'
  },
  notes: {
    type: String,
    default: ''
  },
  statusHistory: [{
    status: String,
    updatedAt: { type: Date, default: Date.now },
    updatedBy: String,
    note: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('StockistOrder', StockistOrderSchema);
