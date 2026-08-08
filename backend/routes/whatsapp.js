const express = require('express');
const router = express.Router();
const whatsappAuthService = require('../services/whatsappAuthService');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const jwt = require('jsonwebtoken');



// GET WhatsApp Config & Session Status
router.get('/config', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const config = user.whatsappConfig || {};
    
    // We keep sessionStatus mock integration for backwards compatibility 
    // with the old direct automation if needed, but focus on the Meta API keys
    const sessionStatus = whatsappAuthService.getSessionStatus();
    
    const metaAccessToken = config.metaAccessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
    const metaPhoneNumberId = config.metaPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    const metaBusinessId = config.metaBusinessId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';

    res.status(200).json({
      success: true,
      data: {
        senderNumber: config.senderNumber || '916398974633',
        businessName: config.businessName || 'MediLog Pharmacy',
        metaAccessToken,
        metaPhoneNumberId,
        metaBusinessId,
        isConfigured: !!(metaAccessToken && metaPhoneNumberId),
        
        sessionStatus: sessionStatus.status,
        isConnected: sessionStatus.isConnected,
        qrCodeDataUrl: sessionStatus.qrCodeDataUrl
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
    const { senderNumber, businessName, gatewayType, metaAccessToken, metaPhoneNumberId, metaBusinessId } = req.body;
    
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
    
    user.markModified('whatsappConfig');
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Chemist WhatsApp Settings Updated successfully',
      data: user.whatsappConfig
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error saving config' });
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

module.exports = router;
