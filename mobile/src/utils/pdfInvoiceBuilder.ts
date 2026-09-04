import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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
  
  gstNumber?: string;
  address?: string;
  email?: string;
  phone?: string;
  stateName?: string;
  stateCode?: string;
}

function numberToWords(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numStr = num.toString();
  if (numStr.length > 9) return 'overflow';
  const match = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!match) return '';
  let str = '';
  str += (Number(match[1]) != 0) ? (a[Number(match[1])] || b[Number(match[1][0])] + ' ' + a[Number(match[1][1])]) + 'Crore ' : '';
  str += (Number(match[2]) != 0) ? (a[Number(match[2])] || b[Number(match[2][0])] + ' ' + a[Number(match[2][1])]) + 'Lakh ' : '';
  str += (Number(match[3]) != 0) ? (a[Number(match[3])] || b[Number(match[3][0])] + ' ' + a[Number(match[3][1])]) + 'Thousand ' : '';
  str += (Number(match[4]) != 0) ? (a[Number(match[4])] || b[Number(match[4][0])] + ' ' + a[Number(match[4][1])]) + 'Hundred ' : '';
  str += (Number(match[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(match[5])] || b[Number(match[5][0])] + ' ' + a[Number(match[5][1])]) + 'only ' : 'only';
  return str.trim();
}

