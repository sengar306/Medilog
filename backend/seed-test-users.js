const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const dns = require('dns');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Role = require('./models/Role');
const Medicine = require('./models/Medicine');
const InventoryBatch = require('./models/InventoryBatch');

const StockistMedicine = require('./models/StockistMedicine');

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
  let stockistRole = await Role.findOne({ name: 'Stockist' });
  if (!stockistRole) {
    stockistRole = await Role.create({ name: 'Stockist', permissions: ['STOCKIST_PORTAL'] });
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

  // Stockist 1
  let stockist1 = await User.findOne({ username: 'stockist1' });
  if (!stockist1) {
    stockist1 = await User.create({ username: 'stockist1', email: 'stockist1@medilog.com', password: 'password123', role: stockistRole._id, chemistName: 'Apex Wholesale Pharma Distributors' });
  } else {
    stockist1.password = 'password123';
    await stockist1.save();
  }

  console.log(`Seeded users: admin, chemist1 (${chemist1._id}), chemist2 (${chemist2._id}), stockist1 (${stockist1._id})`);

  // Seed sample stockist catalog medicines for stockist1
  const stockistMeds = [
    { name: 'Paracetamol 650mg Extra', brand: 'Crocin Wholesale', category: 'Tablet', packSize: '10x10 Strips', wholesalePrice: 140, mrp: 280, stockQuantity: 500, minOrderQty: 5, batchNumber: 'STK-PCM-01', expiryDate: new Date('2028-12-31'), description: 'High potency paracetamol tablets in bulk box', imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60' },
    { name: 'Amoxicillin & Clavulanate 625mg', brand: 'Moxikind-CV 625', category: 'Tablet', packSize: '10x10 Strips', wholesalePrice: 480, mrp: 950, stockQuantity: 300, minOrderQty: 2, batchNumber: 'STK-AMX-02', expiryDate: new Date('2027-10-15'), description: 'Broad spectrum antibiotic strips', imageUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=60' },
    { name: 'Pantoprazole 40mg Gastro', brand: 'Pan-40 Wholesale', category: 'Tablet', packSize: '10x15 Strips', wholesalePrice: 220, mrp: 490, stockQuantity: 450, minOrderQty: 3, batchNumber: 'STK-PAN-03', expiryDate: new Date('2028-06-30'), description: 'Acid reflux gastro resistant tablets', imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951baa74c?w=500&auto=format&fit=crop&q=60' },
    { name: 'Azithromycin 500mg Triple', brand: 'Azee 500 Bulk', category: 'Tablet', packSize: '10x3 Strips', wholesalePrice: 310, mrp: 600, stockQuantity: 250, minOrderQty: 2, batchNumber: 'STK-AZI-04', expiryDate: new Date('2027-11-20'), description: 'Azithromycin 500mg 3s strip box', imageUrl: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500&auto=format&fit=crop&q=60' },
    { name: 'Cough Syrup Multiaction 100ml', brand: 'Corex DX Distro', category: 'Syrup', packSize: '24 Bottles Box', wholesalePrice: 850, mrp: 1560, stockQuantity: 120, minOrderQty: 1, batchNumber: 'STK-CGH-05', expiryDate: new Date('2027-08-30'), description: '24 Bottles per carton box', imageUrl: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?w=500&auto=format&fit=crop&q=60' }
  ];

  for (const sm of stockistMeds) {
    const exists = await StockistMedicine.findOne({ stockist: stockist1._id, name: sm.name });
    if (!exists) {
      await StockistMedicine.create({
        ...sm,
        stockist: stockist1._id
      });
    }
  }

  console.log('Seeded Stockist wholesale medicines catalog.');
  await mongoose.disconnect();
}

seed().catch(err => console.error(err));
