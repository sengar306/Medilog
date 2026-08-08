const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const Purchase = require('../models/Purchase');
const PurchaseItem = require('../models/PurchaseItem');
const Medicine = require('../models/Medicine');
const InventoryBatch = require('../models/InventoryBatch');
const StockTransaction = require('../models/StockTransaction');
const AuditLog = require('../models/AuditLog');
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');

// @desc    Get dashboard metrics
// @route   GET /api/reports/dashboard
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nearExpiryThreshold = new Date();
    nearExpiryThreshold.setDate(today.getDate() + 90);

    // 1. Total sales summary (all time & today)
    const salesAllTime = await Sale.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]);
    const salesToday = await Sale.aggregate([
      { $match: { saleDate: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // 2. Total purchases summary
    const purchasesAllTime = await Purchase.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]);

    // 3. Count medicines
    const medicineCount = await Medicine.countDocuments({});

    // 4. Low stock check (stock < minStockLevel)
    const medicines = await Medicine.find({});
    const batchAgg = await InventoryBatch.aggregate([
      {
        $match: {
          quantity: { $gt: 0 },
          expiryDate: { $gte: today }
        }
      },
      {
        $group: {
          _id: '$medicine',
          totalStock: { $sum: '$quantity' }
        }
      }
    ]);
    const stockMap = {};
    batchAgg.forEach(item => {
      stockMap[item._id.toString()] = item.totalStock;
    });
    let lowStockCount = 0;
    medicines.forEach(m => {
      const stock = stockMap[m._id.toString()] || 0;
      if (stock < m.minStockLevel) lowStockCount++;
    });

    // 5. Near expiry count
    const nearExpiryCount = await InventoryBatch.countDocuments({
      quantity: { $gt: 0 },
      expiryDate: { $gte: today, $lte: nearExpiryThreshold }
    });

    // 6. Expired count
    const expiredCount = await InventoryBatch.countDocuments({
      quantity: { $gt: 0 },
      expiryDate: { $lt: today }
    });

    // 7. Monthly Sales & Purchases Chart Data (Past 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlySales = await Sale.aggregate([
      { $match: { saleDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$saleDate' },
            month: { $month: '$saleDate' }
          },
          total: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthlyPurchases = await Purchase.aggregate([
      { $match: { invoiceDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$invoiceDate' },
            month: { $month: '$invoiceDate' }
          },
          total: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 8. Recent Sales
    const recentSales = await Sale.find({}).populate('customer').populate('cashier', 'username').sort({ createdAt: -1 }).limit(5);

    // 9. Recent Activity / Audit Logs
    const recentActivity = await AuditLog.find({}).populate('user', 'username').sort({ createdAt: -1 }).limit(5);

    res.json({
      summary: {
        totalSales: salesAllTime[0] ? salesAllTime[0].total : 0,
        todaySales: salesToday[0] ? salesToday[0].total : 0,
        totalPurchases: purchasesAllTime[0] ? purchasesAllTime[0].total : 0,
        medicinesCount: medicineCount,
        lowStockCount,
        nearExpiryCount,
        expiredCount
      },
      charts: {
        sales: monthlySales,
        purchases: monthlyPurchases
      },
      recentSales,
      recentActivity
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error generating dashboard report' });
  }
});

// @desc    Get system audit logs
// @route   GET /api/reports/audit-logs
// @access  Private (Admin only)
router.get('/audit-logs', protect, async (req, res) => {
  try {
    if (req.user.role.name !== 'Admin') {
      return res.status(403).json({ message: 'Access denied: Admin only' });
    }
    const logs = await AuditLog.find({}).populate('user', 'username').sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching audit logs' });
  }
});

// @desc    Sales summary with date range filter
// @route   GET /reports/sales-summary?from=&to=
// @access  Private
router.get('/sales-summary', protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    const matchQuery = {};
    if (from || to) {
      matchQuery.saleDate = {};
      if (from) matchQuery.saleDate.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        matchQuery.saleDate.$lte = toDate;
      }
    }

    const sales = await Sale.find(matchQuery)
      .populate('customer', 'name phone')
      .populate('cashier', 'username')
      .sort({ saleDate: -1 });

    const totalRevenue = sales.reduce((s, sale) => s + sale.totalAmount, 0);
    const totalGst = sales.reduce((s, sale) => s + sale.gstTotal, 0);
    const totalDiscount = sales.reduce((s, sale) => s + sale.discountAmount, 0);
    const totalSubtotal = sales.reduce((s, sale) => s + sale.subTotal, 0);

    const paymentBreakdown = { Cash: 0, Card: 0, UPI: 0, Mixed: 0 };
    sales.forEach(sale => {
      paymentBreakdown[sale.paymentMode] = (paymentBreakdown[sale.paymentMode] || 0) + sale.totalAmount;
    });

    res.json({
      summary: {
        totalSales: sales.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalSubtotal: Math.round(totalSubtotal * 100) / 100,
        totalGst: Math.round(totalGst * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        paymentBreakdown
      },
      sales
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error generating sales summary' });
  }
});

// @desc    Top selling medicines by revenue & quantity
// @route   GET /reports/top-medicines?limit=10&from=&to=
// @access  Private
router.get('/top-medicines', protect, async (req, res) => {
  try {
    const { limit = 10, from, to } = req.query;
    const matchQuery = {};
    if (from || to) {
      matchQuery.createdAt = {};
      if (from) matchQuery.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = toDate;
      }
    }

    const topMedicines = await SaleItem.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$medicine',
          totalQuantitySold: { $sum: '$quantity' },
          totalRevenue: { $sum: '$totalAmount' },
          totalGst: { $sum: '$gstAmount' },
          salesCount: { $count: {} }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'medicines',
          localField: '_id',
          foreignField: '_id',
          as: 'medicine'
        }
      },
      { $unwind: { path: '$medicine', preserveNullAndEmptyArrays: true } }
    ]);

    res.json({ topMedicines });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching top medicines' });
  }
});

