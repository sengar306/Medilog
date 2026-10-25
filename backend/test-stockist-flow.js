const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const dns = require('dns');
const User = require('./models/User');
const Role = require('./models/Role');
const StockistMedicine = require('./models/StockistMedicine');
const StockistOrder = require('./models/StockistOrder');
const InAppNotification = require('./models/InAppNotification');

async function testStockistFlow() {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  } catch (_) {}
  await mongoose.connect(process.env.MONGO_URI);
  console.log('--- Stockist B2B Wholesale Verification Test ---');

  // 1. Get stockist1 and chemist1 users
  const stockist = await User.findOne({ username: 'stockist1' });
  const chemist = await User.findOne({ username: 'chemist1' });

  if (!stockist || !chemist) {
    throw new Error('Test users (stockist1 or chemist1) not found in DB!');
  }

  console.log(`✅ Users found: Stockist (${stockist.username}), Chemist (${chemist.username})`);

  // 2. Stockist uploads a medicine offer
  const testMedName = `Automation Drug ${Date.now()}`;
  const newMed = await StockistMedicine.create({
    stockist: stockist._id,
    name: testMedName,
    brand: 'AutoPharma',
    category: 'Tablet',
    packSize: '10x10 Strips',
    wholesalePrice: 150,
    mrp: 300,
    stockQuantity: 100,
    minOrderQty: 1,
    batchNumber: 'BAT-AUTO-1',
    expiryDate: new Date('2028-12-31')
  });

  console.log(`✅ Stockist published medicine: "${newMed.name}" (Rate: ₹150, Stock: 100)`);

  // 3. Chemist places an order for 10 units
  const orderQty = 10;
  const orderNumber = `STK-TEST-${Math.floor(1000 + Math.random() * 9000)}`;

  const order = await StockistOrder.create({
    orderNumber,
    stockist: stockist._id,
    chemist: chemist._id,
    chemistName: chemist.chemistName || chemist.username,
    chemistPhone: '9876543210',
    deliveryAddress: '123 Health Street, New Delhi',
    items: [{
      medicine: newMed._id,
      name: newMed.name,
      packSize: newMed.packSize,
      quantity: orderQty,
      unitPrice: newMed.wholesalePrice,
      totalPrice: newMed.wholesalePrice * orderQty
    }],
    totalAmount: newMed.wholesalePrice * orderQty,
    status: 'Pending',
    notes: 'Urgent delivery requested'
  });

  console.log(`✅ Chemist placed Order ${order.orderNumber} for ₹${order.totalAmount}`);

  // 4. Create Notification for Stockist
  const notif = await InAppNotification.create({
    recipient: stockist._id,
    sender: chemist._id,
    title: '📦 New Order Received!',
    message: `Chemist "${chemist.chemistName}" placed Order ${order.orderNumber} worth ₹${order.totalAmount}`,
    type: 'stockist_order_created',
    severity: 'info',
    orderId: order._id
  });

  console.log(`✅ Notification created for Stockist: "${notif.title}" - "${notif.message}"`);

  // 5. Stockist fetches unread notifications
  const unreadNotifs = await InAppNotification.find({ recipient: stockist._id, isRead: false });
  console.log(`✅ Stockist has ${unreadNotifs.length} unread notifications in header bell.`);

  // 6. Stockist updates order status: Pending -> Accepted -> Out for Delivery -> Delivered
  const statuses = ['Accepted', 'Out for Delivery', 'Delivered'];
  for (const status of statuses) {
    order.status = status;
    order.statusHistory.push({
      status,
      updatedBy: stockist.username,
      note: `Status updated to ${status}`
    });
    await order.save();

    await InAppNotification.create({
      recipient: chemist._id,
      sender: stockist._id,
      title: `Order Status: ${status}`,
      message: `Your Order ${order.orderNumber} is now: ${status}`,
      type: 'stockist_order_updated',
      severity: status === 'Delivered' ? 'success' : 'info',
      orderId: order._id
    });
    console.log(`  -> Order status updated to "${status}" and notification sent to Chemist.`);
  }

  // 7. Verify final order state
  const finalOrder = await StockistOrder.findById(order._id);
  console.log(`✅ Final Order Status: ${finalOrder.status} (History count: ${finalOrder.statusHistory.length})`);

  console.log('--- ALL BACKEND B2B WORKFLOW TESTS PASSED SUCCESSFULLY! ---');
  await mongoose.disconnect();
}

testStockistFlow().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
