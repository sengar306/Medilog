import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="customers-container animate-fade-in">
      <div class="header-section">
        <div>
          <h1>Customer Accounts Directory</h1>
          <p>Register new patients, view previous medicine purchase history with dates, and manage client records.</p>
        </div>
      </div>

      <!-- Messages -->
      @if (successMessage()) {
        <div class="alert alert-success">
          <i class="bi bi-check-circle-fill"></i>
          <span>{{ successMessage() }}</span>
        </div>
      }
      @if (errorMessage()) {
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle-fill"></i>
          <span>{{ errorMessage() }}</span>
        </div>
      }

      <div class="split-view">
        <!-- List Column -->
        <div class="list-column glass-panel">
          <div class="list-header">
            <div>
              <h3>Registered Customers</h3>
              <p class="text-secondary" style="margin: 0; font-size: 0.82rem;">Click any customer to view purchase history & previous medicines bought with dates</p>
            </div>

            <div style="display: flex; gap: 10px; align-items: center;">
              <div class="search-input-wrapper">
                <i class="bi bi-search search-icon"></i>
                <input type="text" 
                       class="glass-input search-input" 
                       placeholder="Search by name, phone..." 
                       [(ngModel)]="searchQuery">
              </div>
              <span class="badge badge-info">{{ filteredCustomers.length }} Total</span>
            </div>
          </div>

          <div class="glass-table-container">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone Number</th>
                  <th>Email / Address</th>
                  <th>Registered On</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                @for (cust of filteredCustomers; track cust._id) {
                  <tr (click)="selectCustomer(cust)" 
                      class="clickable-row" 
                      [class.active-row]="selectedCustomer()?._id === cust._id">
                    <td>
                      <strong>{{ cust.name }}</strong>
                      @if (cust.loyaltyPoints > 0) {
                        <span class="badge badge-warning ms-1" style="font-size: 0.7rem;">⭐ {{ cust.loyaltyPoints }} pts</span>
                      }
                    </td>
                    <td><code>{{ cust.phone || 'N/A' }}</code></td>
                    <td>
                      <div>{{ cust.email || 'N/A' }}</div>
                      <small class="text-muted">{{ cust.address || 'Walk-in client' }}</small>
                    </td>
                    <td>{{ cust.createdAt | date:'mediumDate' }}</td>
                    <td>
                      <button (click)="selectCustomer(cust); $event.stopPropagation();" class="btn btn-glass btn-sm" style="display: flex; align-items: center; gap: 4px;">
                        <i class="bi bi-clock-history"></i> History
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="text-center text-muted py-4">No customers found matching search query.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Add Customer Form Column -->
        <div class="form-column glass-panel">
          <h3>Register New Customer</h3>
          
          <form (ngSubmit)="handleAddCustomer()" class="mt-3">
            <div class="form-group">
              <label class="form-label">Full Name *</label>
              <input type="text" [(ngModel)]="customerForm.name" name="name" class="glass-input" placeholder="e.g. John Doe" required>
            </div>

            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="text" [(ngModel)]="customerForm.phone" name="phone" class="glass-input" placeholder="e.g. 9876543210">
            </div>

            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" [(ngModel)]="customerForm.email" name="email" class="glass-input" placeholder="e.g. john@email.com">
            </div>

            <div class="form-group">
              <label class="form-label">Postal Address</label>
              <input type="text" [(ngModel)]="customerForm.address" name="address" class="glass-input" placeholder="City, Street, H.No...">
            </div>

            <button type="submit" class="btn btn-primary w-100 mt-2">
              <i class="bi bi-person-plus-fill"></i> Save Customer
            </button>
          </form>
        </div>
      </div>

      <!-- Customer Purchase History Modal / Drawer Overlay -->
      @if (selectedCustomer()) {
        <div class="modal-backdrop animate-fade-in" (click)="closeCustomerHistory()">
          <div class="modal-panel glass-panel animate-slide-up" (click)="$event.stopPropagation()">
            <!-- Modal Header -->
            <div class="modal-header">
              <div class="customer-info-header">
                <div class="avatar-box">
                  <i class="bi bi-person-bounding-box"></i>
                </div>
                <div>
                  <h2>{{ selectedCustomer().name }}</h2>
                  <p class="text-secondary" style="margin: 0; font-size: 0.88rem;">
                    <i class="bi bi-telephone-fill"></i> {{ selectedCustomer().phone || 'No phone' }} | 
                    <i class="bi bi-envelope"></i> {{ selectedCustomer().email || 'No email' }} | 
                    <i class="bi bi-geo-alt-fill"></i> {{ selectedCustomer().address || 'No address' }}
                  </p>
                </div>
              </div>

              <button class="btn-close-modal" (click)="closeCustomerHistory()">✕</button>
            </div>

            <!-- Customer Summary Stats Bar -->
            <div class="stats-bar mt-3">
              <div class="stat-card glass-card">
                <span class="stat-label">Total Visits / Bills</span>
                <span class="stat-val gradient-text">{{ customerHistory()?.totalSales || 0 }}</span>
              </div>
              <div class="stat-card glass-card">
                <span class="stat-label">Total Amount Spent</span>
                <span class="stat-val text-success">₹{{ (customerHistory()?.totalSpent || 0) | number:'1.2-2' }}</span>
              </div>
              <div class="stat-card glass-card">
                <span class="stat-label">Loyalty Points</span>
                <span class="stat-val text-warning">⭐ {{ selectedCustomer().loyaltyPoints || 0 }}</span>
              </div>
            </div>

            <!-- Tabs inside Modal -->
            <div class="modal-tabs mt-4">
              <button class="modal-tab-btn" [class.active]="historyTab === 'medicines'" (click)="historyTab = 'medicines'">
                <i class="bi bi-capsule"></i> Previous Medicines Purchased ({{ aggregatedMedicines.length }})
              </button>
              <button class="modal-tab-btn" [class.active]="historyTab === 'bills'" (click)="historyTab = 'bills'">
                <i class="bi bi-journal-text"></i> Past Bills History ({{ customerHistory()?.sales?.length || 0 }})
              </button>
            </div>

            <!-- Tab Content 1: Aggregated Medicines -->
            <div class="modal-body mt-3" *ngIf="historyTab === 'medicines'">
              @if (loadingHistory()) {
                <div class="text-center py-5">
                  <i class="bi bi-arrow-repeat spin text-primary" style="font-size: 2rem;"></i>
                  <p class="mt-2 text-muted">Loading purchase history for {{ selectedCustomer().name }}...</p>
                </div>
              } @else {
                <div class="glass-table-container">
                  <table class="glass-table">
                    <thead>
                      <tr>
                        <th>Medicine Name</th>
                        <th>Category</th>
                        <th>Total Qty Bought</th>
                        <th>Last Purchase Date</th>
                        <th>Last Invoice #</th>
                        <th>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (med of aggregatedMedicines; track med.name + med.strength) {
                        <tr>
                          <td>
                            <strong>{{ med.name }}</strong> 
                            <small class="text-secondary" *ngIf="med.strength">({{ med.strength }})</small>
                          </td>
                          <td><span class="badge badge-info">{{ med.category || 'General' }}</span></td>
                          <td><strong>{{ med.totalQty }} units</strong></td>
                          <td><i class="bi bi-calendar-check me-1 text-primary"></i>{{ med.lastPurchaseDate | date:'mediumDate' }}</td>
                          <td><code>{{ med.lastInvoice }}</code></td>
                          <td><strong class="text-success">₹{{ med.totalAmountSpent | number:'1.2-2' }}</strong></td>
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="6" class="text-center text-muted py-4">No previous medicine purchases found for this customer.</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>

            <!-- Tab Content 2: Date-wise Past Bills Timeline -->
            <div class="modal-body mt-3" *ngIf="historyTab === 'bills'">
              @if (loadingHistory()) {
                <div class="text-center py-5">
                  <i class="bi bi-arrow-repeat spin text-primary" style="font-size: 2rem;"></i>
                  <p class="mt-2 text-muted">Loading bill invoices...</p>
                </div>
              } @else {
                <div class="bills-timeline">
                  @for (sale of customerHistory()?.sales; track sale._id) {
                    <div class="bill-card glass-panel mb-3">
                      <div class="bill-card-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                          <span class="bill-date" style="color: #94a3b8; font-size: 0.85rem;">
                            <i class="bi bi-calendar3 text-primary"></i> {{ sale.saleDate | date:'fullDate' }} at {{ sale.saleDate | date:'shortTime' }}
                          </span>
                          <h4 style="margin: 4px 0 0 0; color: #fff;">Invoice #{{ sale.invoiceNumber }}</h4>
                        </div>
                        <div class="text-end" style="text-align: right;">
                          <span class="badge badge-success mb-1">{{ sale.paymentMode }}</span>
                          <div class="bill-total gradient-text" style="font-size: 1.1rem; font-weight: 700;">₹{{ sale.totalAmount | number:'1.2-2' }}</div>
                        </div>
                      </div>

                      <div class="bill-card-body mt-2">
                        <table class="nested-items-table">
                          <thead>
                            <tr>
                              <th>Purchased Medicine</th>
                              <th>Batch #</th>
                              <th>Qty</th>
                              <th>Rate</th>
                              <th>Item Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (item of sale.items; track item._id) {
                              <tr>
                                <td>
                                  <strong>{{ item.medicine?.name || 'Medicine' }}</strong> 
                                  <small class="text-muted" *ngIf="item.medicine?.strength">({{ item.medicine?.strength }})</small>
                                </td>
                                <td><code>{{ item.batchNumber }}</code></td>
                                <td>{{ item.quantity }}</td>
                                <td>₹{{ item.rate | number:'1.2-2' }}</td>
                                <td>₹{{ item.totalAmount | number:'1.2-2' }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>

                      <div class="bill-card-footer mt-2" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 8px;">
                        <small class="text-muted">Subtotal: ₹{{ sale.subTotal | number:'1.2-2' }} | GST: ₹{{ sale.gstTotal | number:'1.2-2' }} | Discount: ₹{{ sale.discountAmount | number:'1.2-2' }}</small>
                        <a [href]="apiService.getSalePdfUrl(sale._id)" target="_blank" class="btn btn-glass btn-sm" style="text-decoration: none;">
                          <i class="bi bi-file-earmark-pdf"></i> PDF Invoice
                        </a>
                      </div>
                    </div>
                  } @empty {
                    <div class="text-center text-muted py-4">No past bill invoices recorded.</div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .customers-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    .split-view {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
    }
    @media (max-width: 992px) {
      .split-view {
        grid-template-columns: 1fr;
      }
    }
    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-input-wrapper .search-icon {
      position: absolute;
      left: 10px;
      color: #3b82f6;
      font-size: 0.9rem;
      pointer-events: none;
    }
    .search-input {
      padding-left: 32px !important;
      height: 36px;
      font-size: 0.88rem;
      min-width: 200px;
    }
    .clickable-row {
      cursor: pointer;
      transition: background 0.15s;
    }
    .clickable-row:hover {
      background: rgba(255, 255, 255, 0.04);
    }
    .active-row {
      background: rgba(37, 99, 235, 0.15) !important;
    }
    .w-100 { width: 100%; }
    .mt-3 { margin-top: 16px; }
    .mt-2 { margin-top: 8px; }
    .mt-4 { margin-top: 24px; }
    .mb-1 { margin-bottom: 4px; }
    .mb-3 { margin-bottom: 16px; }
    .ms-1 { margin-left: 4px; }
    .me-1 { margin-right: 4px; }
    .py-4 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
    .py-5 { padding-top: 2.5rem; padding-bottom: 2.5rem; }
    .text-success { color: #10b981 !important; font-weight: 700; }
    .text-warning { color: #f59e0b !important; font-weight: 700; }
    
    .alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      border-radius: 8px;
      font-size: 0.9rem;
    }
    .alert-success {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #34d399;
    }
    .alert-danger {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
    
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    /* Modal / Drawer Overlay Styles */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(4, 8, 18, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 1200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-panel {
      width: 100%;
      max-width: 920px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      background: rgba(13, 19, 34, 0.97);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 25px 70px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(37, 99, 235, 0.1);
      overflow: hidden;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 16px;
    }
    .customer-info-header {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .avatar-box {
      width: 50px;
      height: 50px;
      border-radius: 14px;
      background: rgba(37, 99, 235, 0.15);
      border: 1px solid rgba(37, 99, 235, 0.3);
      color: #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
    .btn-close-modal {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #aaa;
      font-size: 1.2rem;
      border-radius: 8px;
      width: 34px;
      height: 34px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .btn-close-modal:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }
    @media (max-width: 640px) {
      .stats-bar {
        grid-template-columns: 1fr !important;
      }
      .modal-tabs {
        flex-direction: column !important;
      }
    }
    .stat-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stat-label {
      font-size: 0.78rem;
      color: var(--text-secondary);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }
    .stat-val {
      font-size: 1.3rem;
      font-weight: 700;
    }
    .modal-tabs {
      display: flex;
      gap: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 10px;
    }
    .modal-tab-btn {
      padding: 8px 18px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 8px;
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }
    .modal-tab-btn:hover {
      background: rgba(255, 255, 255, 0.04);
      color: #fff;
    }
    .modal-tab-btn.active {
      background: var(--primary-gradient);
      color: #ffffff;
      border: none;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
      font-weight: 700;
    }
    .modal-body {
      flex-grow: 1;
      overflow-y: auto;
      max-height: 50vh;
      padding-right: 6px;
    }
    .nested-items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .nested-items-table th {
      background: rgba(0, 0, 0, 0.3);
      padding: 8px 12px;
      text-align: left;
      color: var(--text-secondary);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .nested-items-table td {
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .bill-card {
      padding: 16px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: all 0.2s ease;
    }
    .bill-card:hover {
      border-color: rgba(37, 99, 235, 0.25);
    }
  `]
})
export class CustomersComponent implements OnInit {
  public apiService = inject(ApiService);

  customers = signal<any[]>([]);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  searchQuery: string = '';

  selectedCustomer = signal<any | null>(null);
  customerHistory = signal<any | null>(null);
  loadingHistory = signal<boolean>(false);
  historyTab: 'medicines' | 'bills' = 'medicines';

  customerForm = {
    name: '',
    phone: '',
    email: '',
    address: ''
  };

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.apiService.getCustomers().subscribe({
      next: (data) => this.customers.set(data),
      error: (err) => console.error(err)
    });
  }

  get filteredCustomers(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.customers();

    return this.customers().filter(c => 
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  }

  selectCustomer(cust: any): void {
    this.selectedCustomer.set(cust);
    this.historyTab = 'medicines';
    this.loadingHistory.set(true);
    this.customerHistory.set(null);

    this.apiService.getCustomerHistory(cust._id).subscribe({
      next: (data) => {
        this.customerHistory.set(data || { sales: [], totalSales: 0, totalSpent: 0 });
        this.loadingHistory.set(false);
      },
      error: (err) => {
        console.error('Failed to load customer history', err);
        this.customerHistory.set({ sales: [], totalSales: 0, totalSpent: 0 });
        this.loadingHistory.set(false);
      }
    });
  }

  closeCustomerHistory(): void {
    this.selectedCustomer.set(null);
    this.customerHistory.set(null);
  }

  get aggregatedMedicines(): any[] {
    const history = this.customerHistory();
    if (!history || !history.sales) return [];

    const medMap = new Map<string, any>();

    for (const sale of history.sales) {
      const saleDate = sale.saleDate || sale.createdAt;
      if (!sale.items) continue;

      for (const item of sale.items) {
        const medName = item.medicine ? (item.medicine.name || 'Unknown Medicine') : 'Medicine';
        const strength = item.medicine ? (item.medicine.strength || '') : '';
        const category = item.medicine ? (item.medicine.category || '') : '';
        const key = `${medName}-${strength}`;

        if (!medMap.has(key)) {
          medMap.set(key, {
            name: medName,
            strength,
            category,
            totalQty: 0,
            lastPurchaseDate: saleDate,
            lastInvoice: sale.invoiceNumber,
            totalAmountSpent: 0
          });
        }

        const existing = medMap.get(key);
        existing.totalQty += (item.quantity || 0);
        existing.totalAmountSpent += (item.totalAmount || 0);
        if (new Date(saleDate) > new Date(existing.lastPurchaseDate)) {
          existing.lastPurchaseDate = saleDate;
          existing.lastInvoice = sale.invoiceNumber;
        }
      }
    }

    return Array.from(medMap.values()).sort((a, b) => new Date(b.lastPurchaseDate).getTime() - new Date(a.lastPurchaseDate).getTime());
  }

  clearAlerts(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  handleAddCustomer(): void {
    this.clearAlerts();

    this.apiService.createCustomer(this.customerForm).subscribe({
      next: (res) => {
        this.successMessage.set(`Customer '${res.name}' registered successfully!`);
        this.loadCustomers();
        this.customerForm = {
          name: '',
          phone: '',
          email: '',
          address: ''
        };
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to register customer');
      }
    });
  }
}