// @desc    Profit margin analysis (MRP vs purchase rate from batch)
// @route   GET /reports/profit-analysis?from=&to=
// @access  Private
router.get('/profit-analysis', protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    const matchQuery = {};
    if (from || to) {
      matchQuery.createdAt = {};
      if (from) matchQuery.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = toDate;
      }
    }

    const saleItems = await SaleItem.find(matchQuery).populate('medicine', 'name genericName category');

    // Join with inventory batches to get purchase rate
    const profitItems = [];
    for (const item of saleItems) {
      const batch = await InventoryBatch.findOne({
        medicine: item.medicine?._id,
        batchNumber: item.batchNumber
      });
      const purchaseRate = batch ? batch.purchaseRate : 0;
      const costPrice = purchaseRate * item.quantity;
      const salePrice = item.mrp * item.quantity;
      const grossProfit = salePrice - costPrice;
      const marginPercent = salePrice > 0 ? ((grossProfit / salePrice) * 100) : 0;

      profitItems.push({
        medicine: item.medicine,
        batchNumber: item.batchNumber,
        quantity: item.quantity,
        purchaseRate,
        mrp: item.mrp,
        costPrice: Math.round(costPrice * 100) / 100,
        salePrice: Math.round(salePrice * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        marginPercent: Math.round(marginPercent * 100) / 100
      });
    }

    const totalRevenue = profitItems.reduce((s, i) => s + i.salePrice, 0);
    const totalCost = profitItems.reduce((s, i) => s + i.costPrice, 0);
    const totalProfit = totalRevenue - totalCost;
    const overallMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;

    res.json({
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        overallMarginPercent: Math.round(overallMargin * 100) / 100
      },
      items: profitItems
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error generating profit analysis' });
  }
});

// @desc    GST summary report (CGST/SGST breakdown)
// @route   GET /reports/gst-summary?from=&to=
// @access  Private
router.get('/gst-summary', protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    const matchQuery = {};
    if (from || to) {
      matchQuery.createdAt = {};
      if (from) matchQuery.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = toDate;
      }
    }

    const gstBreakdown = await SaleItem.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$gstPercent',
          totalTaxableAmount: { $sum: { $multiply: ['$quantity', '$rate'] } },
          totalGstAmount: { $sum: '$gstAmount' },
          itemCount: { $count: {} }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const formattedBreakdown = gstBreakdown.map(row => ({
      gstRate: row._id,
      taxableAmount: Math.round(row.totalTaxableAmount * 100) / 100,
      totalGst: Math.round(row.totalGstAmount * 100) / 100,
      cgst: Math.round((row.totalGstAmount / 2) * 100) / 100,
      sgst: Math.round((row.totalGstAmount / 2) * 100) / 100,
      itemCount: row.itemCount
    }));

    const grandTotalGst = formattedBreakdown.reduce((s, r) => s + r.totalGst, 0);
    const grandTotalTaxable = formattedBreakdown.reduce((s, r) => s + r.taxableAmount, 0);

    res.json({
      summary: {
        grandTotalTaxable: Math.round(grandTotalTaxable * 100) / 100,
        grandTotalGst: Math.round(grandTotalGst * 100) / 100,
        grandCgst: Math.round((grandTotalGst / 2) * 100) / 100,
        grandSgst: Math.round((grandTotalGst / 2) * 100) / 100
      },
      breakdown: formattedBreakdown
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error generating GST summary' });
  }
});

// @desc    Customer purchase history
// @route   GET /reports/customer-history/:customerId
// @access  Private
router.get('/customer-history/:customerId', protect, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const sales = await Sale.find({ customer: req.params.customerId })
      .populate('cashier', 'username')
      .sort({ saleDate: -1 });

    const salesWithItems = await Promise.all(sales.map(async (sale) => {
      const items = await SaleItem.find({ sale: sale._id }).populate('medicine', 'name strength category');
      return { ...sale.toObject(), items };
    }));

    res.json({ customer, sales: salesWithItems, totalSales: sales.length, totalSpent: sales.reduce((s, sale) => s + sale.totalAmount, 0) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching customer history' });
  }
});

module.exports = router;
