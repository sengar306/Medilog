const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const InvoiceParserJob = require('../models/InvoiceParserJob');
const Medicine = require('../models/Medicine');
const Supplier = require('../models/Supplier');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/logger');

// Set up upload directory
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only Images (JPG/PNG) and PDFs are allowed!'));
    }
  }
});

// Helper: Convert file to generative AI inline part
const fileToGenerativePart = (filePath, mimeType) => {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString('base64'),
      mimeType
    }
  };
};

// Mock Parsing Simulator when GEMINI_API_KEY is not defined
const runMockParser = async (filename) => {
  console.log('Using simulated AI Parser...');
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Pools of mock data
  const mockSuppliers = [
    { name: 'Apex Pharma Distributors', gstNumber: '27AAAAA1111A1Z1', phone: '9820123456', email: 'orders@apexpharma.com', address: 'B-40, Midc Industrial Area, Pune, Maharashtra' },
    { name: 'MediLife Biotech Corp', gstNumber: '07BBBBB2222B2Z2', phone: '9110234567', email: 'sales@medilife.com', address: '12, Okhla Industrial Area, Phase-3, New Delhi' },
    { name: 'Dr. Reddys Agencies', gstNumber: '36CCCCC3333C3Z3', phone: '8888776655', email: 'billing@drreddys.com', address: 'Ameerpet Cross Roads, Hyderabad, Telangana' },
    { name: 'HealthCare Solutions', gstNumber: '19DDDDD4444D4Z4', phone: '7776665555', email: 'info@hcsolutions.com', address: 'Block C, Salt Lake, Sector-5, Kolkata' },
    { name: 'Sunrise Pharma', gstNumber: '09EEEEE5555E5Z5', phone: '9998887777', email: 'contact@sunrisepharma.com', address: 'Industrial Area Phase 1, Chandigarh' }
  ];

  const selectedSupplier = mockSuppliers[Math.floor(Math.random() * mockSuppliers.length)];
  const invoiceNum = `IN-${Math.floor(100000 + Math.random() * 900000)}`;

  // Pool of drugs
  const drugPool = [
    { name: 'Paracetamol', strength: '500mg', category: 'Tablet', genericName: 'Paracetamol', rateRange: [1.0, 3.0], gst: 12 },
    { name: 'Amoxicillin', strength: '250mg', category: 'Capsule', genericName: 'Amoxicillin', rateRange: [3.5, 6.0], gst: 18 },
    { name: 'Pantoprazole', strength: '40mg', category: 'Tablet', genericName: 'Pantoprazole', rateRange: [2.0, 4.5], gst: 12 },
    { name: 'Ibuprofen', strength: '400mg', category: 'Tablet', genericName: 'Ibuprofen', rateRange: [1.5, 3.5], gst: 12 },
    { name: 'Metformin', strength: '500mg', category: 'Tablet', genericName: 'Metformin Hydrochloride', rateRange: [2.0, 5.0], gst: 12 },
    { name: 'Cetirizine', strength: '10mg', category: 'Tablet', genericName: 'Cetirizine', rateRange: [0.8, 2.0], gst: 12 },
    { name: 'Azithromycin', strength: '500mg', category: 'Tablet', genericName: 'Azithromycin', rateRange: [8.0, 15.0], gst: 18 },
    { name: 'Aspirin', strength: '150mg', category: 'Tablet', genericName: 'Aspirin', rateRange: [0.5, 1.8], gst: 12 },
    { name: 'Atorvastatin', strength: '10mg', category: 'Tablet', genericName: 'Atorvastatin', rateRange: [4.0, 9.0], gst: 18 },
    { name: 'Diclofenac', strength: '50mg', category: 'Tablet', genericName: 'Diclofenac Sodium', rateRange: [1.2, 3.0], gst: 12 }
  ];

  // Randomly select 2 to 4 drugs from the pool
  const numItems = Math.floor(Math.random() * 3) + 2; // 2 to 4
  const selectedDrugs = [];
  const poolCopy = [...drugPool];
  
  for (let i = 0; i < numItems && poolCopy.length > 0; i++) {
    const idx = Math.floor(Math.random() * poolCopy.length);
    selectedDrugs.push(poolCopy.splice(idx, 1)[0]);
  }

  let subTotal = 0;
  let gstTotal = 0;
  const warnings = [];

  const items = selectedDrugs.map(drug => {
    // Randomize quantities
    const quantities = [50, 100, 150, 200, 300, 500];
    const qty = quantities[Math.floor(Math.random() * quantities.length)];

    // Randomize purchase rate and MRP
    const minRate = drug.rateRange[0];
    const maxRate = drug.rateRange[1];
    const rate = Math.round((minRate + Math.random() * (maxRate - minRate)) * 100) / 100;
    const mrpMultiplier = 1.5 + Math.random() * 0.7; // 1.5x to 2.2x mrp
    const mrp = Math.round((rate * mrpMultiplier) * 2) / 2; // round to nearest 0.50

    // Randomize batch number
    const batchLetters = ['PRC', 'AMX', 'PNT', 'IBU', 'MET', 'CET', 'AZI', 'ASP', 'ATO', 'DIC'];
    const letter = batchLetters[Math.floor(Math.random() * batchLetters.length)];
    const batchNum = `B-${letter}${Math.floor(100 + Math.random() * 900)}`;

    // Randomize expiry (some near expiry, some far)
    const expMonths = Math.floor(Math.random() * 33) + 3; // 3 months to 36 months
    const expDate = new Date();
    expDate.setMonth(expDate.getMonth() + expMonths);
    const expDateStr = expDate.toISOString().split('T')[0];

    if (expMonths <= 6) {
      warnings.push(`Item '${drug.name}' is expiring in less than 6 months (${expMonths} months left).`);
    }

    const itemSub = qty * rate;
    const itemGst = itemSub * (drug.gst / 100);
    subTotal += itemSub;
    gstTotal += itemGst;

    return {
      name: drug.name,
      strength: drug.strength,
      category: drug.category,
      genericName: drug.genericName,
      batchNumber: batchNum,
      expiryDate: expDateStr,
      quantity: qty,
      purchaseRate: rate,
      mrp: mrp,
      gstPercent: drug.gst,
      gstAmount: Math.round(itemGst * 100) / 100,
      totalAmount: Math.round((itemSub + itemGst) * 100) / 100
    };
  });

  return {
    supplier: selectedSupplier,
    invoice: {
      invoiceNumber: invoiceNum,
      invoiceDate: new Date().toISOString().split('T')[0]
    },
    items,
    totals: {
      subTotal: Math.round(subTotal * 100) / 100,
      gstTotal: Math.round(gstTotal * 100) / 100,
      totalAmount: Math.round((subTotal + gstTotal) * 100) / 100
    },
    warnings
  };
};

