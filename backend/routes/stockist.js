const express = require('express');
const router = express.Router();
const StockistMedicine = require('../models/StockistMedicine');
const StockistOrder = require('../models/StockistOrder');
const InAppNotification = require('../models/InAppNotification');
const { protect } = require('../middleware/auth');

// Helper to generate order numbers like STK-ORD-83921
function generateOrderNumber() {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `STK-ORD-${random}`;
}

// -------------------------------------------------------------
// STOCKIST MEDICINE CATALOG ENDPOINTS
// -------------------------------------------------------------

// @desc    Get logged in stockist's own catalog
// @route   GET /stockist/medicines/my
// @access  Private (Stockist / Admin)
router.get('/medicines/my', protect, async (req, res) => {
  try {
    const medicines = await StockistMedicine.find({ stockist: req.user._id }).sort({ createdAt: -1 });
    res.json(medicines);
  } catch (error) {
    console.error('Error fetching stockist medicines:', error);
    res.status(500).json({ message: 'Failed to fetch catalog' });
  }
});

// @desc    Get marketplace medicines (for Chemists to order from all Stockists)
// @route   GET /stockist/marketplace
// @access  Private
router.get('/marketplace', protect, async (req, res) => {
  try {
    const { search, category, stockistId } = req.query;
    const query = { isAvailable: true, stockQuantity: { $gt: 0 } };

    if (stockistId) {
      query.stockist = stockistId;
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const medicines = await StockistMedicine.find(query)
      .populate('stockist', 'username chemistName email pdfConfig')
      .sort({ name: 1 });

    res.json(medicines);
  } catch (error) {
    console.error('Error fetching marketplace:', error);
    res.status(500).json({ message: 'Failed to fetch marketplace medicines' });
  }
});

// @desc    Add new medicine to stockist catalog for sale
// @route   POST /stockist/medicines
// @access  Private (Stockist / Admin)
router.post('/medicines', protect, async (req, res) => {
  try {
    const { name, brand, category, packSize, wholesalePrice, mrp, stockQuantity, minOrderQty, batchNumber, expiryDate, description, imageUrl } = req.body;

    if (!name || !wholesalePrice || !mrp) {
      return res.status(400).json({ message: 'Medicine Name, Wholesale Price, and MRP are required' });
    }

    const newMed = new StockistMedicine({
      stockist: req.user._id,
      name,
      brand,
      category: category || 'Tablet',
      packSize: packSize || '10x10 Tablets',
      wholesalePrice: Number(wholesalePrice),
      mrp: Number(mrp),
      stockQuantity: Number(stockQuantity) || 0,
      minOrderQty: Number(minOrderQty) || 1,
      batchNumber: batchNumber || '',
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      description: description || '',
      imageUrl: imageUrl || '',
      isAvailable: true
    });

    await newMed.save();
    res.status(201).json(newMed);
  } catch (error) {
    console.error('Error creating stockist medicine:', error);
    res.status(500).json({ message: 'Failed to add medicine to catalog' });
  }
});

// @desc    Update stockist medicine
// @route   PUT /stockist/medicines/:id
// @access  Private (Stockist / Admin)
router.put('/medicines/:id', protect, async (req, res) => {
  try {
    const med = await StockistMedicine.findById(req.params.id);
    if (!med) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    // Ensure user owns this item or is admin
    if (med.stockist.toString() !== req.user._id.toString() && req.user.role?.name !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    Object.assign(med, req.body);
    if (req.body.expiryDate) {
      med.expiryDate = new Date(req.body.expiryDate);
    }

    await med.save();
    res.json(med);
  } catch (error) {
    console.error('Error updating stockist medicine:', error);
    res.status(500).json({ message: 'Failed to update medicine' });
  }
});

// @desc    Delete stockist medicine
// @route   DELETE /stockist/medicines/:id
// @access  Private (Stockist / Admin)
router.delete('/medicines/:id', protect, async (req, res) => {
  try {
    const med = await StockistMedicine.findById(req.params.id);
    if (!med) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    if (med.stockist.toString() !== req.user._id.toString() && req.user.role?.name !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await med.deleteOne();
    res.json({ message: 'Medicine removed from catalog' });
  } catch (error) {
    console.error('Error deleting stockist medicine:', error);
    res.status(500).json({ message: 'Failed to delete medicine' });
  }
});

// -------------------------------------------------------------
// B2B ORDERS & NOTIFICATION ENDPOINTS
// -------------------------------------------------------------

// @desc    Chemist places order with Stockist
// @route   POST /stockist/orders
// @access  Private
router.post('/orders', protect, async (req, res) => {
  try {
    const { stockistId, items, deliveryAddress, notes } = req.body;

    if (!stockistId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Stockist ID and valid order items are required' });
    }

    let calculatedTotal = 0;
    const orderItems = [];

    for (const item of items) {
      const stockMed = await StockistMedicine.findById(item.medicineId);
      if (!stockMed) {
        return res.status(404).json({ message: `Medicine item ${item.medicineId} not found` });
      }

      if (stockMed.stockQuantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${stockMed.name}. Available: ${stockMed.stockQuantity}` });
      }

      const lineTotal = stockMed.wholesalePrice * item.quantity;
      calculatedTotal += lineTotal;

      orderItems.push({
        medicine: stockMed._id,
        name: stockMed.name,
        packSize: stockMed.packSize,
        quantity: item.quantity,
        unitPrice: stockMed.wholesalePrice,
        totalPrice: lineTotal
      });

      // Deduct stock quantity
      stockMed.stockQuantity -= item.quantity;
      if (stockMed.stockQuantity <= 0) {
        stockMed.isAvailable = false;
      }
      await stockMed.save();
    }

    const orderNumber = generateOrderNumber();
    const chemistName = req.user.chemistName || req.user.username;
    const chemistPhone = req.user.pdfConfig?.phone || '';

    const newOrder = new StockistOrder({
      orderNumber,
      stockist: stockistId,
      chemist: req.user._id,
      chemistName,
      chemistPhone,
      deliveryAddress: deliveryAddress || req.user.pdfConfig?.address || '',
      items: orderItems,
      totalAmount: calculatedTotal,
      status: 'Pending',
      notes: notes || '',
      statusHistory: [{
        status: 'Pending',
        updatedBy: chemistName,
        note: 'Order placed by chemist'
      }]
    });

    await newOrder.save();

    // Create Notification for the Stockist!
    const notif = new InAppNotification({
      recipient: stockistId,
      sender: req.user._id,
      title: '📦 New Order Received!',
      message: `Chemist "${chemistName}" placed Order ${orderNumber} worth ₹${calculatedTotal.toLocaleString('en-IN')}`,
      type: 'stockist_order_created',
      severity: 'info',
      orderId: newOrder._id,
      isRead: false
    });

    await notif.save();

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! Notification sent to stockist.',
      order: newOrder
    });
  } catch (error) {
    console.error('Error placing stockist order:', error);
    res.status(500).json({ message: 'Failed to place order' });
  }
});

// @desc    Get orders (Stockist receives orders; Chemist sees placed orders)
// @route   GET /stockist/orders
// @access  Private
router.get('/orders', protect, async (req, res) => {
  try {
    const userRole = typeof req.user.role === 'string' ? req.user.role : (req.user.role?.name || '');
    let filter = {};

    if (userRole === 'Stockist') {
      filter.stockist = req.user._id;
    } else if (userRole === 'Admin') {
      // Admin can see all, or filter by query
      if (req.query.type === 'stockist') {
        filter.stockist = req.user._id;
      } else if (req.query.type === 'chemist') {
        filter.chemist = req.user._id;
      }
    } else {
      // Chemist sees orders they placed
      filter.chemist = req.user._id;
    }

    const orders = await StockistOrder.find(filter)
      .populate('stockist', 'username chemistName email pdfConfig')
      .populate('chemist', 'username chemistName email pdfConfig')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// @desc    Stockist updates order status (Accepted, Out for Delivery, Delivered, Rejected)
// @route   PATCH /stockist/orders/:id/status
// @access  Private (Stockist / Admin / Chemist)
router.patch('/orders/:id/status', protect, async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['Pending', 'Accepted', 'Out for Delivery', 'Delivered', 'Rejected', 'Cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await StockistOrder.findById(req.params.id)
      .populate('stockist', 'username chemistName')
      .populate('chemist', 'username chemistName');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updaterName = req.user.chemistName || req.user.username;
    order.status = status;
    order.statusHistory.push({
      status,
      updatedBy: updaterName,
      note: note || `Status updated to ${status}`
    });

    await order.save();

    // Create Notification for the Chemist when Stockist updates status
    let notifTitle = `🚚 Order Status: ${status}`;
    let severity = 'info';
    if (status === 'Accepted') {
      notifTitle = '✅ Order Accepted by Stockist';
      severity = 'success';
    } else if (status === 'Out for Delivery') {
      notifTitle = '🚚 Order is Out for Delivery!';
      severity = 'info';
    } else if (status === 'Delivered') {
      notifTitle = '🎉 Order Delivered!';
      severity = 'success';
    } else if (status === 'Rejected' || status === 'Cancelled') {
      notifTitle = '❌ Order Cancelled/Rejected';
      severity = 'critical';
    }

    const stockistDisplayName = order.stockist?.chemistName || order.stockist?.username || 'Stockist';

    const notif = new InAppNotification({
      recipient: order.chemist._id,
      sender: req.user._id,
      title: notifTitle,
      message: `Your Order ${order.orderNumber} from ${stockistDisplayName} is now: ${status}`,
      type: 'stockist_order_updated',
      severity,
      orderId: order._id,
      isRead: false
    });

    await notif.save();

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Failed to update order status' });
  }
});

// -------------------------------------------------------------
// USER NOTIFICATIONS ENDPOINTS
// -------------------------------------------------------------

// @desc    Get active notifications for logged in user
// @route   GET /stockist/notifications
// @access  Private
router.get('/notifications', protect, async (req, res) => {
  try {
    const notifications = await InAppNotification.find({
      recipient: req.user._id,
      isRead: false
    }).sort({ createdAt: -1 }).limit(20);

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// @desc    Mark notification as read/dismissed
// @route   POST /stockist/notifications/:id/read
// @access  Private
router.post('/notifications/:id/read', protect, async (req, res) => {
  try {
    await InAppNotification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to dismiss notification' });
  }
});

module.exports = router;
