const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const { connectDB } = require('./config/db');
const User = require('./models/User');
const Role = require('./models/Role');
const Medicine = require('./models/Medicine');
const InventoryBatch = require('./models/InventoryBatch');
const Supplier = require('./models/Supplier');
const Purchase = require('./models/Purchase');
const Sale = require('./models/Sale');
const Customer = require('./models/Customer');

async function runTests() {
  console.log('=== MULTI-TENANT ISOLATION INTEGRATION TEST ===\n');
  await connectDB();

  // 1. Ensure Roles exist
  let adminRole = await Role.findOne({ name: 'Admin' });
  if (!adminRole) adminRole = await new Role({ name: 'Admin', description: 'Administrator' }).save();

  let userRole = await Role.findOne({ name: 'User' });
  if (!userRole) userRole = await new Role({ name: 'User', description: 'Chemist' }).save();

  // 2. Setup Test Users
  let adminUser = await User.findOne({ username: 'test_admin' });
  if (!adminUser) {
    adminUser = new User({
      username: 'test_admin',
      email: 'admin@test.com',
      password: 'password123',
      role: adminRole._id,
      chemistName: 'Central Admin Store'
    });
    await adminUser.save();
  }

  let chemist1 = await User.findOne({ username: 'chemist_1' });
  if (!chemist1) {
    chemist1 = new User({
      username: 'chemist_1',
      email: 'chemist1@test.com',
      password: 'password123',
      role: userRole._id,
      chemistName: 'Chemist One Pharmacy'
    });
    await chemist1.save();
  }

  let chemist2 = await User.findOne({ username: 'chemist_2' });
  if (!chemist2) {
    chemist2 = new User({
      username: 'chemist_2',
      email: 'chemist2@test.com',
      password: 'password123',
      role: userRole._id,
      chemistName: 'Chemist Two Pharmacy'
    });
    await chemist2.save();
  }

  // 3. Generate JWT Tokens
  const secret = process.env.JWT_SECRET || 'medilog_secret_key';
  const adminToken = jwt.sign({ id: adminUser._id }, secret, { expiresIn: '1h' });
  const token1 = jwt.sign({ id: chemist1._id }, secret, { expiresIn: '1h' });
  const token2 = jwt.sign({ id: chemist2._id }, secret, { expiresIn: '1h' });

  // Helper fetch function
  const apiCall = async (method, path, body = null, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`http://localhost:5000${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });
    const status = res.status;
    let data;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    return { status, data };
  };

  let passed = 0;
  let failed = 0;

  const assert = (condition, description) => {
    if (condition) {
      console.log(`✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${description}`);
      failed++;
    }
  };

  try {
    // Scenario 1: Chemist 1 creates medicine -> Automatically assigned to Chemist 1
    const med1Res = await apiCall('POST', '/medicines', {
      name: `Paracetamol Test 1 ${Date.now()}`,
      strength: '500mg',
      category: 'Tablet'
    }, token1);
    assert(med1Res.status === 201 && med1Res.data.user._id === chemist1._id.toString(), 'Chemist 1 creates medicine -> automatically assigned to Chemist 1');
    const med1Id = med1Res.data._id;

    // Scenario 2: Chemist 2 creates medicine -> Automatically assigned to Chemist 2
    const med2Res = await apiCall('POST', '/medicines', {
      name: `Amoxicillin Test 2 ${Date.now()}`,
      strength: '250mg',
      category: 'Capsule'
    }, token2);
    assert(med2Res.status === 201 && med2Res.data.user._id === chemist2._id.toString(), 'Chemist 2 creates medicine -> automatically assigned to Chemist 2');
    const med2Id = med2Res.data._id;

    // Scenario 3: Chemist 1 fetches medicines -> Sees only Chemist 1 medicine, NOT Chemist 2
    const list1Res = await apiCall('GET', '/medicines', null, token1);
    const hasMed1InList1 = list1Res.data.some(m => m._id === med1Id);
    const hasMed2InList1 = list1Res.data.some(m => m._id === med2Id);
    assert(hasMed1InList1 && !hasMed2InList1, 'Chemist 1 GET /medicines -> sees only Chemist 1 medicine');

    // Scenario 4: Chemist 2 fetches medicines -> Sees only Chemist 2 medicine, NOT Chemist 1
    const list2Res = await apiCall('GET', '/medicines', null, token2);
    const hasMed2InList2 = list2Res.data.some(m => m._id === med2Id);
    const hasMed1InList2 = list2Res.data.some(m => m._id === med1Id);
    assert(hasMed2InList2 && !hasMed1InList2, 'Chemist 2 GET /medicines -> sees only Chemist 2 medicine');

    // Scenario 5: Super Admin fetches medicines with no query -> Sees medicines from BOTH chemists
    const adminListRes = await apiCall('GET', '/medicines', null, adminToken);
    const adminHasMed1 = adminListRes.data.some(m => m._id === med1Id);
    const adminHasMed2 = adminListRes.data.some(m => m._id === med2Id);
    assert(adminHasMed1 && adminHasMed2, 'Super Admin GET /medicines -> sees medicines from ALL chemists');

    // Scenario 6: Super Admin filters by Chemist 1 -> Sees only Chemist 1 medicine
    const adminFilterRes = await apiCall('GET', `/medicines?userId=${chemist1._id}`, null, adminToken);
    const filterHasMed1 = adminFilterRes.data.some(m => m._id === med1Id);
    const filterHasMed2 = adminFilterRes.data.some(m => m._id === med2Id);
    assert(filterHasMed1 && !filterHasMed2, 'Super Admin GET /medicines?userId=Chemist1 -> sees only Chemist 1 medicine');

    // Scenario 7: Chemist 1 tries to GET Chemist 2 medicine by ID -> 403 Forbidden BLOCK
    const directGetRes = await apiCall('GET', `/medicines/${med2Id}`, null, token1);
    assert(directGetRes.status === 403, 'Chemist 1 attempts GET /medicines/:id of Chemist 2 -> 403 Forbidden BLOCK');

    // Scenario 8: Chemist 1 tries to UPDATE Chemist 2 medicine -> 403 Forbidden BLOCK
    const updateRes = await apiCall('PUT', `/medicines/${med2Id}`, { name: 'Hacked Name' }, token1);
    assert(updateRes.status === 403, 'Chemist 1 attempts PUT /medicines/:id of Chemist 2 -> 403 Forbidden BLOCK');

    // Scenario 9: Chemist 1 tries to DELETE Chemist 2 medicine -> 403 Forbidden BLOCK
    const deleteRes = await apiCall('DELETE', `/medicines/${med2Id}`, null, token1);
    assert(deleteRes.status === 403, 'Chemist 1 attempts DELETE /medicines/:id of Chemist 2 -> 403 Forbidden BLOCK');

    // Scenario 10: Inventory Batch Isolation & 403 BLOCK test
    const batch1 = new InventoryBatch({
      medicine: med1Id,
      batchNumber: `TEST-B1-${Date.now()}`,
      user: chemist1._id,
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      quantity: 50,
      initialQuantity: 50,
      purchaseRate: 10,
      mrp: 20,
      gstPercent: 12
    });
    const savedBatch1 = await batch1.save();

    const batch2 = new InventoryBatch({
      medicine: med2Id,
      batchNumber: `TEST-B2-${Date.now()}`,
      user: chemist2._id,
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      quantity: 50,
      initialQuantity: 50,
      purchaseRate: 10,
      mrp: 20,
      gstPercent: 12
    });
    const savedBatch2 = await batch2.save();

    const chemist1BatchGet = await apiCall('GET', `/inventory/batch/${savedBatch2._id}`, null, token1);
    assert(chemist1BatchGet.status === 403, 'Chemist 1 attempts GET /inventory/batch/:id of Chemist 2 -> 403 Forbidden BLOCK');

    const chemist1BatchDelete = await apiCall('DELETE', `/inventory/batch/${savedBatch2._id}`, null, token1);
    assert(chemist1BatchDelete.status === 403, 'Chemist 1 attempts DELETE /inventory/batch/:id of Chemist 2 -> 403 Forbidden BLOCK');

    // Clean up test batches
    await InventoryBatch.findByIdAndDelete(savedBatch1._id);
    await InventoryBatch.findByIdAndDelete(savedBatch2._id);
    await Medicine.findByIdAndDelete(med1Id);
    await Medicine.findByIdAndDelete(med2Id);

  } catch (err) {
    console.error('Test execution error:', err);
  }

  console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