// @desc    Upload invoice and parse via Gemini (or simulator)
// @route   POST /api/invoice/upload
// @access  Private
router.post('/upload', protect, upload.single('invoice'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an invoice file (Image/PDF)' });
    }

    // Create job entry
    const job = new InvoiceParserJob({
      originalFilename: req.file.originalname,
      filePath: req.file.path,
      status: 'Processing',
      createdBy: req.user._id
    });
    const savedJob = await job.save();

    res.json({
      message: 'Invoice uploaded. Parsing started.',
      jobId: savedJob._id,
      status: 'Processing'
    });

    // Run the parsing process in background/microtask so API responds immediately
    setImmediate(async () => {
      try {
        let resultData = null;
        const apiKey = process.env.GEMINI_API_KEY;

        if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
          console.log('Sending invoice to Gemini API...');
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

          const mimeType = req.file.mimetype;
          const imagePart = fileToGenerativePart(req.file.path, mimeType);

          const prompt = `
            Extract only visible invoice data and return structured JSON.
            Do not wrap in markdown quotes. Return EXACTLY and ONLY the raw JSON block.
            Ensure keys and values exactly match this schema:
            {
              "supplier": {
                "name": "string",
                "gstNumber": "string (optional)",
                "phone": "string (optional)",
                "email": "string (optional)",
                "address": "string (optional)"
              },
              "invoice": {
                "invoiceNumber": "string",
                "invoiceDate": "YYYY-MM-DD"
              },
              "items": [
                {
                  "name": "string (name of medicine)",
                  "strength": "string (e.g. 500mg, 10ml, etc. if visible, else empty)",
                  "category": "string (Tablet, Syrup, Injection, Capsule, etc. if visible, else empty)",
                  "genericName": "string (if visible, else empty)",
                  "batchNumber": "string (extract visible batch number, else generate a standard mock if missing)",
                  "expiryDate": "YYYY-MM-DD (convert expiry to ISO date)",
                  "quantity": number,
                  "freeQuantity": "number (if visible, extract the free quantity, else default to 0)",
                  "purchaseRate": number,
                  "mrp": number,
                  "gstPercent": number
                }
              ],
              "totals": {
                "subTotal": number,
                "gstTotal": number,
                "totalAmount": number
              },
              "warnings": ["string"]
            }
          `;

          const result = await model.generateContent([prompt, imagePart]);
          let text = result.response.text().trim();
          
          // Strip any markdown codeblock wrapping if Gemini adds it
          if (text.startsWith('```json')) {
            text = text.substring(7, text.length - 3).trim();
          } else if (text.startsWith('```')) {
            text = text.substring(3, text.length - 3).trim();
          }

          resultData = JSON.parse(text);
        } else {
          resultData = await runMockParser(req.file.originalname);
        }

        // Job Success
        savedJob.status = 'Success';
        savedJob.parsedData = resultData;
        await savedJob.save();
        await logAudit('Invoice Parsed', 'AI Parser', `Parsed invoice file '${req.file.originalname}'`, req.user._id);

      } catch (err) {
        console.error('Invoice background parsing failed:', err);
        savedJob.status = 'Failed';
        savedJob.error = err.message;
        await savedJob.save();
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error uploading invoice' });
  }
});

