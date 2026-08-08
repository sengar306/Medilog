const fs = require('fs');

const sendOrderConfirmation = async ({ customerPhone, customerName, invoiceNumber, pdfPath, config }) => {
  const token = config?.metaAccessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = config?.metaPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const businessAccountId = config?.metaBusinessId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

  if (!token || !phoneNumberId) {
    console.warn('WhatsApp Cloud API credentials are missing from user configuration and environment variables.');
    return { success: false, message: 'Missing credentials' };
  }

  if (!customerPhone) {
    return { success: false, message: 'No customer phone provided' };
  }

  // Format phone number: remove non-digits, and prepend '91' if it's a standard 10-digit Indian number
  const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
  const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  
  let mediaId = null;

  // 1. If PDF invoice path is provided, upload it to Meta Cloud API first
  if (pdfPath && fs.existsSync(pdfPath)) {
    try {
      const fileBuffer = fs.readFileSync(pdfPath);
      const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });
      
      const formData = new FormData();
      formData.append('file', fileBlob, `Invoice_${invoiceNumber}.pdf`);
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', 'document');

      console.log(`Uploading PDF invoice (${invoiceNumber}) to Meta Media API...`);
      const uploadResponse = await fetch(`https://graph.facebook.com/v25.0/${phoneNumberId}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const uploadData = await uploadResponse.json();
      if (uploadData.error) {
        console.error('Failed to upload PDF invoice to Meta Media API:', uploadData.error);
      } else {
        mediaId = uploadData.id;
        console.log(`PDF uploaded successfully. Meta Media ID: ${mediaId}`);
      }
    } catch (uploadErr) {
      console.error('Error during Meta Media API upload:', uploadErr);
    }
  }

  // 2. Prepare payload
  let payload;
  if (mediaId) {
    // Send as PDF Document
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: targetPhone,
      type: 'document',
      document: {
        id: mediaId,
        filename: `Invoice_${invoiceNumber}.pdf`,
        caption: `Here is your bill invoice ${invoiceNumber} from ${config?.businessName || 'MediLog Pharmacy'}.`
      }
    };
  } else {
    // Fallback to text template if PDF upload failed or wasn't provided
    payload = {
      messaging_product: 'whatsapp',
      to: targetPhone,
      type: 'template',
      template: {
        name: 'jaspers_market_order_confirmation_v1',
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: customerName || 'Valued Customer' },
              { type: 'text', text: invoiceNumber },
              { type: 'text', text: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
            ]
          }
        ]
      }
    };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v25.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    if (data.error) {
      console.error('WhatsApp API Error:', data.error);
      return { success: false, error: data.error };
    }
    
    console.log(`WhatsApp confirmation sent to +${targetPhone} for invoice ${invoiceNumber} (PDF: ${!!mediaId})`);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    return { success: false, error: error.message };
  } finally {
    // Cleanup temporary PDF file
    if (pdfPath && fs.existsSync(pdfPath)) {
      try {
        fs.unlinkSync(pdfPath);
        console.log(`Cleaned up temporary PDF invoice file: ${pdfPath}`);
      } catch (cleanupErr) {
        console.error('Failed to delete temp PDF file:', cleanupErr);
      }
    }
  }
};

module.exports = {
  sendOrderConfirmation
};
