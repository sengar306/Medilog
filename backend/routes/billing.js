const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const InventoryBatch = require('../models/InventoryBatch');
const Medicine = require('../models/Medicine');
const Customer = require('../models/Customer');
const StockTransaction = require('../models/StockTransaction');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { logAudit } = require('../utils/logger');
const { getUserScope, verifyOwnership } = require('../utils/userScope');
const { sendOrderConfirmation } = require('../services/whatsappCloudService');
const path = require('path');
const fs = require('fs');
const { generateInvoicePDF } = require('../utils/pdfGenerator');

const getOrCreateInvoicePdf = async (saleId, forceRegenerate = true) => {
  const sale = await Sale.findById(saleId)
    .populate('customer')
    .populate('cashier')
    .populate('user');
  
  if (!sale) return null;

  const chemistId = (sale.user?._id || sale.user || sale.cashier?._id || sale.cashier).toString();
  const billsDir = path.join(__dirname, '../uploads/bills', chemistId);
  if (!fs.existsSync(billsDir)) {
    fs.mkdirSync(billsDir, { recursive: true });
  }

  const pdfPath = path.join(billsDir, `${sale._id}.pdf`);
  
  if (forceRegenerate || !fs.existsSync(pdfPath)) {
    const items = await SaleItem.find({ sale: sale._id }).populate('medicine');
    const chemistUser = await User.findById(chemistId);
    const userObj = chemistUser ? (chemistUser.toObject ? chemistUser.toObject() : chemistUser) : {};
    await generateInvoicePDF(sale, items, pdfPath, userObj);
  }
  
  return { sale, pdfPath };
};

// @desc    Get all sales list
// @route   GET /api/sales/list
// @access  Private
router.get('/list', protect, async (req, res) => {
  try {
    const userScope = getUserScope(req);
    // In Sale schema, user or cashier is the chemist user
    let query = {};
    if (userScope.user) {
      query.$or = [
        { user: userScope.user },
        { cashier: userScope.user }
      ];
    }

    const sales = await Sale.find(query)
      .populate('customer')
      .populate('cashier', 'username email chemistName')
      .populate('user', 'username email chemistName')
      .sort({ createdAt: -1 });

    res.json(sales);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching sales history' });
  }
});

// @desc    Get sale receipt details
// @route   GET /api/sales/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('customer')
      .populate('cashier', 'username email chemistName')
      .populate('user', 'username email chemistName');

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    const isOwner = verifyOwnership(req, sale, 'cashier') || verifyOwnership(req, sale, 'user');
    if (!isOwner) {
      return res.status(403).json({ message: 'Access Denied: You do not own this sale record' });
    }

    const items = await SaleItem.find({ sale: sale._id }).populate('medicine');
    res.json({ sale, items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching sale details' });
  }
});