// @desc    Get job status & results with Medicine Matching helper
// @route   GET /api/invoice/result/:jobId
// @access  Private
router.get('/result/:jobId', protect, async (req, res) => {
  try {
    const job = await InvoiceParserJob.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Parsing job not found' });
    }

    const { verifyOwnership } = require('../utils/userScope');
    if (!verifyOwnership(req, job, 'createdBy')) {
      return res.status(403).json({ message: 'Access Denied: You do not own this invoice job' });
    }

    if (job.status !== 'Success') {
      return res.json({ status: job.status, error: job.error });
    }

    // Perform medicine matching against existing database for all parsed items
    const parsedData = job.parsedData;
    const matchedItems = [];

    for (const item of parsedData.items) {
      // Clean name for better matches
      const cleanName = item.name.replace(/[^\w\s]/gi, '').trim();
      
      // Try exact or partial regex match on name or generic name within user's inventory
      let matchedMedicine = await Medicine.findOne({
        user: req.user._id,
        $or: [
          { name: new RegExp(cleanName, 'i') },
          { name: new RegExp(item.name.split(' ')[0], 'i') },
          { genericName: new RegExp(cleanName, 'i') }
        ]
      });

      matchedItems.push({
        ...item,
        matchedMedicineId: matchedMedicine ? matchedMedicine._id : null,
        matchedMedicineName: matchedMedicine ? matchedMedicine.name : null,
        confidence: matchedMedicine ? 'High' : 'None'
      });
    }

    res.json({
      status: job.status,
      parsedData: {
        ...parsedData,
        items: matchedItems
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving invoice parsing results' });
  }
});

// Support both query param or route param as requested in PDF
router.get('/result', protect, async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: 'Missing job id' });
  }
  req.params.jobId = id;
  // Redirect to route param handler
  return router.handle(req, res);
});

