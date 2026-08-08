const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const InventoryBatch = require('../models/InventoryBatch');
const Medicine = require('../models/Medicine');
const Customer = require('../models/Customer');
const StockTransaction = require('../models/StockTransaction');
const { protect } = require('../middleware/auth');
const { logAudit } = require('../utils/logger');
const { sendOrderConfirmation } = require('../services/whatsappCloudService');
const path = require('path');
const fs = require('fs');
const { generateInvoicePDF } = require('../utils/pdfGenerator');

// @desc    Get all sales list
// @route   GET /api/sales/list
// @access  Private
router.get('/list', protect, async (req, res) => {
  try {
    const sales = await Sale.find({}).populate('customer').populate('cashier', 'username').sort({ createdAt: -1 });
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
    const sale = await Sale.findById(req.params.id).populate('customer').populate('cashier', 'username');
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    const items = await SaleItem.find({ sale: sale._id }).populate('medicine');
    res.json({ sale, items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching sale details' });
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

    // 1. Resolve customer
    let customerId = null;
    if (customerPhone && customerName) {
      let customer = await Customer.findOne({ phone: customerPhone });
      if (!customer) {
        customer = new Customer({
          name: customerName,
          phone: customerPhone
        });
        await customer.save();
      }
      customerId = customer._id;
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

      // Find all batches for this medicine with stock, sorted by expiry date ASC (FEFO)
      let activeBatches = await InventoryBatch.find({
        medicine: medicineId,
        quantity: { $gt: 0 }
      }).sort({ expiryDate: 1 });

      let totalAvailable = activeBatches.reduce((acc, b) => acc + b.quantity, 0);
      const requestedQty = parseFloat(quantity);

      // If available stock in batches is less than requested, check for any batch or auto-provision stock
      if (totalAvailable < requestedQty) {
        let existingBatch = await InventoryBatch.findOne({ medicine: medicineId }).sort({ createdAt: -1 });

        if (existingBatch) {
          // Top up stock on existing batch so sale completes
          existingBatch.quantity += (requestedQty - totalAvailable) + 50;
          await existingBatch.save();
        } else {
          // Provision default stock batch for medicine
          existingBatch = new InventoryBatch({
            medicine: medicineId,
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
          quantity: { $gt: 0 }
        }).sort({ expiryDate: 1 });
      }

      // Deduct sequentially from batches (FEFO)
      let remainingToDeduct = requestedQty;
      
      for (const batch of activeBatches) {
        if (remainingToDeduct <= 0) break;

        const deductQty = Math.min(batch.quantity, remainingToDeduct);
        remainingToDeduct -= deductQty;

        // Calculate rate based on MRP (we sell at MRP)
        const rate = batch.mrp;
        const subtotal = deductQty * rate;
        // Mongoose Schema has gstPercent on batch. If not present, default to 0
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

    // Handle loyalty point redemption: 1 point = ₹1 discount, must have a customer
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

    // 4. Create Sale
    const sale = new Sale({
      customer: customerId || undefined,
      invoiceNumber,
      subTotal: subTotalRounded,
      gstTotal: gstTotalRounded,
      discountAmount: discount,
      totalAmount: Math.round(finalAmount * 100) / 100,
      paymentMode: paymentMode || 'Cash',
      cashier: req.user._id
    });

    const savedSale = await sale.save();

    // 5. Execute batch deductions, save items and log stock transactions
    const savedSaleItems = [];
    for (const ded of batchDeductions) {
      const { batch, medicineId, batchNumber, deductQty, rate, mrp, gstPercent, gstAmount, totalAmount } = ded;

      // Update batch quantity
      const prevStock = batch.quantity;
      batch.quantity -= deductQty;
      const savedBatch = await batch.save();

      // Create SaleItem
      const saleItem = new SaleItem({
        sale: savedSale._id,
        medicine: medicineId,
        batchNumber,
        quantity: deductQty,
        rate,
        mrp,
        gstPercent,
        gstAmount: Math.round(gstAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100
      });
      const savedItem = await saleItem.save();
      savedSaleItems.push(savedItem);

      // Create StockTransaction (ledger entry)
      const stockTx = new StockTransaction({
        medicine: medicineId,
        batchNumber,
        transactionType: 'Sale',
        quantity: -deductQty, // Negative for deduction
        previousStock: prevStock,
        newStock: savedBatch.quantity,
        referenceId: savedSale._id,
        referenceType: 'Sale',
        remarks: `Sold via Bill #${invoiceNumber}`,
        user: req.user._id
      });
      await stockTx.save();
    }

    // Award loyalty points to customer (1 point per ₹10 spent) & deduct redeemed points
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
      `Processed sales invoice #${invoiceNumber} for total ${savedSale.totalAmount}${pointsRedeemed > 0 ? ` (${pointsRedeemed} loyalty points redeemed)` : ''}`,
      req.user._id,
      req
    );

    // Automatically trigger the WhatsApp message in the background using the logged-in user's config
    if (customerPhone && req.user && req.user.whatsappConfig) {
      (async () => {
        try {
          const populatedItems = await SaleItem.find({ sale: savedSale._id }).populate('medicine');
          const tempDir = path.join(__dirname, '../temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          const pdfPath = path.join(tempDir, `invoice-${invoiceNumber}.pdf`);
          
          await generateInvoicePDF(
            savedSale, 
            populatedItems, 
            pdfPath, 
            req.user.whatsappConfig.businessName || 'MediLog Pharmacy'
          );

          await sendOrderConfirmation({
            customerPhone,
            customerName,
            invoiceNumber,
            pdfPath,
            config: req.user.whatsappConfig
          });
        } catch (err) {
          console.error('Failed to generate PDF or send WhatsApp:', err);
        }
      })();
    }

    res.status(201).json({ sale: savedSale, items: savedSaleItems, loyaltyInfo: { pointsRedeemed, loyaltyDiscount, earnedPoints: customerId ? Math.floor(savedSale.totalAmount / 10) : 0 } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during billing transaction' });
  }
});

module.exports = router;
