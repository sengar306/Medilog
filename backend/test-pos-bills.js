const http = require('http');
const fs = require('fs');
const path = require('path');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        const contentType = res.headers['content-type'] || '';
        let body = buffer.toString();
        if (contentType.includes('application/json')) {
          try { body = JSON.parse(body); } catch (_) {}
        }
        resolve({ statusCode: res.statusCode, headers: res.headers, body, rawBuffer: buffer });
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function uploadLogoMultipart(token, filePath) {
  const boundary = '--------------------------' + Date.now().toString(16);
  const filename = path.basename(filePath);
  const fileData = fs.readFileSync(filePath);

  let postData = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="logo"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`),
    fileData,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  return await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/whatsapp/logo',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': postData.length
    }
  }, postData);
}

async function runTest() {
  console.log('🚀 STARTING POS BILL & REFERENCE INVOICE DESIGN VERIFICATION...\n');

  try {
    // 1. Login Chemist 1
    const loginRes1 = await makeRequest({
      hostname: 'localhost', port: 5000, path: '/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ username: 'chemist1', password: 'password123' }));

    if (loginRes1.statusCode !== 200) {
      throw new Error(`Chemist 1 login failed: ${JSON.stringify(loginRes1.body)}`);
    }
    const token1 = loginRes1.body.token;
    const chemist1Id = loginRes1.body._id;
    console.log(`✅ Chemist 1 logged in successfully (ID: ${chemist1Id})`);

    // 2. Login Chemist 2
    const loginRes2 = await makeRequest({
      hostname: 'localhost', port: 5000, path: '/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ username: 'chemist2', password: 'password123' }));

    if (loginRes2.statusCode !== 200) {
      throw new Error(`Chemist 2 login failed: ${JSON.stringify(loginRes2.body)}`);
    }
    const token2 = loginRes2.body.token;
    const chemist2Id = loginRes2.body._id;
    console.log(`✅ Chemist 2 logged in successfully (ID: ${chemist2Id})`);

    // 3. Login Admin
    const loginResAdmin = await makeRequest({
      hostname: 'localhost', port: 5000, path: '/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ username: 'admin', password: 'password123' }));

    if (loginResAdmin.statusCode !== 200) {
      throw new Error(`Admin login failed: ${JSON.stringify(loginResAdmin.body)}`);
    }
    const adminToken = loginResAdmin.body.token;
    console.log(`✅ Super Admin logged in successfully`);

    // 4. Create and Upload Test Store Logo Image for Chemist 1
    const tempLogoPath = path.join(__dirname, 'temp-logo-test.png');
    // Sample 1x1 valid PNG image buffer
    const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(tempLogoPath, samplePng);

    const logoUploadRes = await uploadLogoMultipart(token1, tempLogoPath);
    console.log(`🖼️ Logo Upload Response: HTTP ${logoUploadRes.statusCode}`, logoUploadRes.body);
    if (logoUploadRes.statusCode !== 200 || !logoUploadRes.body.logoUrl) {
      throw new Error(`Logo upload failed: ${JSON.stringify(logoUploadRes.body)}`);
    }
    console.log(`✅ Chemist 1 Logo Uploaded Successfully: ${logoUploadRes.body.logoUrl}`);

    // 5. Configure Chemist 1 Profile (Store Name, Logo, DL No, Terms)
    const update1 = await makeRequest({
      hostname: 'localhost', port: 5000, path: '/whatsapp/config', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` }
    }, JSON.stringify({
      chemistName: 'MediCare Wholesale Pharmacy',
      pdfConfig: {
        gstNumber: '26CORPP3939N1ZA',
        drugLicenseNumber: 'DL-CITY-9988',
        address: '13 Health Street, Mumbai, Maharashtra',
        email: 'contact@medicarepharmacy.com',
        phone: '9345678991',
        stateName: 'Maharashtra',
        stateCode: '27',
        termsAndConditions: '1. Our Responsibility Ceases as soon as goods leaves our Premises.\n2. Goods once sold will not be taken back.',
        invoiceFooter: 'Thanks for your order! We look forward to working with you again soon.'
      }
    }));
    console.log(`✅ Chemist 1 Settings Updated: ${update1.body.message}`);

    // 6. Configure Chemist 2 Profile
    const update2 = await makeRequest({
      hostname: 'localhost', port: 5000, path: '/whatsapp/config', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token2}` }
    }, JSON.stringify({
      chemistName: 'Metro Care Pharmacy',
      pdfConfig: {
        gstNumber: '07METROCARE44',
        drugLicenseNumber: 'DL-METRO-4455',
        address: '44 Metro Station Gate 2, Delhi',
        email: 'metrocare@medilog.com',
        phone: '+91 88888 22222',
        stateName: 'Delhi',
        stateCode: '07',
        termsAndConditions: '1. No returns without bill.\n2. Store refrigerated items properly.',
        invoiceFooter: 'Metro Care wishes you speedy recovery!'
      }
    }));
    console.log(`✅ Chemist 2 Settings Updated: ${update2.body.message}`);

    // 7. Get Medicines for Chemist 1 and Chemist 2
    const medRes1 = await makeRequest({
      hostname: 'localhost', port: 5000, path: '/medicines', method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const medRes2 = await makeRequest({
      hostname: 'localhost', port: 5000, path: '/medicines', method: 'GET',
      headers: { 'Authorization': `Bearer ${token2}` }
    });

    const med1List = medRes1.body || [];
    const med2List = medRes2.body || [];

    if (med1List.length === 0 || med2List.length === 0) {
      throw new Error('Medicines empty for chemists.');
    }

    // 8. Create POS Sale 1 for Chemist 1
    const saleRes1 = await makeRequest({
      hostname: 'localhost', port: 5000, path: '/sales', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` }
    }, JSON.stringify({
      customerName: 'HealthPro Pharmacy',
      customerPhone: '09345678811',
      paymentMode: 'UPI',
      discountAmount: 0,
      items: [
        { medicineId: med1List[0]._id, quantity: 10 },
        { medicineId: med1List[1] ? med1List[1]._id : med1List[0]._id, quantity: 20 }
      ]
    }));

    if (saleRes1.statusCode !== 201) {
      throw new Error(`Sale 1 creation failed: ${JSON.stringify(saleRes1.body)}`);
    }
    const sale1Id = saleRes1.body.sale._id;
    console.log(`✅ POS Sale 1 Created for Chemist 1 (ID: ${sale1Id}, Invoice: ${saleRes1.body.sale.invoiceNumber})`);

    // 9. Fetch Chemist 1 PDF (With Uploaded Logo & Reference Green Grid Design)
    const pdfRes1 = await makeRequest({
      hostname: 'localhost', port: 5000, path: `/sales/${sale1Id}/pdf`, method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    console.log(`🎨 Chemist 1 PDF Generation Test (With Logo & Green Grid Design): HTTP ${pdfRes1.statusCode} (${pdfRes1.rawBuffer.length} bytes PDF)`);
    if (pdfRes1.statusCode !== 200 || !pdfRes1.headers['content-type'].includes('pdf')) {
      throw new Error('Failed to stream Chemist 1 PDF with logo');
    }

    // 10. Security Cross-Chemist Block Check
    const pdfCross = await makeRequest({
      hostname: 'localhost', port: 5000, path: `/sales/${sale1Id}/pdf`, method: 'GET',
      headers: { 'Authorization': `Bearer ${token2}` }
    });
    console.log(`🔒 Security Check: Chemist 2 accessing Chemist 1 PDF -> HTTP ${pdfCross.statusCode} (${JSON.stringify(pdfCross.body)})`);
    if (pdfCross.statusCode !== 403) {
      throw new Error('Expected 403 Forbidden for cross-chemist access');
    }

    // Clean temp logo file
    try { fs.unlinkSync(tempLogoPath); } catch (_) {}

    console.log('\n🎉 ALL REFERENCE INVOICE & LOGO INTEGRATION TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  }
}

runTest();