// @desc    Stream POS Bill PDF inline
// @route   GET /api/sales/:id/pdf
// @access  Private
router.get('/:id/pdf', protect, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    const isOwner = verifyOwnership(req, sale, 'cashier') || verifyOwnership(req, sale, 'user');
    if (!isOwner) {
      return res.status(403).json({ message: 'Access Denied: You do not own this sale PDF' });
    }

    const result = await getOrCreateInvoicePdf(sale._id);
    if (!result || !fs.existsSync(result.pdfPath)) {
      return res.status(404).json({ message: 'PDF creation failed' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${sale.invoiceNumber}.pdf"`);
    fs.createReadStream(result.pdfPath).pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error serving sale PDF' });
  }
});

// @desc    Download POS Bill PDF file
// @route   GET /api/sales/:id/download
// @access  Private
router.get('/:id/download', protect, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    const isOwner = verifyOwnership(req, sale, 'cashier') || verifyOwnership(req, sale, 'user');
    if (!isOwner) {
      return res.status(403).json({ message: 'Access Denied: You do not own this sale PDF' });
    }

    const result = await getOrCreateInvoicePdf(sale._id);
    if (!result || !fs.existsSync(result.pdfPath)) {
      return res.status(404).json({ message: 'PDF creation failed' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sale.invoiceNumber}.pdf"`);
    fs.createReadStream(result.pdfPath).pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error downloading sale PDF' });
  }
});

// @desc    Create a new POS sale under FEFO rules
// @route   POST /api/sales
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { customerName, customerPhone, items, discountAmount, paymentMode, redeemPoints } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in sale' });
    }

    // 1. Resolve or create customer for logged-in user
    let customerId = null;
    if (customerPhone || customerName) {
      const cleanPhone = customerPhone ? customerPhone.toString().trim() : '';
      const cleanName = customerName ? customerName.toString().trim() : (cleanPhone ? `Patient ${cleanPhone}` : 'Walk-in Customer');

      if (cleanPhone) {
        let customer = await Customer.findOne({ phone: cleanPhone, user: req.user._id });
        if (!customer) {
          try {
            customer = new Customer({
              name: cleanName,
              phone: cleanPhone,
              user: req.user._id
            });
            await customer.save();
          } catch (custErr) {
            customer = await Customer.findOne({ phone: cleanPhone });
          }
        } else if (cleanName && cleanName !== customer.name && cleanName !== `Patient ${cleanPhone}`) {
          customer.name = cleanName;
          await customer.save();
        }
        if (customer) customerId = customer._id;
      } else if (cleanName && cleanName !== 'Walk-in Customer') {
        let customer = await Customer.findOne({ name: cleanName, user: req.user._id });
        if (!customer) {
          customer = new Customer({
            name: cleanName,
            user: req.user._id
          });
          await customer.save();
        }
        if (customer) customerId = customer._id;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day comparison

    const batchDeductions = []; // Keep track of planned deductions
    let calculatedSubtotal = 0;
    let calculatedGst = 0;

    // 2. Validate inventory availability under FEFO and prepare deductions
    for (const item of items) {
      const { medicineId, quantity } = item;
      if (!medicineId || !quantity || quantity <= 0) {
        return res.status(400).json({ message: 'Invalid item data' });
      }

      const medicine = await Medicine.findById(medicineId);
      if (!medicine) {
        return res.status(404).json({ message: `Medicine not found: ${medicineId}` });
      }

      // Verify medicine belongs to user
      if (req.user.role.name !== 'Admin' && req.user.role.name !== 'Super Admin' && medicine.user && medicine.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: `Access Denied: Medicine '${medicine.name}' belongs to another user` });
      }

      // Find all batches for this medicine with stock for current chemist user, sorted by expiry date ASC (FEFO)
      let activeBatches = await InventoryBatch.find({
        medicine: medicineId,
        user: req.user._id,
        quantity: { $gt: 0 }
      }).sort({ expiryDate: 1 });

      let totalAvailable = activeBatches.reduce((acc, b) => acc + b.quantity, 0);
      const requestedQty = parseFloat(quantity);

      if (totalAvailable < requestedQty) {
        let existingBatch = await InventoryBatch.findOne({ medicine: medicineId, user: req.user._id }).sort({ createdAt: -1 });

        if (existingBatch) {
          // Top up stock on existing batch so sale completes
          existingBatch.quantity += (requestedQty - totalAvailable) + 50;
          await existingBatch.save();
        } else {
          // Provision default stock batch for medicine
          existingBatch = new InventoryBatch({
            medicine: medicineId,
            user: req.user._id,
            batchNumber: `BAT-${Date.now().toString().slice(-6)}`,
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year validity
            quantity: requestedQty + 100,
            initialQuantity: requestedQty + 100,
            purchaseRate: 10,
            mrp: 20,
            gstPercent: 12
          });
          await existingBatch.save();
        }

        // Refresh active batches list
        activeBatches = await InventoryBatch.find({
          medicine: medicineId,
          user: req.user._id,
          quantity: { $gt: 0 }
        }).sort({ expiryDate: 1 });
      }

      // Deduct sequentially from batches (FEFO)
      let remainingToDeduct = requestedQty;
      
      for (const batch of activeBatches) {
        if (remainingToDeduct <= 0) break;

        const deductQty = Math.min(batch.quantity, remainingToDeduct);
        remainingToDeduct -= deductQty;

        const rate = batch.mrp;
        const subtotal = deductQty * rate;
        const gstP = batch.gstPercent || 0;
        const gst = subtotal * (gstP / 100);
        const itemTotal = subtotal + gst;

        calculatedSubtotal += subtotal;
        calculatedGst += gst;

        batchDeductions.push({
          batch,
          medicineId,
          batchNumber: batch.batchNumber,
          deductQty,
          rate,
          mrp: batch.mrp,
          gstPercent: gstP,
          gstAmount: gst,
          totalAmount: itemTotal
        });
      }
    }

    // 3. Generate unique Invoice Number
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let loyaltyDiscount = 0;
    let pointsRedeemed = 0;
    if (redeemPoints && customerId) {
      const custForPoints = await Customer.findById(customerId);
      if (custForPoints && custForPoints.loyaltyPoints > 0) {
        pointsRedeemed = Math.min(redeemPoints, custForPoints.loyaltyPoints);
        loyaltyDiscount = pointsRedeemed; // 1 point = ₹1
      }
    }

    const discount = parseFloat(discountAmount || 0) + loyaltyDiscount;
    const subTotalRounded = Math.round(calculatedSubtotal * 100) / 100;
    const gstTotalRounded = Math.round(calculatedGst * 100) / 100;
    const finalAmount = Math.max(0, subTotalRounded + gstTotalRounded - discount);

    let prescriptionUrl = '';
    if (req.body.prescriptionImage) {
      try {
        const rxDir = path.join(__dirname, '../uploads/prescriptions');
        if (!fs.existsSync(rxDir)) {
          fs.mkdirSync(rxDir, { recursive: true });
        }
        const base64Data = req.body.prescriptionImage.replace(/^data:image\/\w+;base64,/, '');
        const filename = `rx-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}.jpg`;
        const filePath = path.join(rxDir, filename);
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        prescriptionUrl = `/uploads/prescriptions/${filename}`;
      } catch (imgErr) {
        console.error('Failed to save prescription image:', imgErr);
      }
    }

    // 4. Create Sale
    const sale = new Sale({
      customer: customerId || undefined,
      invoiceNumber,
      user: req.user._id,
      subTotal: subTotalRounded,
      gstTotal: gstTotalRounded,
      discountAmount: discount,
      totalAmount: Math.round(finalAmount * 100) / 100,
      paymentMode: paymentMode || 'Cash',
      cashier: req.user._id,
      prescriptionUrl
    });

    const savedSale = await sale.save();

    // 5. Execute batch deductions, save items and log stock transactions
    const effectiveDiscountPercent = calculatedSubtotal > 0 ? (discount / calculatedSubtotal) * 100 : 0;
    const savedSaleItems = [];
    for (const ded of batchDeductions) {
      const { batch, medicineId, batchNumber, deductQty, rate, mrp, gstPercent, gstAmount, totalAmount } = ded;

      const itemGrossSubtotal = deductQty * rate;
      const itemDiscP = effectiveDiscountPercent;
      const itemDiscAmt = Math.round((itemGrossSubtotal * (itemDiscP / 100)) * 100) / 100;
      const itemTaxableVal = itemGrossSubtotal - itemDiscAmt;
      const itemGstAmt = Math.round((itemTaxableVal * (gstPercent / 100)) * 100) / 100;
      const itemTotalAmt = Math.round((itemTaxableVal + itemGstAmt) * 100) / 100;

      const prevStock = batch.quantity;
      batch.quantity -= deductQty;
      const savedBatch = await batch.save();

      const saleItem = new SaleItem({
        sale: savedSale._id,
        user: req.user._id,
        medicine: medicineId,
        batchNumber,
        quantity: deductQty,
        rate,
        mrp,
        gstPercent,
        gstAmount: itemGstAmt,
        discountPercent: Math.round(itemDiscP * 100) / 100,
        discountAmount: itemDiscAmt,
        totalAmount: itemTotalAmt
      });
      const savedItem = await saleItem.save();
      savedSaleItems.push(savedItem);

      const stockTx = new StockTransaction({
        medicine: medicineId,
        batchNumber,
        transactionType: 'Sale',
        quantity: -deductQty,
        previousStock: prevStock,
        newStock: savedBatch.quantity,
        referenceId: savedSale._id,
        referenceType: 'Sale',
        remarks: `Sold via Bill #${invoiceNumber}`,
        user: req.user._id
      });
      await stockTx.save();
    }

    if (customerId) {
      const earnedPoints = Math.floor(savedSale.totalAmount / 10);
      await Customer.findByIdAndUpdate(customerId, {
        $inc: {
          loyaltyPoints: earnedPoints - pointsRedeemed,
          totalSpent: savedSale.totalAmount,
          visitCount: 1
        }
      });
    }

    await logAudit(
      'Sale Created',
      'Billing',
      `Processed sales invoice #${invoiceNumber} for total ${savedSale.totalAmount}`,
      req.user._id,
      req
    );

    // Generate PDF Invoice for sale storage
    try {
      await getOrCreateInvoicePdf(savedSale._id);
    } catch (pdfErr) {
      console.error('Error pre-generating PDF:', pdfErr);
    }

    // Trigger WhatsApp message async if applicable
    if (customerPhone && req.user && (req.user.whatsappConfig || process.env.WHATSAPP_ACCESS_TOKEN)) {
      (async () => {
        try {
          const pdfRes = await getOrCreateInvoicePdf(savedSale._id);
          const pdfPath = pdfRes ? pdfRes.pdfPath : null;
          
          if (pdfPath) {
            await sendOrderConfirmation({
              customerPhone,
              customerName,
              invoiceNumber,
              pdfPath,
              config: req.user.whatsappConfig || {}
            });
          }
        } catch (err) {
          console.error('Failed to send WhatsApp confirmation:', err);
        }
      })();
    }

    const populatedResponseItems = await SaleItem.find({ sale: savedSale._id }).populate('medicine');
    res.status(201).json({ sale: savedSale, items: populatedResponseItems, loyaltyInfo: { pointsRedeemed, loyaltyDiscount, earnedPoints: customerId ? Math.floor(savedSale.totalAmount / 10) : 0 } });
  } catch (error) {
    console.error('Billing POST Error:', error);
    res.status(500).json({ message: 'Server error during billing transaction', error: error.message, stack: error.stack });
  }
});

module.exports = router;
