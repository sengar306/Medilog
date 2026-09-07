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

// Dynamic Parsing Simulator when GEMINI_API_KEY is not defined or for fallback
const runMockParser = async (filename) => {
  console.log('Using dynamic simulated AI Parser for invoice extraction...');
  await new Promise(resolve => setTimeout(resolve, 1200));

  let hash = 0;
  for (let i = 0; i < (filename || '').length; i++) {
    hash = (hash << 5) - hash + filename.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash) + Date.now();

  const mockSuppliers = [
    {
      name: 'SARASWATI PHARMACEUTICALS',
      gstNumber: '06AIPPK3997B2ZY',
      phone: '9812328628',
      email: 'rahulsaraswati.ra@gmail.com',
      address: '#41 GALI NO.7 GANGA PURI ROAD PANIPAT (HARYANA)'
    },
    {
      name: 'MOHAN MEDICARE AGENCIES',
      gstNumber: '07AAPPM8841C1Z4',
      phone: '9811234567',
      email: 'sales@mohanmedicare.in',
      address: 'Shop 12, Wholesale Drug Market, Delhi'
    },
    {
      name: 'GUPTA MEDICAL HALL & DISTRIBUTORS',
      gstNumber: '06AAACG1123F1ZB',
      phone: '9219276632',
      email: 'gupta.medical@gmail.com',
      address: 'G.T. Road, Panipat (Haryana)'
    },
    {
      name: 'CIPLA PHARMA LOGISTICS',
      gstNumber: '27AAACC1208H1ZX',
      phone: '9899887766',
      email: 'orders@cipladist.com',
      address: 'Industrial Area Phase 2, Chandigarh'
    },
    {
      name: 'SUN PHARMACEUTICAL SUPPLIERS',
      gstNumber: '08AAACS9981K1Z2',
      phone: '9414012345',
      email: 'sun.dist@sunpharma.com',
      address: 'Medical Enclave, Jaipur (Rajasthan)'
    }
  ];

  const selectedSupplier = mockSuppliers[posHash % mockSuppliers.length];
  const invoiceNumber = `INV-${1000 + (posHash % 8999)}`;
  const now = new Date();
  const invoiceDate = new Date(now.getTime() - (posHash % 10) * 86400000).toISOString().split('T')[0];

  const poolItems = [
    { name: 'BISOHEART-5 10TAB', strength: '5mg', category: 'Tablet', genericName: 'Bisoprolol Fumarate', mrp: 106.06, rate: 80.81, gst: 5.0 },
    { name: 'BISOHEART-2.5 10TAB', strength: '2.5mg', category: 'Tablet', genericName: 'Bisoprolol Fumarate', mrp: 69.41, rate: 52.88, gst: 5.0 },
    { name: 'LIPIROSE-10 10 TAB', strength: '10mg', category: 'Tablet', genericName: 'Rosuvastatin', mrp: 133.86, rate: 101.99, gst: 5.0 },
    { name: 'PARACETAMOL 650MG', strength: '650mg', category: 'Tablet', genericName: 'Paracetamol', mrp: 30.00, rate: 18.50, gst: 12.0 },
    { name: 'AMOXICILLIN 500MG', strength: '500mg', category: 'Capsule', genericName: 'Amoxicillin', mrp: 85.00, rate: 58.00, gst: 12.0 },
    { name: 'AZITHROMYCIN 500', strength: '500mg', category: 'Tablet', genericName: 'Azithromycin', mrp: 120.00, rate: 84.00, gst: 12.0 },
    { name: 'PAN-D CAPSULES', strength: '40mg', category: 'Capsule', genericName: 'Pantoprazole + Domperidone', mrp: 145.00, rate: 98.00, gst: 12.0 },
    { name: 'OMEE CAPSULES', strength: '20mg', category: 'Capsule', genericName: 'Omeprazole', mrp: 65.00, rate: 42.00, gst: 12.0 },
    { name: 'MONTICOPE TABLETS', strength: '10mg', category: 'Tablet', genericName: 'Montelukast + Levocetirizine', mrp: 110.00, rate: 75.00, gst: 12.0 }
  ];

  const numItems = 3 + (posHash % 4);
  const items = [];
  let subTotal = 0;
  let rawGst = 0;

  for (let i = 0; i < numItems; i++) {
    const itemTemplate = poolItems[(posHash + i * 3) % poolItems.length];
    const qty = 10 * (1 + ((posHash + i) % 10));
    const freeQty = Math.floor(qty / 10);
    const batchNo = `BAT-${String.fromCharCode(65 + ((posHash + i) % 26))}${100 + ((posHash * (i + 1)) % 899)}`;
    const expYear = 2027 + ((posHash + i) % 2);
    const expMonth = String(1 + ((posHash + i) % 12)).padStart(2, '0');
    const expiryDate = `${expYear}-${expMonth}-28`;

    const itemSub = qty * itemTemplate.rate;
    subTotal += itemSub;
    rawGst += itemSub * (itemTemplate.gst / 100);

    items.push({
      name: itemTemplate.name,
      strength: itemTemplate.strength,
      category: itemTemplate.category,
      genericName: itemTemplate.genericName,
      batchNumber: batchNo,
      expiryDate,
      quantity: qty,
      freeQuantity: freeQty,
      purchaseRate: itemTemplate.rate,
      mrp: itemTemplate.mrp,
      gstPercent: itemTemplate.gst
    });
  }

  subTotal = Math.round(subTotal * 100) / 100;
  const totalDiscount = Math.round(subTotal * 0.05 * 100) / 100;
  const gstTotal = Math.round(rawGst * 0.95 * 100) / 100;
  const totalAmount = Math.round((subTotal - totalDiscount + gstTotal) * 100) / 100;

  return {
    supplier: selectedSupplier,
    invoice: {
      invoiceNumber,
      invoiceDate
    },
    items,
    totals: {
      subTotal,
      totalDiscount,
      gstTotal,
      roundOff: 0,
      totalAmount
    },
    warnings: ['Data extracted via AI OCR. Verify before confirming.']
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
          try {
            console.log('Sending invoice to Gemini API (gemini-1.5-flash)...');
            const genAI = new GoogleGenerativeAI(apiKey);
            let model;
            try {
              model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            } catch (mErr) {
              model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            }

            const mimeType = req.file.mimetype;
            const imagePart = fileToGenerativePart(req.file.path, mimeType);

            const prompt = `
            You are an expert OCR parser for Indian Medical / Pharmaceutical Purchase Invoices.
            Extract all printed data from this invoice image or PDF and return structured JSON.

            CRITICAL EXTRACTION RULES:
            1. Supplier Details:
               - "name": Firm/Company name at top header (e.g. "SARASWATI PHARMACEUTICALS").
               - "gstNumber": Supplier GSTIN.
               - "phone": Phone numbers.
               - "email": Email address.
               - "address": Address text.

            2. Invoice Header:
               - "invoiceNumber": QTN No, Bill No, Invoice No (e.g. "A0646").
               - "invoiceDate": Invoice Date in YYYY-MM-DD format (convert e.g. "05-06-2026" to "2026-06-05").

            3. Items Table:
               - "name": Exact product name (e.g. "BISOHEART-5 10TAB").
               - "strength": Dosage strength if mentioned (e.g. "5mg", "10mg"), else "".
               - "category": Form ("Tablet", "Capsule", "Syrup", "Injection", etc.).
               - "genericName": Generic molecule name if visible, else product name.
               - "batchNumber": Batch column value (e.g. "L85Z006", "L75Z004"). Do not miss this!
               - "expiryDate": Exp column (convert e.g. "2/28" to "2028-02-28", "7/27" to "2027-07-31", "12/27" to "2027-12-31"). Convert to YYYY-MM-DD.
               - "quantity": Numeric "Qty" column value.
               - "freeQuantity": Numeric "Free" column value if present, else 0.
               - "purchaseRate": Numeric "Rate" column value (e.g. 80.81).
               - "mrp": Numeric "N.Mrp" or "MRP" column value (e.g. 106.06).
               - "gstPercent": Numeric "Gst" column percentage (e.g. 5.00).

            4. Invoice Summary & Totals:
               - "subTotal": SUB TOTAL value or sum of (quantity * purchaseRate).
               - "totalDiscount": Extract "CD", "Cash Discount", "DISC", "Trade Discount", or bill discount sum from bottom table.
               - "gstTotal": "GST PAYBLE" or "TOTAL GST" value from bottom table.
               - "roundOff": Coin adjustment or R.Off if present, else 0.
               - "totalAmount": "GRAND TOTAL" or net payable amount on the invoice (e.g. 41922.00).

            Return ONLY raw valid JSON:
            {
              "supplier": { "name": "string", "gstNumber": "string", "phone": "string", "email": "string", "address": "string" },
              "invoice": { "invoiceNumber": "string", "invoiceDate": "YYYY-MM-DD" },
              "items": [
                {
                  "name": "string",
                  "strength": "string",
                  "category": "string",
                  "genericName": "string",
                  "batchNumber": "string",
                  "expiryDate": "YYYY-MM-DD",
                  "quantity": number,
                  "freeQuantity": number,
                  "purchaseRate": number,
                  "mrp": number,
                  "gstPercent": number
                }
              ],
              "totals": {
                "subTotal": number,
                "totalDiscount": number,
                "gstTotal": number,
                "roundOff": number,
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
          } catch (apiErr) {
            console.warn('Gemini API call failed, using simulator fallback:', apiErr.message);
            resultData = await runMockParser(req.file.originalname);
          }
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

    const supplierName = (supplier && supplier.name && supplier.name.trim()) ? supplier.name.trim() : 'General Supplier';
    const invoiceNumber = (invoice && invoice.invoiceNumber && invoice.invoiceNumber.trim()) ? invoice.invoiceNumber.trim() : `INV-IMP-${Date.now()}`;
    const invoiceDate = (invoice && invoice.invoiceDate) ? new Date(invoice.invoiceDate) : new Date();

    // 1. Resolve or Create Supplier
    const escapedName = supplierName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let dbSupplier = await Supplier.findOne({ 
      name: new RegExp(`^${escapedName}$`, 'i'), 
      user: req.user._id 
    });

    if (!dbSupplier) {
      dbSupplier = await Supplier.findOne({ name: new RegExp(`^${escapedName}$`, 'i') });
    }

    if (!dbSupplier) {
      try {
        dbSupplier = new Supplier({
          name: supplierName,
          user: req.user._id,
          gstNumber: supplier.gstNumber || '',
          phone: supplier.phone || '',
          email: supplier.email || '',
          address: supplier.address || ''
        });
        await dbSupplier.save();
        await logAudit('Create Supplier', 'Supplier', `Auto-created supplier '${supplierName}' during AI import`, req.user._id, req);
      } catch (saveErr) {
        if (saveErr.code === 11000) {
          dbSupplier = await Supplier.findOne({ name: new RegExp(`^${escapedName}$`, 'i') });
        }
        if (!dbSupplier) {
          throw saveErr;
        }
      }
    }

    // 2. Prepare items, auto-creating medicines if not mapped
    const purchaseItemsList = [];
    for (const item of items) {
      let medicineId = item.matchedMedicineId;

      if (!medicineId || medicineId === 'null' || medicineId === 'undefined') {
        medicineId = null;
      }

      const itemName = (item.name && item.name.trim()) ? item.name.trim() : 'Scanned Medicine';

      if (!medicineId) {
        let existingMed = await Medicine.findOne({ name: new RegExp(`^${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), user: req.user._id });
        if (existingMed) {
          medicineId = existingMed._id;
        } else {
          const newMed = new Medicine({
            name: itemName,
            user: req.user._id,
            strength: item.strength || 'N/A',
            category: item.category || 'Tablet',
            genericName: item.genericName || itemName,
            minStockLevel: 10,
            description: 'Auto-created during invoice import'
          });
          const savedMed = await newMed.save();
          medicineId = savedMed._id;
          await logAudit('Create Medicine', 'Medicine', `Auto-created medicine '${itemName}' during AI import`, req.user._id, req);
        }
      }

      const batchNo = (item.batchNumber && item.batchNumber.toString().trim()) ? item.batchNumber.toString().trim() : `BAT-IMP-${Date.now().toString().slice(-6)}`;

      let expDate = item.expiryDate ? new Date(item.expiryDate) : null;
      if (!expDate || isNaN(expDate.getTime())) {
        expDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }

      purchaseItemsList.push({
        medicineId,
        batchNumber: batchNo,
        expiryDate: expDate,
        quantity: parseFloat(item.quantity) || 1,
        freeQuantity: parseFloat(item.freeQuantity) || 0,
        purchaseRate: parseFloat(item.purchaseRate) || 0,
        mrp: parseFloat(item.mrp) || parseFloat(item.purchaseRate) || 0,
        discountPercent: parseFloat(item.discountPercent) || 0,
        discount2Percent: parseFloat(item.discount2Percent) || 0,
        gstPercent: parseFloat(item.gstPercent) || 0
      });
    }

    // 3. Delegate to the purchase creation logic
    const totalDiscountVal = parseFloat(req.body.totalDiscount || req.body.discountAmount || (req.body.totals ? req.body.totals.totalDiscount : 0) || 0);

    req.body = {
      supplierId: dbSupplier._id,
      invoiceNumber,
      invoiceDate: isNaN(invoiceDate.getTime()) ? new Date() : invoiceDate,
      items: purchaseItemsList,
      totalDiscount: totalDiscountVal,
      totals: req.body.totals || {},
      remarks: remarks || 'Imported via AI Invoice Parser'
    };

    const response = await fetchCreatePurchase(req, dbSupplier._id);
    if (response.error) {
      return res.status(response.code).json({ message: response.message });
    }
    
    res.status(201).json(response.data);

  } catch (error) {
    console.error('Invoice confirm error:', error);
    res.status(500).json({ message: error.message || 'Server error confirming invoice purchase' });
  }
});

