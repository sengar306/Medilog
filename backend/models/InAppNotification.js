const mongoose = require('mongoose');

const InAppNotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['stockist_order_created', 'stockist_order_updated', 'low_stock', 'near_expiry', 'system'],
    default: 'stockist_order_created'
  },
  severity: {
    type: String,
    enum: ['info', 'success', 'warning', 'critical'],
    default: 'info'
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockistOrder'
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('InAppNotification', InAppNotificationSchema);