export class PDFInvoiceBuilder {
  static buildHTML(data: InvoiceData): string {
    const gstNumber = data.gstNumber || '06AAAAA1111A1Z1';
    const address = data.address || '124, Assandh Road, Panipat, Haryana';
    const email = data.email || 'contact@assandhpharmacy.com';
    const phone = data.phone || '+91 92192 76632';
    const stateName = data.stateName || 'Haryana';
    const stateCode = data.stateCode || '06';

    const itemsRows = data.items
      .map(
        (item, index) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #8257e5; text-align: center;">${index + 1}</td>
        <td style="padding: 8px; border: 1px solid #8257e5;">${item.medicineName} ${item.batchNumber ? ' (Batch: ' + item.batchNumber + ')' : ''}</td>
        <td style="padding: 8px; border: 1px solid #8257e5; text-align: center;">3004</td>
        <td style="padding: 8px; border: 1px solid #8257e5; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #8257e5; text-align: right;">INR ${item.rate.toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #8257e5; text-align: right;">INR ${item.totalAmount.toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    return `
      <html>
        <head>
          <style>
            body { font-family: Helvetica, Arial, sans-serif; color: #1e293b; padding: 20px; margin: 0; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .company-title { font-size: 20px; font-weight: bold; color: #1a1625; text-transform: uppercase; margin: 0; }
            .gst-label { font-size: 11px; font-weight: bold; color: #8257e5; margin: 4px 0; }
            .company-details { font-size: 10px; color: #475569; line-height: 1.4; }
            .badge-cell { text-align: right; vertical-align: top; }
            .tax-badge { display: inline-block; background-color: #8257e5; color: #ffffff; padding: 6px 20px; font-weight: bold; border-radius: 4px; font-size: 12px; }
            
            .client-box { width: 100%; border: 1px solid #8257e5; border-collapse: collapse; margin-bottom: 25px; }
            .client-box td { padding: 8px 12px; font-size: 10px; vertical-align: top; border: 1px solid #8257e5; }
            
            .items-table { width: 100%; border-collapse: collapse; border: 1px solid #8257e5; margin-bottom: 15px; }
            .items-table th { background-color: #8257e5; color: #ffffff; padding: 8px 10px; font-size: 10px; font-weight: bold; text-align: left; border: 1px solid #8257e5; }
            .items-table td { padding: 8px 10px; font-size: 10px; border: 1px solid #8257e5; color: #1e293b; }
            
            .totals-container { width: 100%; margin-top: 10px; }
            .totals-table { float: right; width: 240px; border-collapse: collapse; border: 1px solid #8257e5; }
            .totals-table td { padding: 6px 10px; font-size: 10px; border: 1px solid #8257e5; }
            .totals-table .grand-total { font-weight: bold; font-size: 11px; }
            
            .amount-words { font-size: 10px; font-weight: bold; margin-top: 15px; width: 55%; }
            .amount-val { font-style: italic; font-weight: normal; margin-top: 4px; }
            
            .footer-section { margin-top: 50px; font-size: 10px; }
            .footer-sig { float: right; text-align: right; font-weight: bold; width: 200px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="company-title">${data.businessName}</div>
                <div class="gst-label">GST No. ${gstNumber}</div>
                <div class="company-details">
                  ${address}<br/>
                  e-mail : ${email}, Ph. ${phone}<br/>
                  State Name : ${stateName}, State Code : ${stateCode}
                </div>
              </td>
              <td class="badge-cell">
                <div class="tax-badge">Tax Invoice</div>
              </td>
            </tr>
          </table>

          <table class="client-box">
            <tr>
              <td style="width: 60%;">
                <strong>Client Name:</strong> ${data.customerName}<br/>
                <div style="margin-top: 4px;"><strong>Address:</strong> ${data.customerPhone ? 'Phone: ' + data.customerPhone : 'N/A'}</div>
                <div style="margin-top: 4px;"><strong>GSTIN:</strong> —</div>
              </td>
              <td style="width: 40%;">
                <strong>Date:</strong> ${new Date(data.createdAt).toLocaleDateString('en-GB')}<br/>
                <div style="margin-top: 4px;"><strong>Invoice No:</strong> ${data.invoiceNumber}</div>
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 8%; text-align: center; border: 1px solid #8257e5;">S.No</th>
                <th style="width: 42%; border: 1px solid #8257e5;">Description</th>
                <th style="width: 15%; text-align: center; border: 1px solid #8257e5;">HSN Code</th>
                <th style="width: 10%; text-align: center; border: 1px solid #8257e5;">Qty</th>
                <th style="width: 12%; text-align: right; border: 1px solid #8257e5;">Rate</th>
                <th style="width: 13%; text-align: right; border: 1px solid #8257e5;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="overflow: hidden; width: 100%;">
            <table class="totals-table">
              <tr>
                <td><strong>Total Value</strong></td>
                <td style="text-align: right;">INR ${(data.totalAmount + data.discountAmount - data.taxAmount).toFixed(2)}</td>
              </tr>
              <tr>
                <td><strong>Add : CGST</strong></td>
                <td style="text-align: right;">INR ${(data.taxAmount / 2).toFixed(2)}</td>
              </tr>
              <tr>
                <td><strong>Add : SGST</strong></td>
                <td style="text-align: right;">INR ${(data.taxAmount / 2).toFixed(2)}</td>
              </tr>
              ${data.discountAmount > 0 ? `
              <tr>
                <td><strong>Less: Discount</strong></td>
                <td style="text-align: right;">-INR ${data.discountAmount.toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr class="grand-total">
                <td>Grand Total</td>
                <td style="text-align: right;">INR ${data.totalAmount.toFixed(2)}</td>
              </tr>
            </table>

            <div class="amount-words">
              Amount in Words:<br/>
              <div class="amount-val">${numberToWords(Math.round(data.totalAmount))}</div>
            </div>
          </div>

          <div class="footer-section">
            <div class="footer-sig">
              For ${data.businessName.toUpperCase()}<br/><br/><br/><br/>
              Authorised Signature
            </div>
          </div>
        </body>
      </html>
    `;
  }

  static async generatePDF(data: InvoiceData): Promise<string> {
    const html = this.buildHTML(data);
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  }

  static async printInvoice(data: InvoiceData): Promise<void> {
    const html = this.buildHTML(data);
    await Print.printAsync({ html });
  }

  static async shareInvoice(data: InvoiceData): Promise<void> {
    const uri = await this.generatePDF(data);
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Invoice',
      });
    }
  }
}