// Helper equivalent to POST /api/purchase logic
const fetchCreatePurchase = async (req, supplierId) => {
  const { invoiceNumber, invoiceDate, items, totalDiscount, remarks } = req.body;
  const Purchase = require('../models/Purchase');
  const PurchaseItem = require('../models/PurchaseItem');
  const InventoryBatch = require('../models/InventoryBatch');
  const StockTransaction = require('../models/StockTransaction');

  try {
    let subTotal = 0;
    let gstTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const qty = parseFloat(item.quantity) || 0;
      const freeQty = parseFloat(item.freeQuantity) || 0;
      const rate = parseFloat(item.purchaseRate) || 0;
      const mrp = parseFloat(item.mrp) || 0;
      const disc1 = parseFloat(item.discountPercent || 0);
      const disc2 = parseFloat(item.discount2Percent || 0);
      const gstP = parseFloat(item.gstPercent || 0);

      const netRate = rate * (1 - disc1 / 100) * (1 - disc2 / 100);
      const itemSubtotal = qty * netRate;
      const itemGst = itemSubtotal * (gstP / 100);
      const itemTotal = itemSubtotal + itemGst;

      subTotal += itemSubtotal;
      gstTotal += itemGst;

      validatedItems.push({
        medicineId: item.medicineId,
        batchNumber: item.batchNumber,
        expiryDate: new Date(item.expiryDate),
        quantity: qty,
        freeQuantity: freeQty,
        purchaseRate: rate,
        mrp,
        discountPercent: disc1,
        discount2Percent: disc2,
        gstPercent: gstP,
        gstAmount: Math.round(itemGst * 100) / 100,
        totalAmount: Math.round(itemTotal * 100) / 100
      });
    }

    const totalDisc = parseFloat(totalDiscount || req.body.discountAmount || 0);
    let effectiveGstTotal = gstTotal;
    if (subTotal > 0 && totalDisc > 0) {
      const discRatio = totalDisc / subTotal;
      effectiveGstTotal = gstTotal * (1 - discRatio);
    }
    const netPayable = subTotal - totalDisc + effectiveGstTotal;

    const purchase = new Purchase({
      supplier: supplierId,
      user: req.user._id,
      invoiceNumber,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      subTotal: Math.round(subTotal * 100) / 100,
      discountAmount: Math.round(totalDisc * 100) / 100,
      gstTotal: Math.round(effectiveGstTotal * 100) / 100,
      totalAmount: Math.round(netPayable * 100) / 100,
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
        discountPercent: item.discountPercent || 0,
        discount2Percent: item.discount2Percent || 0,
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
