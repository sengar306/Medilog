import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api.service';

interface CartItem {
  medicineId: string;
  name: string;
  strength: string;
  category: string;
  mrp: number;
  gstPercent: number;
  quantity: number;
  availableStock: number;
}

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="billing-container animate-fade-in">

      <!-- Custom Success / Dispatch Alert -->
      @if (toastMessage()) {
        <div class="alert alert-success mt-2 flex items-center justify-between" style="background: rgba(5, 46, 22, 0.95); border: 1px solid rgba(34, 197, 94, 0.8); color: #fff; padding: 14px 18px; border-radius: 14px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <span>{{ toastMessage() }}</span>
            @if (activeWaLink()) {
              <a [href]="activeWaLink()" target="_blank" class="btn btn-sm" style="background: #22c55e; color: #052e16; text-decoration: none; font-weight: 800; padding: 6px 16px; border-radius: 8px; font-size: 13px;">
                💬 Click to Send WhatsApp Message to +91 {{ customerPhone }}
              </a>
            }
          </div>
          <button (click)="toastMessage.set(null)" class="btn btn-sm" style="color: #aaa; background: none; border: none; font-size: 16px;">✕</button>
        </div>
      }

      <!-- Main Checkout Grid -->
      <div class="billing-split" *ngIf="!receiptData()">
        <!-- Left Side: POS Shopping Cart & Drug Selector -->
        <div class="cart-column glass-panel">
          <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h3>Retail POS Cart</h3>
            <div style="display: flex; gap: 8px;">
              <button (click)="clearCart()" class="btn btn-glass btn-sm"><i class="bi bi-trash"></i> Empty</button>
            </div>
          </div>

          <!-- Add Item Bar -->
          <div class="add-item-bar mt-3">
            <div class="form-group select-drug-group">
              <label class="form-label">Search Medicine *</label>
              <select [(ngModel)]="selectedMedicineId" (change)="onMedicineSelect()" class="glass-input glass-select select-drug">
                <option [value]="null">Select medicine from master...</option>
                @for (med of medicines(); track med._id) {
                  <option [value]="med._id">
                    {{ med.name }} ({{ med.strength }}) - Stock: {{ getMedicineStock(med._id) }}
                  </option>
                }
              </select>
            </div>
            
            <div class="form-group select-qty-group">
              <label class="form-label">Qty</label>
              <input type="number" [(ngModel)]="itemQty" class="glass-input text-center" min="1">
            </div>

            <button (click)="addToCart()" class="btn btn-primary btn-add">
              <i class="bi bi-plus-lg"></i> Add
            </button>
          </div>

          <!-- Cart Items Table -->
          <div class="glass-table-container mt-4">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Rate (MRP)</th>
                  <th>Quantity</th>
                  <th>Taxes (GST)</th>
                  <th>Total Cost</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                @for (item of cart(); track item.medicineId) {
                  <tr>
                    <td><strong>{{ item.name }}</strong> <small class="text-secondary">({{ item.strength }})</small></td>
                    <td>₹{{ item.mrp | number:'1.2-2' }}</td>
                    <td>
                      <div class="qty-editor">
                        <button (click)="updateQty(item, -1)" class="btn-qty-arrow"><i class="bi bi-dash"></i></button>
                        <span class="qty-value">{{ item.quantity }}</span>
                        <button (click)="updateQty(item, 1)" class="btn-qty-arrow"><i class="bi bi-plus"></i></button>
                      </div>
                    </td>
                    <td>{{ item.gstPercent }}%</td>
                    <td><strong>₹{{ (item.quantity * item.mrp * (1 + item.gstPercent / 100)) | number:'1.2-2' }}</strong></td>
                    <td>
                      <button (click)="removeFromCart(item)" class="btn btn-glass btn-icon text-danger-color"><i class="bi bi-trash"></i></button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="text-center text-muted py-4">Shopping cart is empty. Search and add items above.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right Side: Billing Customer & Payment Summary -->
        <div class="summary-column glass-panel">
          <h3>Checkout & Invoice Details</h3>
          
          @if (errorMessage()) {
            <div class="alert alert-danger mt-2">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form (ngSubmit)="processCheckout()" class="mt-3">
            <h4 class="section-title">Customer Information</h4>
            <div class="form-group">
              <label class="form-label">Phone Number (Customer WhatsApp)</label>
              <input type="text" [(ngModel)]="customerPhone" name="custPhone" class="glass-input" placeholder="e.g. 6398974633">
            </div>
            
            <div class="form-group">
              <label class="form-label">Customer Name</label>
              <input type="text" [(ngModel)]="customerName" name="custName" class="glass-input" placeholder="Vivek">
            </div>

            <h4 class="section-title mt-4">Payment Configuration</h4>
            <div class="form-group">
              <label class="form-label">Payment Mode</label>
              <select [(ngModel)]="paymentMode" name="payMode" class="glass-input glass-select">
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI Mobile Wallet</option>
                <option value="Mixed">Mixed Payment</option>
              </select>
            </div>

            <!-- Financial summary -->
            <div class="totals-box mt-4">
              <div class="totals-row">
                <span>Cart Subtotal:</span>
                <span>₹{{ subTotal | number:'1.2-2' }}</span>
              </div>
              <div class="totals-row">
                <span>GST Tax Sum:</span>
                <span>₹{{ gstTotal | number:'1.2-2' }}</span>
              </div>
              <div class="form-group discount-group mt-2">
                <label class="form-label inline-label">Discount (₹)</label>
                <input type="number" [(ngModel)]="discountAmount" name="discount" class="glass-input discount-input text-right" min="0">
              </div>
              <div class="totals-row final-row mt-2">
                <span>Grand Total:</span>
                <span class="gradient-text">₹{{ grandTotal | number:'1.2-2' }}</span>
              </div>
            </div>

            <button type="submit" class="btn btn-primary w-100 mt-4" [disabled]="cart().length === 0">
              <i class="bi bi-receipt-cutoff"></i> Finalize Bill & Generate Invoice
            </button>
          </form>
        </div>
      </div>

      <!-- Retail Bill Receipt View (Shown after checkout completes) -->
      @if (receiptData()) {
        <div class="receipt-layout animate-fade-in">
          <div class="receipt-card glass-panel">
            <div class="receipt-header">
              <i class="bi bi-heart-pulse-fill logo-icon"></i>
              <h2>MediLog Pharmacy</h2>
              <p>Smart Retail Billing System</p>
              <p class="invoice-number mt-2">Invoice: <strong>{{ receiptData().sale.invoiceNumber }}</strong></p>
            </div>

            <div class="receipt-meta mt-3">
              <div>
                <p><strong>Customer:</strong> {{ customerName || 'Walk-in customer' }}</p>
                <p><strong>Phone:</strong> {{ customerPhone || 'N/A' }}</p>
              </div>
              <div style="text-align: right;">
                <p><strong>Date:</strong> {{ receiptData().sale.saleDate | date:'medium' }}</p>
                <p><strong>Cashier:</strong> {{ cashierUsername }}</p>
              </div>
            </div>

            <div class="receipt-items-table mt-4">
              <table class="receipt-table">
                <thead>
                  <tr>
                    <th>Medicine Details</th>
                    <th>Batch</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>GST %</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of receiptData().items; track item._id) {
                    <tr>
                      <td><strong>{{ item.medicine ? item.medicine.name : 'Medicine' }}</strong></td>
                      <td><code>{{ item.batchNumber }}</code></td>
                      <td>{{ item.quantity }}</td>
                      <td>₹{{ item.rate | number:'1.2-2' }}</td>
                      <td>{{ item.gstPercent }}%</td>
                      <td>₹{{ item.totalAmount | number:'1.2-2' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="receipt-totals mt-4">
              <p>Subtotal: ₹{{ receiptData().sale.subTotal | number:'1.2-2' }}</p>
              <p>GST Taxes: ₹{{ receiptData().sale.gstTotal | number:'1.2-2' }}</p>
              <p>Discounts Applied: -₹{{ receiptData().sale.discountAmount | number:'1.2-2' }}</p>
              <h3 class="net-payable-title gradient-text mt-2">Amount Paid: ₹{{ receiptData().sale.totalAmount | number:'1.2-2' }}</h3>
              <p class="payment-mode-label">Payment Mode: <strong>{{ receiptData().sale.paymentMode }}</strong></p>
            </div>

            <div class="receipt-footer mt-4">
              <p><i class="bi bi-shield-check-fill"></i> Thank you! Get well soon.</p>
              <div class="footer-buttons mt-3 no-print" style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <a [href]="apiService.getSalePdfUrl(receiptData().sale._id)" target="_blank" class="btn btn-primary" style="display: flex; align-items: center; gap: 6px; text-decoration: none; border-radius: 8px; padding: 10px 16px; font-weight: bold;">
                  <i class="bi bi-file-earmark-pdf"></i> View Invoice PDF
                </a>
                <button (click)="downloadPdf(receiptData().sale._id)" class="btn btn-glass" style="display: flex; align-items: center; gap: 6px;">
                  <i class="bi bi-download"></i> Download PDF
                </button>
                <button (click)="printReceipt()" class="btn btn-glass"><i class="bi bi-printer"></i> Thermal Print</button>
                @if (customerPhone) {
                  <button (click)="openDirectWhatsApp()" class="btn" style="background: #16a34a; color: white; border: none; border-radius: 8px; font-weight: bold; padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                    <i class="bi bi-whatsapp"></i> Open WhatsApp Web
                  </button>
                }
                <button (click)="resetPOS()" class="btn btn-primary-glass"><i class="bi bi-plus-circle"></i> New POS Bill</button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .billing-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .billing-split {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      align-items: start;
    }
    @media (max-width: 1100px) {
      .billing-split {
        grid-template-columns: 1fr;
      }
    }
    .add-item-bar {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }
    .select-drug-group {
      flex: 1;
      min-width: 250px;
    }
    .select-qty-group {
      width: 90px;
    }
    .btn-add {
      height: 42px;
    }
    .qty-editor {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 2px 6px;
    }
    .btn-qty-arrow {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0 4px;
      font-size: 14px;
      transition: color 0.2s;
    }
    .btn-qty-arrow:hover {
      color: #fff;
    }
    .qty-value {
      font-weight: 600;
      min-width: 20px;
      text-align: center;
    }
    .section-title {
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 6px;
    }
    .discount-group {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .discount-input {
      width: 110px;
    }
    .totals-box {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 14px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 0.95rem;
      color: var(--text-secondary);
    }
    .final-row {
      font-size: 1.2rem;
      font-weight: 700;
      color: #fff;
      border-top: 1px dashed rgba(255, 255, 255, 0.15);
      padding-top: 10px;
    }
    .receipt-layout {
      display: flex;
      justify-content: center;
    }
    .receipt-card {
      width: 100%;
      max-width: 650px;
      padding: 30px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      border-radius: 16px;
    }
    .receipt-header {
      text-align: center;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.15);
      padding-bottom: 16px;
    }
    .logo-icon {
      font-size: 2.2rem;
      color: var(--primary-color);
    }
    .receipt-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
      color: var(--text-secondary);
    }
    .receipt-table {
      width: 100%;
      border-collapse: collapse;
    }
    .receipt-table th, .receipt-table td {
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 0.88rem;
    }
    .receipt-totals {
      text-align: right;
      border-top: 1px dashed rgba(255, 255, 255, 0.15);
      padding-top: 12px;
    }
    .receipt-footer {
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 16px;
    }
    .footer-buttons {
      display: flex;
      justify-content: center;
      gap: 12px;
    }
    @media print {
      body * { visibility: hidden; }
      .receipt-layout, .receipt-card, .receipt-card * { visibility: visible; }
      .receipt-layout { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; }
      .receipt-card {
        background: #ffffff !important;
        color: #000000 !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      .no-print { display: none !important; }
      .logo-icon { color: #8257e5 !important; }
      .receipt-table th { background-color: #8257e5 !important; color: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .receipt-table td { border-bottom: 1px solid #ddd !important; color: #000000 !important; }
    }
  `]
})
export class BillingComponent implements OnInit {
  public apiService = inject(ApiService);

  medicines = signal<any[]>([]);
  inventory = signal<any[]>([]);
  cart = signal<CartItem[]>([]);
  receiptData = signal<any>(null);
  errorMessage = signal<string | null>(null);
  toastMessage = signal<string | null>(null);
  activeWaLink = signal<string | null>(null);

  showWaConfigModal = signal<boolean>(false);
  waConfig = signal<any>({
    senderNumber: '916398974633',
    businessName: 'Assandh Road Pharmacy',
    gatewayType: 'DIRECT_AUTOMATED',
    metaAccessToken: '',
    metaPhoneNumberId: ''
  });

  selectedMedicineId: string | null = null;
  itemQty: number = 1;

  customerPhone: string = '6398974633';
  customerName: string = 'Vivek';
  discountAmount: number = 0;
  paymentMode: string = 'UPI';

  cashierUsername = 'Pharmacist';

  ngOnInit(): void {
    this.loadData();
    this.loadWaConfig();
    const user = this.apiService.currentUser();
    if (user && user.username) {
      this.cashierUsername = user.username;
    }
  }

  loadData(): void {
    this.apiService.getMedicines().subscribe({
      next: (data) => this.medicines.set(data),
      error: (err) => console.error('Failed to load medicines', err)
    });

    this.apiService.getInventory('IN_STOCK').subscribe({
      next: (data) => this.inventory.set(data),
      error: (err) => console.error('Failed to load inventory', err)
    });
  }

  loadWaConfig(): void {
    this.apiService.getWhatsAppConfig().subscribe({
      next: (res) => {
        if (res && res.data) {
          this.waConfig.set(res.data);
        }
      },
      error: () => {}
    });
  }

  toggleWhatsAppModal(): void {
    this.showWaConfigModal.update(v => !v);
  }

  saveWaConfig(): void {
    this.apiService.saveWhatsAppConfig(this.waConfig()).subscribe({
      next: () => {
        this.showWaConfigModal.set(false);
        this.toastMessage.set('WhatsApp settings saved successfully.');
        setTimeout(() => this.toastMessage.set(null), 4000);
        this.loadWaConfig();
      },
      error: (err) => {
        this.errorMessage.set('Failed to save settings.');
      }
    });
  }

  disconnectWhatsApp(): void {
    if (confirm('Are you sure you want to clear your WhatsApp configuration?')) {
      const emptyConfig = {
        metaAccessToken: '',
        metaPhoneNumberId: '',
        metaBusinessId: '',
        businessName: '',
        senderNumber: ''
      };
      this.apiService.saveWhatsAppConfig(emptyConfig).subscribe({
        next: () => {
          this.loadWaConfig();
          this.toastMessage.set('WhatsApp configuration cleared.');
          setTimeout(() => this.toastMessage.set(null), 4000);
        }
      });
    }
  }

  get subTotal(): number {
    return this.cart().reduce((sum, item) => sum + (item.quantity * item.mrp), 0);
  }

  get gstTotal(): number {
    return this.cart().reduce((sum, item) => sum + (item.quantity * item.mrp * (item.gstPercent / 100)), 0);
  }

  get grandTotal(): number {
    const rawTotal = this.subTotal + this.gstTotal - this.discountAmount;
    return rawTotal > 0 ? rawTotal : 0;
  }

  getMedicineStock(medicineId: string): number {
    return this.inventory()
      .filter(b => b.medicine._id === medicineId)
      .reduce((sum, b) => sum + b.quantity, 0);
  }

  onMedicineSelect(): void {
    this.itemQty = 1;
  }

  addToCart(): void {
    if (!this.selectedMedicineId || this.selectedMedicineId === 'null') return;
    this.errorMessage.set(null);

    const medicine = this.medicines().find(m => m._id === this.selectedMedicineId);
    if (!medicine) return;

    const available = this.getMedicineStock(this.selectedMedicineId);
    const activeBatch = this.inventory().find(b => b.medicine._id === this.selectedMedicineId);
    if (!activeBatch) {
      this.errorMessage.set(`No active stock batches found for ${medicine.name}`);
      return;
    }

    if (available < this.itemQty) {
      this.errorMessage.set(`Insufficient stock. Available: ${available}, Requested: ${this.itemQty}`);
      return;
    }

    const existingIndex = this.cart().findIndex(item => item.medicineId === this.selectedMedicineId);
    
    if (existingIndex > -1) {
      const currentQty = this.cart()[existingIndex].quantity;
      if (available < currentQty + this.itemQty) {
        this.errorMessage.set(`Cannot add more. Total in cart (${currentQty + this.itemQty}) exceeds stock (${available}).`);
        return;
      }
      this.cart.update(c => {
        c[existingIndex].quantity += this.itemQty;
        return [...c];
      });
    } else {
      const newItem: CartItem = {
        medicineId: this.selectedMedicineId,
        name: medicine.name,
        strength: medicine.strength,
        category: medicine.category,
        mrp: activeBatch.mrp,
        gstPercent: activeBatch.gstPercent || 0,
        quantity: this.itemQty,
        availableStock: available
      };
      this.cart.update(c => [...c, newItem]);
    }

    this.selectedMedicineId = null;
    this.itemQty = 1;
  }

  updateQty(item: CartItem, delta: number): void {
    const newQty = item.quantity + delta;
    if (newQty < 1) return;
    if (item.availableStock < newQty) {
      this.errorMessage.set(`Cannot add more. Reached maximum available stock of ${item.availableStock} for ${item.name}`);
      return;
    }
    this.errorMessage.set(null);

    this.cart.update(c => {
      const idx = c.findIndex(i => i.medicineId === item.medicineId);
      if (idx > -1) c[idx].quantity = newQty;
      return [...c];
    });
  }

  removeFromCart(item: CartItem): void {
    this.cart.update(c => c.filter(i => i.medicineId !== item.medicineId));
  }

  clearCart(): void {
    this.cart.set([]);
    this.errorMessage.set(null);
  }

  processCheckout(): void {
    if (this.cart().length === 0) return;
    this.errorMessage.set(null);

    const checkoutItems = this.cart().map(item => ({
      medicineId: item.medicineId,
      quantity: item.quantity
    }));

    const payload = {
      customerName: this.customerName,
      customerPhone: this.customerPhone,
      items: checkoutItems,
      discountAmount: this.discountAmount,
      paymentMode: this.paymentMode
    };

    this.apiService.createSale(payload).subscribe({
      next: (res) => {
        this.receiptData.set(res);
        this.loadData();
        this.toastMessage.set('Invoice generated successfully!');
        if (this.customerPhone) {
           setTimeout(() => this.toastMessage.set('💬 WhatsApp bill sent automatically!'), 2000);
        }
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Transaction failed.');
      }
    });
  }

  printReceipt(): void {
    window.print();
  }

  downloadPdf(saleId: string): void {
    this.apiService.downloadSalePdf(saleId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice-${saleId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Failed to download sale PDF', err)
    });
  }

  openDirectWhatsApp(): void {
    const receipt = this.receiptData();
    if (!receipt) return;
    
    const cleanPhone = this.customerPhone.replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    const pdfUrl = `http://localhost:5000/api/v1/invoices/${receipt.sale.invoiceNumber}/pdf`;
    const text = `Hello ${this.customerName || 'Customer'},\n\nYour invoice *#${receipt.sale.invoiceNumber}* from *${this.waConfig().businessName || 'MediLog Pharmacy'}* has been generated.\n\n*Bill Summary*:\n- Subtotal: INR ${receipt.sale.subTotal.toFixed(2)}\n- GST Taxes: INR ${receipt.sale.gstTotal.toFixed(2)}\n- Discount: INR ${receipt.sale.discountAmount.toFixed(2)}\n- Grand Total: *INR ${receipt.sale.totalAmount.toFixed(2)}*\n\n📄 *Download PDF Invoice:* ${pdfUrl}\n\nThank you!`;
    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }


  resetPOS(): void {
    this.receiptData.set(null);
    this.customerName = '';
    this.customerPhone = '';
    this.discountAmount = 0;
    this.paymentMode = 'Cash';
    this.activeWaLink.set(null);
    this.clearCart();
  }
}
