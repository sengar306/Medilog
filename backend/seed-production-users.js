const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const dns = require('dns');
const User = require('./models/User');
const Role = require('./models/Role');

async function seedProductionUsers() {
  try {
    try {
      dns.setServers(['8.8.8.8', '8.8.4.4']);
    } catch (_) {}

    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in backend/.env');
    }

    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB successfully.\n');

    // 1. Ensure Roles exist
    const rolesToSeed = [
      { name: 'Super Admin', description: 'Master System Administrator with full global access' },
      { name: 'Admin', description: 'System Administrator with full access' },
      { name: 'Chemist', description: 'Chemist / Pharmacy Store Owner' },
      { name: 'User', description: 'Standard Pharmacy User' }
    ];

    const roleMap = {};
    for (const r of rolesToSeed) {
      let roleDoc = await Role.findOne({ name: r.name });
      if (!roleDoc) {
        roleDoc = await Role.create(r);
        console.log(`Created Role: ${r.name}`);
      }
      roleMap[r.name] = roleDoc._id;
    }

    // 2. Define Production Accounts (1 Super Admin + 4 Chemists)
    const productionAccounts = [
      {
        username: 'superadmin',
        email: 'superadmin@medilog.com',
        password: 'SuperAdmin@2026',
        roleName: 'Super Admin',
        chemistName: 'MediLog Central HQ'
      },
      {
        username: 'chemist1',
        email: 'chemist1@medilog.com',
        password: 'Chemist1Pass@123',
        roleName: 'Chemist',
        chemistName: 'City Health Care Pharmacy'
      },
      {
        username: 'chemist2',
        email: 'chemist2@medilog.com',
        password: 'Chemist2Pass@123',
        roleName: 'Chemist',
        chemistName: 'Metro Care Pharmacy'
      },
      {
        username: 'chemist3',
        email: 'chemist3@medilog.com',
        password: 'Chemist3Pass@123',
        roleName: 'Chemist',
        chemistName: 'LifeLine Medicos & Pharmacy'
      },
      {
        username: 'chemist4',
        email: 'chemist4@medilog.com',
        password: 'Chemist4Pass@123',
        roleName: 'Chemist',
        chemistName: 'Apollo Care Pharmacy'
      }
    ];

    console.log('\n--- SEEDING PRODUCTION USERS ---');
    const createdUsers = [];

    for (const acc of productionAccounts) {
      let user = await User.findOne({
        $or: [{ username: acc.username }, { email: acc.email }]
      });

      const roleId = roleMap[acc.roleName];

      if (!user) {
        user = new User({
          username: acc.username,
          email: acc.email,
          password: acc.password,
          role: roleId,
          chemistName: acc.chemistName,
          isActive: true
        });
        await user.save();
        console.log(`[CREATED] ${acc.roleName}: ${acc.username} (${acc.chemistName})`);
      } else {
        user.role = roleId;
        user.chemistName = acc.chemistName;
        user.isActive = true;
        // Optionally update password if needed
        user.password = acc.password;
        await user.save();
        console.log(`[UPDATED] ${acc.roleName}: ${acc.username} (${acc.chemistName})`);
      }

      createdUsers.push({
        role: acc.roleName,
        username: acc.username,
        email: acc.email,
        password: acc.password,
        chemistName: acc.chemistName,
        id: user._id.toString()
      });
    }

    console.log('\n======================================================');
    console.log('PRODUCTION USERS SUCCESSFULLY SEEDED');
    console.log('======================================================');
    console.table(createdUsers);
    console.log('======================================================\n');

  } catch (error) {
    console.error('Error seeding production users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB.');
  }
}

seedProductionUsers();
