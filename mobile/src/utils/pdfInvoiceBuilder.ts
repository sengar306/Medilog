import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNPrint from 'react-native-print';
import Share from 'react-native-share';

export interface InvoiceData {
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    medicineName: string;
    batchNumber?: string;
    quantity: number;
    rate: number;
    mrp: number;
    gstPercent: number;
    totalAmount: number;
  }>;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMode: string;
  createdAt: string;
  businessName: string;
}

export class PDFInvoiceBuilder {
  static buildHTML(data: InvoiceData): string {
    const itemsRows = data.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.medicineName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.batchNumber || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">INR ${item.mrp.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.gstPercent}%</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">INR ${item.totalAmount.toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    return `
      <html>
        <head>
          <style>
            body { font-family: Helvetica, Arial, sans-serif; color: #333; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #6200ee; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #6200ee; margin: 0; }
            .subtitle { font-size: 12px; color: #666; margin: 5px 0 0 0; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 11px; line-height: 1.6; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            .th { background-color: #6200ee; color: white; padding: 8px; font-weight: bold; text-align: left; }
            .totals { float: right; width: 250px; text-align: right; line-height: 1.8; font-size: 12px; }
            .footer { text-align: center; margin-top: 50px; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${data.businessName}</div>
            <div class="subtitle">INVOICE / BILL RECEIPT</div>
          </div>
          
          <table style="width: 100%; margin-bottom: 20px; font-size: 11px;">
            <tr>
              <td style="vertical-align: top; width: 50%;">
                <strong>Invoice No:</strong> ${data.invoiceNumber}<br/>
                <strong>Date:</strong> ${new Date(data.createdAt).toLocaleString()}<br/>
                <strong>Payment Mode:</strong> ${data.paymentMode}
              </td>
              <td style="vertical-align: top; width: 50%; text-align: right;">
                <strong>Customer Name:</strong> ${data.customerName}<br/>
                <strong>Phone:</strong> ${data.customerPhone || '-'}
              </td>
            </tr>
          </table>

          <table class="table">
            <thead>
              <tr>
                <th class="th" style="width: 40%;">Item Name</th>
                <th class="th" style="width: 15%; text-align: center;">Batch</th>
                <th class="th" style="width: 10%; text-align: center;">Qty</th>
                <th class="th" style="width: 12%; text-align: right;">Rate (MRP)</th>
                <th class="th" style="width: 10%; text-align: center;">GST</th>
                <th class="th" style="width: 13%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="width: 100%; overflow: hidden;">
            <div class="totals">
              <div>Subtotal: <strong>INR ${(data.totalAmount + data.discountAmount - data.taxAmount).toFixed(2)}</strong></div>
              <div>Discount: <strong>-INR ${data.discountAmount.toFixed(2)}</strong></div>
              <div>Tax (GST Total): <strong>INR ${data.taxAmount.toFixed(2)}</strong></div>
              <div style="font-size: 15px; margin-top: 5px; border-top: 1px solid #6200ee; padding-top: 5px;">
                Grand Total: <strong style="color: #6200ee;">INR ${data.totalAmount.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div class="footer">
            Thank you for shopping with ${data.businessName}! Get well soon.
          </div>
        </body>
      </html>
    `;
  }

  static async generatePDF(data: InvoiceData): Promise<string> {
    const html = this.buildHTML(data);
    const options = {
      html,
      fileName: `Invoice_${data.invoiceNumber}`,
      directory: 'Documents',
    };
    const file = await RNHTMLtoPDF.convert(options);
    return file.filePath || '';
  }

  static async printInvoice(data: InvoiceData): Promise<void> {
    const html = this.buildHTML(data);
    await RNPrint.print({ html });
  }

  static async shareInvoice(data: InvoiceData): Promise<void> {
    const filePath = await this.generatePDF(data);
    await Share.open({
      title: 'Share Invoice',
      url: `file://${filePath}`,
      type: 'application/pdf',
    });
  }
}
