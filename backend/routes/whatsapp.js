const express = require('express');
const router = express.Router();
const whatsappAuthService = require('../services/whatsappAuthService');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const jwt = require('jsonwebtoken');



const multer = require('multer');
const path = require('path');
const fs = require('fs');

const logoUploadDir = path.join(__dirname, '../uploads/logos');
if (!fs.existsSync(logoUploadDir)) {
  fs.mkdirSync(logoUploadDir, { recursive: true });
}

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, logoUploadDir),
  filename: (req, file, cb) => cb(null, `logo-${req.user._id}-${Date.now()}${path.extname(file.originalname)}`)
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExts = /jpeg|jpg|png/;
    const isExtAllowed = allowedExts.test(path.extname(file.originalname).toLowerCase());
    const isMimeAllowed = /image\/(jpeg|jpg|png)/.test(file.mimetype);
    if (isExtAllowed && isMimeAllowed) {
      return cb(null, true);
    }
    cb(new Error('Only PNG and JPEG/JPG image files are supported for store logo.'));
  }
});

// GET WhatsApp & Chemist Profile Config
router.get('/config', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const config = user.whatsappConfig || {};
    const pdfConfig = user.pdfConfig || {};
    
    const sessionStatus = whatsappAuthService.getSessionStatus();
    
    const metaAccessToken = config.metaAccessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
    const metaPhoneNumberId = config.metaPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    const metaBusinessId = config.metaBusinessId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';

    res.status(200).json({
      success: true,
      data: {
        chemistName: user.chemistName || config.businessName || user.username || '',
        logoUrl: user.logoUrl || '',
        senderNumber: config.senderNumber || '',
        businessName: config.businessName || user.chemistName || '',
        metaAccessToken,
        metaPhoneNumberId,
        metaBusinessId,
        isConfigured: !!(metaAccessToken && metaPhoneNumberId),
        
        sessionStatus: sessionStatus.status,
        isConnected: sessionStatus.isConnected,
        qrCodeDataUrl: sessionStatus.qrCodeDataUrl,
        
        pdfConfig: {
          gstNumber: pdfConfig.gstNumber || '',
          address: pdfConfig.address || '',
          email: pdfConfig.email || '',
          phone: pdfConfig.phone || '',
          stateName: pdfConfig.stateName || '',
          stateCode: pdfConfig.stateCode || '',
          drugLicenseNumber: pdfConfig.drugLicenseNumber || '',
          invoiceFooter: pdfConfig.invoiceFooter || '',
          termsAndConditions: pdfConfig.termsAndConditions || ''
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error fetching config' });
  }
});

// POST Update Chemist Config
router.post('/config', protect, async (req, res) => {
  try {
    const { chemistName, logoUrl, senderNumber, businessName, metaAccessToken, metaPhoneNumberId, metaBusinessId, pdfConfig } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user.whatsappConfig) {
      user.whatsappConfig = {
        metaAccessToken: '',
        metaPhoneNumberId: '',
        metaBusinessId: '',
        businessName: '',
        senderNumber: ''
      };
    }
    
    if (!user.pdfConfig) {
      user.pdfConfig = {
        gstNumber: '',
        address: '',
        email: '',
        phone: '',
        stateName: '',
        stateCode: '',
        drugLicenseNumber: '',
        invoiceFooter: '',
        termsAndConditions: ''
      };
    }

    if (chemistName !== undefined) {
      user.chemistName = chemistName.trim();
    }
    if (logoUrl !== undefined) {
      user.logoUrl = logoUrl;
    }
    
    if (senderNumber !== undefined) {
      user.whatsappConfig.senderNumber = senderNumber.replace(/[^0-9]/g, '');
    }
    if (businessName !== undefined) {
      user.whatsappConfig.businessName = businessName;
    }
    if (metaAccessToken !== undefined) {
      user.whatsappConfig.metaAccessToken = metaAccessToken;
    }
    if (metaPhoneNumberId !== undefined) {
      user.whatsappConfig.metaPhoneNumberId = metaPhoneNumberId;
    }
    if (metaBusinessId !== undefined) {
      user.whatsappConfig.metaBusinessId = metaBusinessId;
    }
    
    if (pdfConfig !== undefined) {
      if (pdfConfig.gstNumber !== undefined) user.pdfConfig.gstNumber = pdfConfig.gstNumber;
      if (pdfConfig.address !== undefined) user.pdfConfig.address = pdfConfig.address;
      if (pdfConfig.email !== undefined) user.pdfConfig.email = pdfConfig.email;
      if (pdfConfig.phone !== undefined) user.pdfConfig.phone = pdfConfig.phone;
      if (pdfConfig.stateName !== undefined) user.pdfConfig.stateName = pdfConfig.stateName;
      if (pdfConfig.stateCode !== undefined) user.pdfConfig.stateCode = pdfConfig.stateCode;
      if (pdfConfig.drugLicenseNumber !== undefined) user.pdfConfig.drugLicenseNumber = pdfConfig.drugLicenseNumber;
      if (pdfConfig.invoiceFooter !== undefined) user.pdfConfig.invoiceFooter = pdfConfig.invoiceFooter;
      if (pdfConfig.termsAndConditions !== undefined) user.pdfConfig.termsAndConditions = pdfConfig.termsAndConditions;
    }
    
    user.markModified('whatsappConfig');
    user.markModified('pdfConfig');
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Chemist Settings Updated successfully',
      data: {
        chemistName: user.chemistName,
        logoUrl: user.logoUrl,
        whatsappConfig: user.whatsappConfig,
        pdfConfig: user.pdfConfig
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error updating config' });
  }
});

// POST Upload Chemist Logo
router.post('/logo', protect, uploadLogo.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No logo image uploaded' });
    }

    const relativePath = `/uploads/logos/${req.file.filename}`;
    const user = await User.findById(req.user._id);
    user.logoUrl = relativePath;
    await user.save();

    // Clean old cached PDF files for this chemist user
    const billsDir = path.join(__dirname, '../uploads/bills', user._id.toString());
    if (fs.existsSync(billsDir)) {
      try {
        fs.readdirSync(billsDir).forEach(f => {
          try { fs.unlinkSync(path.join(billsDir, f)); } catch (_) {}
        });
      } catch (_) {}
    }

    res.status(200).json({
      success: true,
      message: 'Logo uploaded successfully',
      logoUrl: relativePath
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error uploading logo' });
  }
});

// GET Pairing QR Code
router.get('/qr', async (req, res) => {
  const { chemistPhone, businessName } = req.query;
  const qrData = await whatsappAuthService.generatePairingQR(chemistPhone || whatsappConfig.senderNumber, businessName || whatsappConfig.businessName);
  res.status(200).json({
    success: true,
    data: qrData
  });
});

// POST Confirm Authentication after QR Scan
router.post('/confirm-auth', (req, res) => {
  const { chemistPhone, businessName } = req.body;
  const phoneToAuth = chemistPhone || whatsappConfig.senderNumber;
  const bName = businessName || whatsappConfig.businessName;

  const authResult = whatsappAuthService.confirmAuthentication(phoneToAuth, bName);
  whatsappConfig.senderNumber = authResult.connectedNumber;
  whatsappConfig.businessName = authResult.businessName;

  res.status(200).json({
    success: true,
    message: authResult.message,
    data: authResult
  });
});

// POST Logout Session
router.post('/logout', (req, res) => {
  const result = whatsappAuthService.logoutSession();
  res.status(200).json({
    success: true,
    message: result.message,
    data: result
  });
});

// POST Send Invoice via WhatsApp Direct Automated Gateway (No Redirects)
router.post('/send-invoice', async (req, res) => {
  const { customerPhone, customerName, invoiceNumber, items, totalAmount, paymentMethod } = req.body;

  if (!customerPhone) {
    return res.status(400).json({ success: false, message: 'Customer phone number is required' });
  }

  const cleanCustomerPhone = customerPhone.replace(/[^0-9]/g, '');
  const targetPhone = cleanCustomerPhone.length === 10 ? `91${cleanCustomerPhone}` : cleanCustomerPhone;
  const invNo = invoiceNumber || `INV-${Math.floor(1000 + Math.random() * 9000)}`;
  const pdfLink = `http://localhost:5000/api/v1/invoices/${invNo}/pdf`;

  const directDispatch = await whatsappAuthService.sendDirectInvoiceMessage({
    customerPhone: targetPhone,
    customerName,
    invoiceNumber: invNo,
    items,
    totalAmount,
    paymentMethod,
    config: whatsappConfig
  });

  return res.status(200).json({
    success: true,
    sentDirectly: true,
    message: `⚡ Bill ${invNo} sent directly to +${targetPhone} via WhatsApp!`,
    data: {
      invoiceNumber: invNo,
      messageId: directDispatch.messageId,
      senderNumber: directDispatch.senderNumber,
      customerPhone: targetPhone,
      messageText: directDispatch.textMessage,
      pdfUrl: pdfLink
    }
  });
});

// POST Resend existing invoice PDF via WhatsApp Cloud API
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const { sendOrderConfirmation } = require('../services/whatsappCloudService');

router.post('/send-existing-bill', protect, async (req, res) => {
  try {
    const { saleId } = req.body;
    if (!saleId) {
      return res.status(400).json({ success: false, message: 'Sale ID is required' });
    }

    const sale = await Sale.findById(saleId).populate('customer').populate('cashier');
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    const customerPhone = sale.customer?.phone || sale.customerPhone;
    if (!customerPhone) {
      return res.status(400).json({ success: false, message: 'No customer phone number found linked to this sale.' });
    }

    const populatedItems = await SaleItem.find({ sale: sale._id }).populate('medicine');
    
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const pdfPath = path.join(tempDir, `invoice-${sale.invoiceNumber}.pdf`);
    
    // Generate beautiful PDF using current chemist user's PDF configurations
    await generateInvoicePDF(
      sale, 
      populatedItems, 
      pdfPath, 
      req.user
    );

    const whatsappResult = await sendOrderConfirmation({
      customerPhone,
      customerName: sale.customer?.name || 'Valued Customer',
      invoiceNumber: sale.invoiceNumber,
      pdfPath,
      config: req.user.whatsappConfig || {}
    });

    res.status(200).json({
      success: true,
      message: `⚡ Invoice ${sale.invoiceNumber} successfully resent to +${customerPhone} via WhatsApp!`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error sending WhatsApp invoice' });
  }
});

module.exports = router;