// @desc    Confirm purchase import from parsed invoice
// @route   POST /api/invoice/confirm
// @access  Private (Admin, User)
router.post('/confirm', protect, authorize('Admin', 'User'), async (req, res) => {
  try {
    const { supplier, invoice, items, remarks } = req.body;

    if (!supplier || !invoice || !items || items.length === 0) {
      return res.status(400).json({ message: 'Missing fields to confirm purchase' });
    }

    // 1. Resolve or Create Supplier
    let dbSupplier = await Supplier.findOne({ name: supplier.name, user: req.user._id });
    if (!dbSupplier) {
      dbSupplier = new Supplier({
        name: supplier.name,
        user: req.user._id,
        gstNumber: supplier.gstNumber,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address
      });
      await dbSupplier.save();
      await logAudit('Create Supplier', 'Supplier', `Auto-created supplier '${supplier.name}' during AI import`, req.user._id, req);
    }

    // 2. Prepare items, auto-creating medicines if not mapped
    const purchaseItemsList = [];
    for (const item of items) {
      let medicineId = item.matchedMedicineId;

      if (!medicineId) {
        // Auto-create medicine from invoice data
        const newMed = new Medicine({
          name: item.name,
          user: req.user._id,
          strength: item.strength || 'N/A',
          category: item.category || 'Tablet',
          genericName: item.genericName || item.name,
          minStockLevel: 10,
          description: 'Auto-created during invoice import'
        });
        const savedMed = await newMed.save();
        medicineId = savedMed._id;
        await logAudit('Create Medicine', 'Medicine', `Auto-created medicine '${item.name}' during AI import`, req.user._id, req);
      }

      purchaseItemsList.push({
        medicineId,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        quantity: item.quantity,
        freeQuantity: item.freeQuantity || 0,
        purchaseRate: item.purchaseRate,
        mrp: item.mrp,
        gstPercent: item.gstPercent
      });
    }

    // 3. Delegate to the purchase creation logic
    req.body = {
      supplierId: dbSupplier._id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      items: purchaseItemsList,
      remarks: remarks || 'Imported via AI Invoice Parser'
    };

    const response = await fetchCreatePurchase(req, dbSupplier._id);
    if (response.error) {
      return res.status(response.code).json({ message: response.message });
    }
    
    res.status(201).json(response.data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error confirming invoice purchase' });
  }
});

// Helper equivalent to POST /api/purchase logic
const fetchCreatePurchase = async (req, supplierId) => {
  const { invoiceNumber, invoiceDate, items, remarks } = req.body;
  const Purchase = require('../models/Purchase');
  const PurchaseItem = require('../models/PurchaseItem');
  const InventoryBatch = require('../models/InventoryBatch');
  const StockTransaction = require('../models/StockTransaction');

  try {
    let subTotal = 0;
    let gstTotal = 0;
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const qty = parseFloat(item.quantity) || 0;
      const freeQty = parseFloat(item.freeQuantity) || 0;
      const rate = parseFloat(item.purchaseRate) || 0;
      const mrp = parseFloat(item.mrp) || 0;
      const gstP = parseFloat(item.gstPercent || 0);

      const itemSubtotal = qty * rate;
      const itemGst = itemSubtotal * (gstP / 100);
      const itemTotal = itemSubtotal + itemGst;

      subTotal += itemSubtotal;
      gstTotal += itemGst;
      totalAmount += itemTotal;

      validatedItems.push({
        medicineId: item.medicineId,
        batchNumber: item.batchNumber,
        expiryDate: new Date(item.expiryDate),
        quantity: qty,
        freeQuantity: freeQty,
        purchaseRate: rate,
        mrp,
        gstPercent: gstP,
        gstAmount: itemGst,
        totalAmount: itemTotal
      });
    }

    const purchase = new Purchase({
      supplier: supplierId,
      user: req.user._id,
      invoiceNumber,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      subTotal: Math.round(subTotal * 100) / 100,
      gstTotal: Math.round(gstTotal * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      status: 'Completed',
      remarks
    });

    const savedPurchase = await purchase.save();

    for (const item of validatedItems) {
      const pItem = new PurchaseItem({
        purchase: savedPurchase._id,
        user: req.user._id,
        medicine: item.medicineId,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        quantity: item.quantity,
        freeQuantity: item.freeQuantity || 0,
        purchaseRate: item.purchaseRate,
        mrp: item.mrp,
        gstPercent: item.gstPercent,
        gstAmount: Math.round(item.gstAmount * 100) / 100,
        totalAmount: Math.round(item.totalAmount * 100) / 100
      });
      await pItem.save();

      let batch = await InventoryBatch.findOne({
        medicine: item.medicineId,
        batchNumber: item.batchNumber,
        user: req.user._id
      });

      let prevStock = 0;
      const totalQtyToAdd = item.quantity + (item.freeQuantity || 0);

      if (batch) {
        prevStock = batch.quantity;
        batch.quantity += totalQtyToAdd;
        batch.expiryDate = item.expiryDate;
        batch.purchaseRate = item.purchaseRate;
        batch.mrp = item.mrp;
        batch.gstPercent = item.gstPercent;
        batch.supplier = supplierId;
      } else {
        batch = new InventoryBatch({
          medicine: item.medicineId,
          batchNumber: item.batchNumber,
          user: req.user._id,
          expiryDate: item.expiryDate,
          quantity: totalQtyToAdd,
          initialQuantity: totalQtyToAdd,
          purchaseRate: item.purchaseRate,
          mrp: item.mrp,
          gstPercent: item.gstPercent,
          supplier: supplierId
        });
      }
      const savedBatch = await batch.save();

      const transaction = new StockTransaction({
        medicine: item.medicineId,
        batchNumber: item.batchNumber,
        transactionType: 'Purchase',
        quantity: item.quantity,
        previousStock: prevStock,
        newStock: savedBatch.quantity,
        referenceId: savedPurchase._id,
        referenceType: 'Purchase',
        remarks: `Purchased via AI Invoice import #${invoiceNumber}`,
        user: req.user._id
      });
      await transaction.save();
    }

    await logAudit(
      'Purchase Completed',
      'Purchase',
      `Processed AI import purchase invoice #${invoiceNumber} for total ${savedPurchase.totalAmount}`,
      req.user._id,
      req
    );

    return { error: false, code: 201, data: { purchase: savedPurchase, items: validatedItems } };
  } catch (err) {
    if (err.code === 11000) {
      return { error: true, code: 400, message: 'Duplicate purchase invoice for this supplier and user' };
    }
    return { error: true, code: 500, message: `Confirm purchase failed: ${err.message}` };
  }
};

module.exports = router;
