const http = require('http');
require('dotenv').config();

// Change port to avoid conflicts
process.env.PORT = 3001; 
process.env.MONGODB_URI = ''; // force memory-server

console.log('--- Launching Self-Contained Integration Test ---');

// Boot server
const server = require('./server');

// Helper to make HTTP Requests
const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : null;
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: responseData });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(dataString);
    }
    req.end();
  });
};

const runTests = async () => {
  try {
    // Wait for DB memory server to initialize and seed
    console.log('Waiting 5s for server and db-memory-server boot...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\nTest 1: User Login (Admin)');
    const loginRes = await request('POST', '/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginRes.status !== 200) {
      throw new Error(`Admin login failed: ${JSON.stringify(loginRes.body)}`);
    }
    const token = loginRes.body.token;
    console.log('✓ Login successful. JWT token received.');

    console.log('\nTest 2: Create Storage Rack');
    const rackRes = await request('POST', '/medicines/racks', {
      name: 'Rack-A1',
      description: 'First row, shelf 1'
    }, token);

    if (rackRes.status !== 201) {
      throw new Error(`Rack creation failed: ${JSON.stringify(rackRes.body)}`);
    }
    const rackId = rackRes.body._id;
    console.log(`✓ Rack 'Rack-A1' created with ID: ${rackId}`);

    console.log('\nTest 3: Register Medicine in Master');
    const medRes = await request('POST', '/medicines', {
      name: 'Paracetamol',
      strength: '500mg',
      category: 'Tablet',
      genericName: 'Acetaminophen',
      rackId: rackId,
      minStockLevel: 50
    }, token);

    if (medRes.status !== 201) {
      throw new Error(`Medicine registration failed: ${JSON.stringify(medRes.body)}`);
    }
    const medicineId = medRes.body._id;
    console.log(`✓ Medicine 'Paracetamol' registered with ID: ${medicineId}`);

    console.log('\nTest 4: Register Supplier');
    const supRes = await request('POST', '/suppliers', {
      name: 'Global Biotech Wholesalers',
      contactPerson: 'Alice Smith',
      phone: '9988776655',
      email: 'sales@globalbiotech.com',
      address: 'Industrial Sector 5, Mumbai',
      gstNumber: '27GBAAA7722A1Z4'
    }, token);

    if (supRes.status !== 201) {
      throw new Error(`Supplier registration failed: ${JSON.stringify(supRes.body)}`);
    }
    const supplierId = supRes.body._id;
    console.log(`✓ Supplier 'Global Biotech Wholesalers' registered with ID: ${supplierId}`);

    console.log('\nTest 5: Purchase Two Batches of Paracetamol (FEFO setup)');
    // We buy:
    // Batch A: Expiring soon (90 days), Qty 100
    // Batch B: Expiring later (360 days), Qty 100
    const expSoon = new Date();
    expSoon.setDate(expSoon.getDate() + 90);
    const expLater = new Date();
    expLater.setDate(expLater.getDate() + 360);

    const purchaseRes = await request('POST', '/purchase', {
      supplierId: supplierId,
      invoiceNumber: 'INV-TEST-001',
      invoiceDate: new Date(),
      items: [
        {
          medicineId,
          batchNumber: 'BATCH-A',
          expiryDate: expSoon.toISOString(),
          quantity: 100,
          purchaseRate: 1.0,
          mrp: 2.5,
          gstPercent: 12
        },
        {
          medicineId,
          batchNumber: 'BATCH-B',
          expiryDate: expLater.toISOString(),
          quantity: 100,
          purchaseRate: 1.0,
          mrp: 2.5,
          gstPercent: 12
        }
      ],
      remarks: 'Test purchase setup'
    }, token);

    if (purchaseRes.status !== 201) {
      throw new Error(`Purchase insertion failed: ${JSON.stringify(purchaseRes.body)}`);
    }
    console.log('✓ Purchase recorded successfully. In-stock batches established.');

    console.log('\nTest 6: Verify Active Inventory Levels');
    const invResBefore = await request('GET', '/inventory?status=active', null, token);
    console.log(`Active Batches count: ${invResBefore.body.length}`);
    invResBefore.body.forEach(b => {
      console.log(`- Batch: ${b.batchNumber} | Quantity: ${b.quantity} | Expiry: ${new Date(b.expiryDate).toLocaleDateString()}`);
    });

    console.log('\nTest 7: POS Retail Sale of 120 units (Verifying FEFO)');
    // We expect it to consume:
    // 100 units from BATCH-A (expired/expiring soonest)
    // 20 units from BATCH-B (expiring later)
    const saleRes = await request('POST', '/sales', {
      customerName: 'Test Patient',
      customerPhone: '9000000000',
      items: [
        {
          medicineId,
          quantity: 120
        }
      ],
      discountAmount: 10, // ₹10 discount
      paymentMode: 'Cash'
    }, token);

    if (saleRes.status !== 201) {
      throw new Error(`POS Sale transaction failed: ${JSON.stringify(saleRes.body)}`);
    }
    console.log('✓ POS checkout transaction succeeded.');
    console.log(`Invoice: ${saleRes.body.sale.invoiceNumber} | Net paid: ₹${saleRes.body.sale.totalAmount}`);

    console.log('\nTest 8: Verify FEFO Batch Deductions');
    const invResAfter = await request('GET', '/inventory?status=active', null, token);
    
    // BATCH-A should be empty (quantity = 0, so not in active query)
    // BATCH-B should have 80 units left
    const batchALeft = invResAfter.body.find(b => b.batchNumber === 'BATCH-A');
    const batchBLeft = invResAfter.body.find(b => b.batchNumber === 'BATCH-B');

    console.log(`Active Batches count after sale: ${invResAfter.body.length}`);
    invResAfter.body.forEach(b => {
      console.log(`- Batch: ${b.batchNumber} | Quantity: ${b.quantity}`);
    });

    if (batchALeft) {
      throw new Error(`FEFO Error: BATCH-A should have been fully consumed (Qty 0), but found: ${batchALeft.quantity}`);
    }
    if (!batchBLeft || batchBLeft.quantity !== 80) {
      throw new Error(`FEFO Error: BATCH-B should have 80 units left, but found: ${batchBLeft ? batchBLeft.quantity : 'Not found'}`);
    }
    console.log('✓ SUCCESS: FEFO rule correctly fully consumed BATCH-A (Qty 0) and deducted 20 from BATCH-B (Qty 80 left).');

    console.log('\nTest 9: Verify Reports & Dashboard Endpoints');
    const dashRes = await request('GET', '/reports/dashboard', null, token);
    if (dashRes.status !== 200) {
      throw new Error(`Dashboard generation failed: ${JSON.stringify(dashRes.body)}`);
    }
    console.log(`✓ Dashboard summary total sales: ₹${dashRes.body.summary.totalSales}`);
    console.log(`✓ Dashboard summary low stock count: ${dashRes.body.summary.lowStockCount} (Paracetamol min level is 50, current total stock is 80, so it is safe)`);

    console.log('\nTest 10: Create and Get Customers');
    const custCreateRes = await request('POST', '/customers', {
      name: 'Bob Miller',
      phone: '9888877777',
      email: 'bob@example.com',
      address: '22 Baker St, London'
    }, token);
    
    if (custCreateRes.status !== 201) {
      throw new Error(`Customer creation failed: ${JSON.stringify(custCreateRes.body)}`);
    }
    console.log(`✓ Customer created: ${custCreateRes.body.name}`);

    const custGetRes = await request('GET', '/customers', null, token);
    if (custGetRes.status !== 200 || custGetRes.body.length === 0) {
      throw new Error(`Get customers failed: ${JSON.stringify(custGetRes.body)}`);
    }
    console.log(`✓ Customer list fetched. Count: ${custGetRes.body.length}`);

    console.log('\n--- ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err.message);
    process.exit(1);
  }
};

runTests();
