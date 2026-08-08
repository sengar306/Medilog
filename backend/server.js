const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/db');
const Role = require('./models/Role');
const User = require('./models/User');

// Initialize app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Static Folder for uploaded invoices
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import Routes
const authRoutes = require('./routes/auth');
const medicineRoutes = require('./routes/medicine');
const inventoryRoutes = require('./routes/inventory');
const supplierRoutes = require('./routes/supplier');
const purchaseRoutes = require('./routes/purchase');
const invoiceParserRoutes = require('./routes/invoice-parser');
const billingRoutes = require('./routes/billing');
const reportRoutes = require('./routes/reports');
const customerRoutes = require('./routes/customer');
const whatsappRoutes = require('./routes/whatsapp');
const prescriptionRoutes = require('./routes/prescription');
const notificationRoutes = require('./routes/notifications');
const loyaltyRoutes = require('./routes/loyalty');
const purchaseReturnRoutes = require('./routes/purchase-return');
const userRoutes = require('./routes/users');

// Register Routes (Mount exactly as specified in the PDF)
app.use('/auth', authRoutes);
app.use('/medicines', medicineRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/suppliers', supplierRoutes);
app.use('/purchase', purchaseRoutes);
app.use('/invoice', invoiceParserRoutes);
app.use('/sales', billingRoutes);
app.use('/reports', reportRoutes);
app.use('/customers', customerRoutes);
app.use('/whatsapp', whatsappRoutes);
app.use('/api/v1/whatsapp', whatsappRoutes);
app.use('/prescriptions', prescriptionRoutes);
app.use('/notifications', notificationRoutes);
app.use('/loyalty', loyaltyRoutes);
app.use('/purchase-returns', purchaseReturnRoutes);
app.use('/users', userRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'MediLog API is running' });
});

// Seed default roles and users
const seedDB = async () => {
  try {
    const Supplier = require('./models/Supplier');
    const Medicine = require('./models/Medicine');
    const InventoryBatch = require('./models/InventoryBatch');
    const Customer = require('./models/Customer');

    // 1. Seed Roles (Admin & User only)
    const rolesToSeed = [
      { name: 'Admin', description: 'System Administrator with full access' },
      { name: 'User', description: 'Standard Pharmacy User' }
    ];

    for (const r of rolesToSeed) {
      const exists = await Role.findOne({ name: r.name });
      if (!exists) {
        await new Role(r).save();
        console.log(`Role seeded: ${r.name}`);
      }
    }

    // 2. Seed Users
    const adminRole = await Role.findOne({ name: 'Admin' });
    const userRole = await Role.findOne({ name: 'User' });

    const usersToSeed = [
      { username: 'admin', email: 'admin@medilog.com', password: 'admin123', role: adminRole._id },
      { username: 'user', email: 'user@medilog.com', password: 'user123', role: userRole._id }
    ];

    for (const u of usersToSeed) {
      const exists = await User.findOne({ username: u.username });
      if (!exists) {
        await new User(u).save();
        console.log(`User seeded: ${u.username} (${u.password})`);
      }
    }

    // 3. Seed Suppliers
    const suppliersToSeed = [
      { name: 'Manoj Medicos', email: 'manoj@medicos.com', phone: '9219276632', address: 'Assandh Road, Panipat' },
      { name: 'Gupta Medical Hall', email: 'gupta@medical.com', phone: '9876543210', address: 'G.T. Road, Panipat' }
    ];
    for (const s of suppliersToSeed) {
      let doc = await Supplier.findOne({ name: s.name });
      if (!doc) {
        await new Supplier(s).save();
        console.log(`Supplier seeded: ${s.name}`);
      }
    }

    // 4. Seed Medicines & Stock
    const medicinesToSeed = [
      { name: 'Paracetamol 650mg', code: 'PCM650', strength: '650mg', category: 'Tablet', genericName: 'Paracetamol', mrp: 15.5, gstPercent: 12 },
      { name: 'Amoxicillin 500mg', code: 'AMX500', strength: '500mg', category: 'Capsule', genericName: 'Amoxicillin', mrp: 85.0, gstPercent: 18 },
      { name: 'Ranitidine 150mg', code: 'RNT150', strength: '150mg', category: 'Tablet', genericName: 'Ranitidine', mrp: 22.4, gstPercent: 12 },
      { name: 'Atorvastatin 10mg', code: 'ATV10', strength: '10mg', category: 'Tablet', genericName: 'Atorvastatin', mrp: 45.0, gstPercent: 18 }
    ];

    for (const m of medicinesToSeed) {
      let medDoc = await Medicine.findOne({ name: m.name });
      if (!medDoc) {
        medDoc = await new Medicine({
          name: m.name,
          code: m.code,
          strength: m.strength,
          category: m.category,
          genericName: m.genericName,
          minStockLevel: 10
        }).save();
        console.log(`Medicine seeded: ${m.name}`);
      }

      // Seed Batches
      const batchExists = await InventoryBatch.findOne({ medicine: medDoc._id });
      if (!batchExists) {
        const expiryNear = new Date();
        expiryNear.setMonth(expiryNear.getMonth() + 1); // 1 month from now (near expiry)
        
        const expiryFresh = new Date();
        expiryFresh.setFullYear(expiryFresh.getFullYear() + 2); // 2 years from now

        await new InventoryBatch({
          medicine: medDoc._id,
          batchNumber: `BAT-${m.code}-01`,
          expiryDate: expiryNear,
          quantity: 35,
          initialQuantity: 35,
          purchaseRate: m.mrp * 0.7,
          mrp: m.mrp,
          gstPercent: m.gstPercent
        }).save();

        await new InventoryBatch({
          medicine: medDoc._id,
          batchNumber: `BAT-${m.code}-02`,
          expiryDate: expiryFresh,
          quantity: 150,
          initialQuantity: 150,
          purchaseRate: m.mrp * 0.7,
          mrp: m.mrp,
          gstPercent: m.gstPercent
        }).save();
        
        console.log(`Inventory Batches seeded for: ${m.name}`);
      }
    }

    // 5. Seed Customers
    const customersToSeed = [
      { name: 'Rahul Sharma', phone: '9219276632', loyaltyPoints: 120, totalSpent: 1200 },
      { name: 'Vivek Kumar', phone: '9876543210', loyaltyPoints: 45, totalSpent: 450 }
    ];
    for (const c of customersToSeed) {
      const exists = await Customer.findOne({ phone: c.phone });
      if (!exists) {
        await new Customer(c).save();
        console.log(`Customer seeded: ${c.name}`);
      }
    }
  } catch (err) {
    console.error('Error seeding database:', err.message);
  }
};

// Start Server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  // Connect to DB
  await connectDB();
  
  // Seed Database
  await seedDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
