const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const dns = require('dns');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Role = require('./models/Role');
const Medicine = require('./models/Medicine');
const InventoryBatch = require('./models/InventoryBatch');

async function seed() {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  } catch (_) {}
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  let adminRole = await Role.findOne({ name: 'Admin' });
  if (!adminRole) {
    adminRole = await Role.create({ name: 'Admin', permissions: ['ALL'] });
  }
  let chemistRole = await Role.findOne({ name: 'Chemist' });
  if (!chemistRole) {
    chemistRole = await Role.create({ name: 'Chemist', permissions: ['POS', 'INVENTORY'] });
  }

  // Admin user
  let admin = await User.findOne({ username: 'admin' });
  if (!admin) {
    admin = await User.create({ username: 'admin', email: 'admin@medilog.com', password: 'password123', role: adminRole._id, chemistName: 'Medi Log Head Office' });
  } else {
    admin.password = 'password123';
    await admin.save();
  }

  // Chemist 1
  let chemist1 = await User.findOne({ username: 'chemist1' });
  if (!chemist1) {
    chemist1 = await User.create({ username: 'chemist1', email: 'chemist1@medilog.com', password: 'password123', role: chemistRole._id, chemistName: 'City Health Care Pharmacy' });
  } else {
    chemist1.password = 'password123';
    await chemist1.save();
  }

  // Chemist 2
  let chemist2 = await User.findOne({ username: 'chemist2' });
  if (!chemist2) {
    chemist2 = await User.create({ username: 'chemist2', email: 'chemist2@medilog.com', password: 'password123', role: chemistRole._id, chemistName: 'Metro Care Pharmacy' });
  } else {
    chemist2.password = 'password123';
    await chemist2.save();
  }

  console.log(`Seeded users: admin, chemist1 (${chemist1._id}), chemist2 (${chemist2._id})`);

  // Ensure medicines exist for both chemists
  let meds1 = await Medicine.find({ user: chemist1._id });
  if (meds1.length < 5) {
    for (let i = 1; i <= 5; i++) {
      let med = await Medicine.findOne({ name: `Paracetamol C1-${i * 100}mg` });
      if (!med) {
        med = await Medicine.create({ name: `Paracetamol C1-${i * 100}mg`, category: 'Tablet', strength: `${i * 100}mg`, user: chemist1._id });
        await InventoryBatch.create({ medicine: med._id, user: chemist1._id, batchNumber: `BAT-C1-${i}`, quantity: 200, initialQuantity: 200, purchaseRate: 10, mrp: 20 + i, gstPercent: 12, expiryDate: new Date('2028-12-31') });
      }
    }
    meds1 = await Medicine.find({ user: chemist1._id });
  }

  let meds2 = await Medicine.find({ user: chemist2._id });
  if (meds2.length < 60) {
    for (let i = 1; i <= 60; i++) {
      let med = await Medicine.findOne({ name: `Bulk Drug C2-${i}` });
      if (!med) {
        med = await Medicine.create({ name: `Bulk Drug C2-${i}`, category: 'Tablet', strength: '500mg', user: chemist2._id });
        await InventoryBatch.create({ medicine: med._id, user: chemist2._id, batchNumber: `BAT-C2-${i}`, quantity: 200, initialQuantity: 200, purchaseRate: 10, mrp: 15 + (i % 10), gstPercent: 12, expiryDate: new Date('2028-12-31') });
      }
    }
    meds2 = await Medicine.find({ user: chemist2._id });
  }

  console.log('Seeded medicines and inventory batches for Chemist 1 and Chemist 2');
  await mongoose.disconnect();
}

seed().catch(err => console.error(err));
