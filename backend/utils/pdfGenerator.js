const PDFDocument = require('pdfkit');
const fs = require('fs');

const generateInvoicePDF = (sale, items, outputPath, businessName = 'MediLog Pharmacy') => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Title / Header
      doc.fontSize(20).font('Helvetica-Bold').text(businessName, { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('INVOICE / BILL RECEIPT', { align: 'center' });
      doc.moveDown();

      // Divider
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Invoice Meta Details
      doc.fontSize(10).text(`Invoice No: ${sale.invoiceNumber}`);
      doc.text(`Date: ${new Date(sale.createdAt).toLocaleString()}`);
      doc.text(`Payment Mode: ${sale.paymentMode || 'Cash'}`);
      if (sale.customer) {
        doc.text(`Customer Name: ${sale.customer.name || 'Valued Customer'}`);
        doc.text(`Customer Phone: ${sale.customer.phone || ''}`);
      }
      doc.moveDown();

      // Divider
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Table Header
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Item Name', 50, doc.y, { width: 180, continued: true });
      doc.text('Batch', 230, doc.y, { width: 70, continued: true });
      doc.text('Qty', 300, doc.y, { width: 40, continued: true });
      doc.text('MRP', 340, doc.y, { width: 50, continued: true });
      doc.text('GST %', 390, doc.y, { width: 50, continued: true });
      doc.text('Total', 440, doc.y);
      doc.font('Helvetica');
      doc.moveDown();

      // Table Body
      items.forEach((item) => {
        const name = item.medicine ? item.medicine.name : 'Unknown Medicine';
        const batch = item.batchNumber || '-';
        const qty = item.quantity || 0;
        const rate = item.mrp || item.rate || 0;
        const gst = item.gstPercent || 0;
        const total = item.totalAmount || 0;

        doc.text(name, 50, doc.y, { width: 180, continued: true });
        doc.text(batch, 230, doc.y, { width: 70, continued: true });
        doc.text(qty.toString(), 300, doc.y, { width: 40, continued: true });
        doc.text(rate.toFixed(2), 340, doc.y, { width: 50, continued: true });
        doc.text(`${gst}%`, 390, doc.y, { width: 50, continued: true });
        doc.text(total.toFixed(2), 440, doc.y);
      });
      doc.moveDown();

      // Divider
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Totals
      doc.fontSize(11).font('Helvetica-Bold');
      const subtotalVal = sale.subtotal || sale.totalAmount;
      doc.text(`Subtotal: INR ${subtotalVal.toFixed(2)}`, { align: 'right' });
      if (sale.discountAmount) {
        doc.text(`Discount: -INR ${sale.discountAmount.toFixed(2)}`, { align: 'right' });
      }
      const taxVal = sale.taxAmount || 0;
      doc.text(`GST Total: INR ${taxVal.toFixed(2)}`, { align: 'right' });
      doc.fontSize(13).text(`Grand Total: INR ${sale.totalAmount.toFixed(2)}`, { align: 'right' });

      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica-Oblique').text('Thank you for your purchase! Get well soon.', { align: 'center' });

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
