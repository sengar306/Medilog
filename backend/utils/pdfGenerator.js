const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

function numberToWords(num) {
  const a = ['', 'ONE ', 'TWO ', 'THREE ', 'FOUR ', 'FIVE ', 'SIX ', 'SEVEN ', 'EIGHT ', 'NINE ', 'TEN ', 'ELEVEN ', 'TWELVE ', 'THIRTEEN ', 'FOURTEEN ', 'FIFTEEN ', 'SIXTEEN ', 'SEVENTEEN ', 'EIGHTEEN ', 'NINETEEN '];
  const b = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  if ((num = num.toString()).length > 9) return 'OVERFLOW';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'CRORE ' : '';
  str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'LAKH ' : '';
  str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'THOUSAND ' : '';
  str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'HUNDRED ' : '';
  str += (Number(n[5]) != 0) ? ((str != '') ? 'AND ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'RUPEES ONLY' : 'RUPEES ONLY';
  return str.trim();
}

const generateInvoicePDF = async (sale, items = [], outputPath, user = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const whatsappConfig = user.whatsappConfig || {};
      const pdfConfig = user.pdfConfig || {};

      const chemistName = user.chemistName || whatsappConfig.businessName || user.username || 'MediCare Wholesale Pharmacy';
      const gstNumber = pdfConfig.gstNumber || '26CORPP3939N1ZA';
      const licenseNo = pdfConfig.drugLicenseNumber || 'DL-2026/PHARM/101';
      const address = pdfConfig.address || '13 Health Street, City, State, India';
      const email = pdfConfig.email || 'contact@medicarepharmacy.com';
      const phone = pdfConfig.phone || '9345678991';
      const stateName = pdfConfig.stateName || 'Maharashtra';
      const stateCode = pdfConfig.stateCode || '27';
      const invoiceFooter = pdfConfig.invoiceFooter || 'Thanks for your order! We look forward to working with you again soon.';
      const terms = pdfConfig.termsAndConditions || '1. Our Responsibility Ceases as soon as goods leaves our Premises.\n2. Goods once sold will not be taken back.\n3. Delivery Ex-Premises.';

      // Robust Logo Path Resolution across multi-candidate directories
      let logoPath = null;
      if (user && user.logoUrl) {
        const filename = path.basename(user.logoUrl);
        const cleanUrl = user.logoUrl.replace(/^[/\\]+/, '');
        const candidatePaths = [
          path.resolve(__dirname, '../uploads/logos', filename),
          path.resolve(process.cwd(), 'backend/uploads/logos', filename),
          path.resolve(process.cwd(), 'uploads/logos', filename),
          path.resolve(__dirname, '../../uploads/logos', filename),
          path.resolve(process.cwd(), cleanUrl)
        ];
        if (path.isAbsolute(user.logoUrl)) {
          candidatePaths.unshift(user.logoUrl);
        }
        for (const p of candidatePaths) {
          if (fs.existsSync(p)) {
            try {
              if (fs.statSync(p).isFile()) {
                logoPath = p;
                break;
              }
            } catch (_) {}
          }
        }
      }

      // Generate UPI QR Code Buffer
      let qrBuffer = null;
      try {
        const upiId = pdfConfig.phone ? `${pdfConfig.phone.replace(/[^0-9]/g, '')}@icici` : 'medicare@icici';
        const grandTotalVal = sale.totalAmount || 0;
        const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(chemistName)}&am=${grandTotalVal.toFixed(2)}&cu=INR`;
        qrBuffer = await QRCode.toBuffer(upiString, { margin: 1, width: 120 });
      } catch (qrErr) {
        console.error('Failed to generate QR buffer:', qrErr);
      }

      const doc = new PDFDocument({ size: 'A4', margin: 30 });
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Color Palette matching reference image
      const primaryGreen = '#2d6a4f';
      const secondaryBg = '#d8f3dc';
      const borderGreen = '#52b788';
      const darkText = '#1b4332';
      const mutedText = '#495057';

      // --- 1. Top Header ---
      const drawHeader = (isContinuation = false) => {
        let textLeft = 30;

        if (logoPath) {
          try {
            const buf = Buffer.alloc(4);
            const fd = fs.openSync(logoPath, 'r');
            fs.readSync(fd, buf, 0, 4, 0);
            fs.closeSync(fd);
            const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
            const isJpg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;

            if (isPng || isJpg) {
              doc.image(logoPath, 30, 25, { fit: [65, 55] });
              textLeft = 105;
            } else {
              console.warn('Logo format unsupported by PDFKit:', logoPath);
              logoPath = null;
            }
          } catch (imgErr) {
            console.error('Error rendering logo in PDF:', imgErr);
            logoPath = null;
          }
        }

        if (!logoPath) {
          // Default Green Cross Logo Badge
          doc.rect(30, 25, 60, 55).fill(primaryGreen);
          doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text('Medi', 30, 38, { width: 60, align: 'center' });
          doc.fontSize(10).text('Care', 30, 56, { width: 60, align: 'center' });
          textLeft = 105;
        }

        doc.fillColor(primaryGreen);
        doc.fontSize(16).font('Helvetica-Bold').text(chemistName, textLeft, 25, { width: 280 });

        doc.fontSize(8.5).font('Helvetica').fillColor(darkText);
        doc.text(address, textLeft, doc.y + 2, { width: 280 });
        doc.text(`Phone: ${phone}  |  Email: ${email}`, textLeft, doc.y + 2);
        doc.text(`State: ${stateName} (${stateCode})`, textLeft, doc.y + 2);

        // Right side promo box / tagline
        doc.rect(380, 25, 185, 45).fill('#e8f5e9');
        doc.fillColor(primaryGreen).fontSize(8.5).font('Helvetica-Bold').text('A single stop for all your Healthcare needs!', 385, 34, { width: 175, align: 'center' });
        doc.fillColor(darkText).fontSize(9).text('Buy 1 Get 1 Free', 385, 52, { width: 175, align: 'center' });

        // Divider Rule
        doc.moveTo(30, 85).lineTo(565, 85).strokeColor(darkText).lineWidth(1.5).stroke();
      };

      drawHeader(false);

      let currentY = 90;

      // --- 2. GSTIN & Tax Invoice Title Banner ---
      doc.rect(30, currentY, 535, 20).strokeColor(borderGreen).lineWidth(1).stroke();
      doc.fillColor(darkText).fontSize(9).font('Helvetica-Bold');
      doc.text(`GSTIN : ${gstNumber}`, 35, currentY + 5);

      doc.fillColor(primaryGreen).fontSize(12).font('Helvetica-Bold');
      doc.text('TAX INVOICE', 220, currentY + 4, { width: 125, align: 'center' });

      doc.fillColor(mutedText).fontSize(7.5).font('Helvetica-Bold');
      doc.text('ORIGINAL FOR RECIPIENT', 440, currentY + 6, { width: 120, align: 'right' });

      currentY += 24;

      // --- 3. Customer & Invoice Details Grid (2 Columns) ---
      const clientName = sale.customer?.name || 'Walk-in Customer';
      const clientPhone = sale.customer?.phone || 'N/A';
      const invoiceNo = sale.invoiceNumber || '—';
      const saleDateObj = new Date(sale.createdAt || sale.saleDate || Date.now());
      const invoiceDate = saleDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const paymentMode = sale.paymentMode || 'Cash';

      const gridStartY = currentY;
      const gridHeight = 70;

      doc.rect(30, gridStartY, 535, gridHeight).strokeColor(borderGreen).lineWidth(1).stroke();
      doc.moveTo(300, gridStartY).lineTo(300, gridStartY + gridHeight).stroke();

      // Left Column: Customer Detail
      doc.rect(30, gridStartY, 270, 14).fill(secondaryBg);
      doc.fillColor(darkText).fontSize(8).font('Helvetica-Bold').text('Customer Detail', 35, gridStartY + 3);

      doc.fillColor(darkText).fontSize(8).font('Helvetica-Bold');
      doc.text('M/S', 35, gridStartY + 18);
      doc.font('Helvetica').text(clientName, 90, gridStartY + 18);

      doc.font('Helvetica-Bold').text('Phone', 35, gridStartY + 30);
      doc.font('Helvetica').text(clientPhone, 90, gridStartY + 30);

      doc.font('Helvetica-Bold').text('GSTIN', 35, gridStartY + 42);
      doc.font('Helvetica').text(sale.customer?.gstNumber || 'N/A', 90, gridStartY + 42);

      doc.font('Helvetica-Bold').text('Place of Supply', 35, gridStartY + 54);
      doc.font('Helvetica').text(`${stateName} (${stateCode})`, 90, gridStartY + 54);

      // Right Column: Invoice Detail
      doc.font('Helvetica-Bold').text('Invoice No.', 308, gridStartY + 6);
      doc.font('Helvetica').text(invoiceNo, 380, gridStartY + 6);

      doc.font('Helvetica-Bold').text('Invoice Date', 308, gridStartY + 20);
      doc.font('Helvetica').text(invoiceDate, 380, gridStartY + 20);

      doc.font('Helvetica-Bold').text('Payment Method', 308, gridStartY + 34);
      doc.font('Helvetica').text(paymentMode, 380, gridStartY + 34);

      doc.font('Helvetica-Bold').text('D.L. No.', 308, gridStartY + 48);
      doc.font('Helvetica').text(licenseNo, 380, gridStartY + 48);

      currentY = gridStartY + gridHeight + 6;

      // --- 4. Products Table Header ---
      const drawTableHeader = (yPos) => {
        doc.rect(30, yPos, 535, 18).fill(secondaryBg);
        doc.fillColor(darkText).fontSize(7.5).font('Helvetica-Bold');
        doc.text('Sr. No.', 32, yPos + 5, { width: 28, align: 'center' });
        doc.text('Name of Product / Service', 64, yPos + 5, { width: 155 });
        doc.text('Batch No', 222, yPos + 5, { width: 55, align: 'center' });
        doc.text('Expiry', 280, yPos + 5, { width: 45, align: 'center' });
        doc.text('Qty', 328, yPos + 5, { width: 35, align: 'center' });
        doc.text('MRP', 366, yPos + 5, { width: 45, align: 'right' });
        doc.text('Rate', 414, yPos + 5, { width: 45, align: 'right' });
        doc.text('Disc.(%)', 462, yPos + 5, { width: 40, align: 'right' });
        doc.text('Taxable Value', 505, yPos + 5, { width: 55, align: 'right' });
      };

      drawTableHeader(currentY);
      currentY += 18;

      const tableStartY = currentY - 18;

      // --- 5. Render Table Items with Multi-Page Pagination ---
      doc.fillColor('#1e293b').fontSize(8).font('Helvetica');

      let totalQtySum = 0;
      let totalTaxableSum = 0;

      items.forEach((item, index) => {
        if (currentY > 710) {
          // Draw table border for page
          doc.rect(30, tableStartY, 535, currentY - tableStartY).strokeColor(borderGreen).lineWidth(1).stroke();
          doc.addPage();
          drawHeader(true);
          currentY = 90;
          drawTableHeader(currentY);
          currentY += 18;
          doc.fillColor('#1e293b').fontSize(8).font('Helvetica');
        }

        const name = item.medicine ? `${item.medicine.name} ${item.medicine.strength || ''}`.trim() : 'Medicine Item';
        const batchNo = item.batchNumber || 'BAT-01';
        const expDate = item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Dec 2026';
        const qty = item.quantity || 0;
        const mrp = item.mrp || 0;
        const rate = item.rate || item.mrp || 0;
        
        const grossSubtotal = qty * rate;
        let discP = (item.discountPercent !== undefined && item.discountPercent !== null && item.discountPercent > 0)
          ? item.discountPercent
          : ((sale.subTotal && sale.subTotal > 0 && sale.discountAmount) ? (sale.discountAmount / sale.subTotal) * 100 : 0);

        let itemDiscAmt = (item.discountAmount !== undefined && item.discountAmount !== null && item.discountAmount > 0)
          ? item.discountAmount
          : (grossSubtotal * (discP / 100));

        const taxableValue = Math.max(0, grossSubtotal - itemDiscAmt);

        totalQtySum += qty;
        totalTaxableSum += taxableValue;

        doc.text((index + 1).toString(), 32, currentY + 4, { width: 28, align: 'center' });
        doc.text(name, 64, currentY + 4, { width: 155, height: 12 });
        doc.text(batchNo, 222, currentY + 4, { width: 55, align: 'center' });
        doc.text(expDate, 280, currentY + 4, { width: 45, align: 'center' });
        doc.text(qty.toString(), 328, currentY + 4, { width: 35, align: 'center' });
        doc.text(mrp.toFixed(2), 366, currentY + 4, { width: 45, align: 'right' });
        doc.text(rate.toFixed(2), 414, currentY + 4, { width: 45, align: 'right' });
        doc.text(discP.toFixed(1), 462, currentY + 4, { width: 40, align: 'right' });
        doc.text(taxableValue.toFixed(2), 505, currentY + 4, { width: 55, align: 'right' });

        currentY += 16;
      });

      const tableBottom = Math.max(currentY, tableStartY + 100);

      // Draw vertical column grid lines
      doc.rect(30, tableStartY, 535, tableBottom - tableStartY).strokeColor(borderGreen).lineWidth(1).stroke();
      doc.moveTo(60, tableStartY).lineTo(60, tableBottom).stroke();
      doc.moveTo(220, tableStartY).lineTo(220, tableBottom).stroke();
      doc.moveTo(278, tableStartY).lineTo(278, tableBottom).stroke();
      doc.moveTo(325, tableStartY).lineTo(325, tableBottom).stroke();
      doc.moveTo(363, tableStartY).lineTo(363, tableBottom).stroke();
      doc.moveTo(412, tableStartY).lineTo(412, tableBottom).stroke();
      doc.moveTo(460, tableStartY).lineTo(460, tableBottom).stroke();
      doc.moveTo(503, tableStartY).lineTo(503, tableBottom).stroke();

      // Bottom Row: Table Totals
      doc.rect(30, tableBottom, 535, 16).fill(secondaryBg);
      doc.fillColor(darkText).fontSize(8).font('Helvetica-Bold');
      doc.text('Total', 280, tableBottom + 4, { width: 45, align: 'right' });
      doc.text(totalQtySum.toString(), 328, tableBottom + 4, { width: 35, align: 'center' });
      doc.text(`Rs. ${totalTaxableSum.toFixed(2)}`, 495, tableBottom + 4, { width: 65, align: 'right' });

      currentY = tableBottom + 20;

      // Check overflow for summary & signatures
      if (currentY + 160 > 790) {
        doc.addPage();
        currentY = 40;
      }

      // --- 6. Amount in Words ---
      const grandTotalVal = sale.totalAmount !== undefined ? sale.totalAmount : totalTaxableSum;
      doc.fillColor(mutedText).fontSize(8).font('Helvetica');
      doc.text('Total in words', 30, currentY);
      doc.fillColor(darkText).fontSize(8.5).font('Helvetica-Bold');
      doc.text(numberToWords(Math.round(grandTotalVal)), 30, currentY + 10);

      currentY += 26;

      // --- 7. Tax Summary Breakdown Box ---
      const gstVal = sale.gstTotal || 0;
      const cgstVal = gstVal / 2;
      const sgstVal = gstVal / 2;
      const discountVal = sale.discountAmount || 0;
      const grossSubTotalVal = sale.subTotal || (totalTaxableSum + discountVal);

      doc.rect(30, currentY, 535, 30).strokeColor(borderGreen).lineWidth(1).stroke();
      doc.rect(30, currentY, 535, 14).fill(secondaryBg);
      
      doc.fillColor(darkText).fontSize(7.5).font('Helvetica-Bold');
      doc.text('Taxable Value', 35, currentY + 3, { width: 80 });
      doc.text('CGST', 120, currentY + 3, { width: 65 });
      doc.text('SGST', 190, currentY + 3, { width: 65 });
      doc.text('Total Tax', 260, currentY + 3, { width: 70, align: 'right' });
      doc.text('Less: Discount', 335, currentY + 3, { width: 90, align: 'right' });
      doc.text('Grand Total', 430, currentY + 3, { width: 130, align: 'right' });

      doc.font('Helvetica').fontSize(8);
      doc.text(`Rs. ${grossSubTotalVal.toFixed(2)}`, 35, currentY + 17);
      doc.text(`Rs. ${cgstVal.toFixed(2)}`, 120, currentY + 17);
      doc.text(`Rs. ${sgstVal.toFixed(2)}`, 190, currentY + 17);
      doc.text(`Rs. ${gstVal.toFixed(2)}`, 260, currentY + 17, { width: 70, align: 'right' });
      doc.text(`-Rs. ${discountVal.toFixed(2)}`, 335, currentY + 17, { width: 90, align: 'right' });
      doc.font('Helvetica-Bold').text(`Rs. ${grandTotalVal.toFixed(2)}`, 430, currentY + 17, { width: 130, align: 'right' });

      currentY += 35;

      // --- 8. Bank Details, UPI QR Code & Authorised Signature ---
      const bottomBoxY = currentY;
      const bottomBoxHeight = 85;

      doc.rect(30, bottomBoxY, 535, bottomBoxHeight).strokeColor(borderGreen).lineWidth(1).stroke();
      doc.moveTo(330, bottomBoxY).lineTo(330, bottomBoxY + bottomBoxHeight).stroke();

      // Left: Bank / Payment Details & QR Code
      doc.rect(30, bottomBoxY, 300, 14).fill(secondaryBg);
      doc.fillColor(darkText).fontSize(8).font('Helvetica-Bold').text('Bank / Payment Details', 35, bottomBoxY + 3);

      doc.fillColor(darkText).fontSize(7.5).font('Helvetica-Bold');
      doc.text('Account Name', 35, bottomBoxY + 18);
      doc.font('Helvetica').text(chemistName, 105, bottomBoxY + 18);

      doc.font('Helvetica-Bold').text('UPI ID', 35, bottomBoxY + 30);
      doc.font('Helvetica').text(pdfConfig.phone ? `${pdfConfig.phone.replace(/[^0-9]/g, '')}@icici` : 'medicare@icici', 105, bottomBoxY + 30);

      doc.font('Helvetica-Bold').text('D.L. Number', 35, bottomBoxY + 42);
      doc.font('Helvetica').text(licenseNo, 105, bottomBoxY + 42);

      doc.font('Helvetica-Bold').text('GSTIN', 35, bottomBoxY + 54);
      doc.font('Helvetica').text(gstNumber, 105, bottomBoxY + 54);

      // Render UPI QR Code on the right of Bank details box
      if (qrBuffer) {
        try {
          doc.image(qrBuffer, 245, bottomBoxY + 16, { fit: [55, 55] });
          doc.fillColor(mutedText).fontSize(6.5).font('Helvetica-Bold').text('Pay using UPI', 245, bottomBoxY + 73, { width: 55, align: 'center' });
        } catch (_) {}
      }

      // Right: Authorised Signature Box
      doc.fillColor(mutedText).fontSize(7.5).font('Helvetica').text('Certified that the particulars given above are true and correct.', 335, bottomBoxY + 8, { width: 225, align: 'center' });
      doc.fillColor(darkText).fontSize(8.5).font('Helvetica-Bold').text(`For ${chemistName.toUpperCase()}`, 335, bottomBoxY + 22, { width: 225, align: 'center' });

      doc.fillColor(mutedText).fontSize(7.5).font('Helvetica').text('Authorised Signatory', 335, bottomBoxY + 68, { width: 225, align: 'center' });

      currentY = bottomBoxY + bottomBoxHeight + 6;

      // --- 9. Terms and Conditions & Footer Tagline ---
      doc.rect(30, currentY, 535, 32).strokeColor(borderGreen).lineWidth(1).stroke();
      doc.fillColor(darkText).fontSize(7.5).font('Helvetica-Bold').text('Terms and Conditions', 35, currentY + 3);
      doc.fillColor(mutedText).fontSize(6.5).font('Helvetica').text(terms, 35, currentY + 13, { width: 520 });

      currentY += 36;
      doc.fillColor(primaryGreen).fontSize(8.5).font('Helvetica-Bold').text(invoiceFooter, 30, currentY, { width: 535, align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        resolve();
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (e) {
      reject(e);
    }
  });
};

module.exports = {
  generateInvoicePDF
};
