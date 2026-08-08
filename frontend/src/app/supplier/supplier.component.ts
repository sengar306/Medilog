import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-supplier',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="supplier-container animate-fade-in">
      <div class="header-section">
        <div>
          <h1>Suppliers & Procurements</h1>
          <p>Register wholesalers, view distributor details, and monitor historical purchases.</p>
        </div>
        <div class="tab-buttons btn-group">
          <button class="btn" [class.btn-primary]="activeTab() === 'suppliers'" [class.btn-glass]="activeTab() !== 'suppliers'" (click)="activeTab.set('suppliers')">
            <i class="bi bi-people-fill"></i> Supplier Directory
          </button>
          <button class="btn" [class.btn-primary]="activeTab() === 'purchases'" [class.btn-glass]="activeTab() !== 'purchases'" (click)="activeTab.set('purchases')">
            <i class="bi bi-folder-check"></i> Historical Purchases
          </button>
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

      <!-- Tab 1: Supplier Directory -->
      @if (activeTab() === 'suppliers') {
        <div class="split-view">
          <!-- Suppliers list table -->
          <div class="list-column glass-panel">
            <div class="list-header">
              <h3>Registered Wholesaler Distributors</h3>
              <span class="badge badge-info">{{ suppliers().length }} Suppliers</span>
            </div>

            <div class="glass-table-container">
              <table class="glass-table">
                <thead>
                  <tr>
                    <th>Supplier Name</th>
                    <th>Contact Person</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>GSTIN</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  @for (sup of suppliers(); track sup._id) {
                    <tr>
                      <td><strong>{{ sup.name }}</strong></td>
                      <td>{{ sup.contactPerson || 'N/A' }}</td>
                      <td>{{ sup.email || 'N/A' }}</td>
                      <td><code>{{ sup.phone || 'N/A' }}</code></td>
                      <td><code>{{ sup.gstNumber || 'N/A' }}</code></td>
                      <td><small>{{ sup.address || 'N/A' }}</small></td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="text-center text-muted">No suppliers registered. Add one using the form.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Add supplier form -->
          <div class="form-column glass-panel">
            <h3>Add New Supplier</h3>
            <form (ngSubmit)="handleAddSupplier()" class="mt-3">
              <div class="form-group">
                <label class="form-label">Distributor / Agency Name *</label>
                <input type="text" [(ngModel)]="supplierForm.name" name="name" class="glass-input" placeholder="e.g. Acme Pharma Inc" required>
              </div>

              <div class="form-group">
                <label class="form-label">Contact Representative</label>
                <input type="text" [(ngModel)]="supplierForm.contactPerson" name="contactPerson" class="glass-input" placeholder="e.g. John Doe">
              </div>

              <div class="row-flex">
                <div class="form-group w-50">
                  <label class="form-label">Phone Number</label>
                  <input type="text" [(ngModel)]="supplierForm.phone" name="phone" class="glass-input" placeholder="9876543210">
                </div>
                <div class="form-group w-50">
                  <label class="form-label">GSTIN ID</label>
                  <input type="text" [(ngModel)]="supplierForm.gstNumber" name="gstNumber" class="glass-input" placeholder="GSTIN code">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" [(ngModel)]="supplierForm.email" name="email" class="glass-input" placeholder="billing@supplier.com">
              </div>

              <div class="form-group">
                <label class="form-label">Warehouse Address</label>
                <input type="text" [(ngModel)]="supplierForm.address" name="address" class="glass-input" placeholder="Factory office street...">
              </div>

              <button type="submit" class="btn btn-primary w-100 mt-2">
                <i class="bi bi-plus-circle"></i> Save Supplier
              </button>
            </form>
          </div>
        </div>
      }

      <!-- Tab 2: Historical Purchases -->
      @if (activeTab() === 'purchases') {
        <div class="glass-panel">
          <div class="list-header">
            <h3>Completed Procurement Purchases</h3>
            <span class="badge badge-info">{{ purchases().length }} Records</span>
          </div>

          <div class="glass-table-container">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Supplier / Wholesaler</th>
                  <th>Subtotal</th>
                  <th>GST Amount</th>
                  <th>Total Payable</th>
                  <th>Date Logged</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                @for (pur of purchases(); track pur._id) {
                  <tr>
                    <td><code>{{ pur.invoiceNumber }}</code></td>
                    <td><strong>{{ pur.supplier ? pur.supplier.name : 'Unknown' }}</strong></td>
                    <td>₹{{ pur.subTotal | number:'1.2-2' }}</td>
                    <td>₹{{ pur.gstTotal | number:'1.2-2' }}</td>
                    <td><strong style="color: var(--primary);">₹{{ pur.totalAmount | number:'1.2-2' }}</strong></td>
                    <td>{{ pur.invoiceDate | date:'mediumDate' }}</td>
                    <td><span class="badge badge-success">{{ pur.status }}</span></td>
                    <td>
                      <button (click)="viewInvoiceDetails(pur._id)" class="btn btn-glass btn-sm">
                        <i class="bi bi-eye"></i> View Items
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="text-center text-muted">No procurement purchases recorded. Import an invoice or perform a purchase.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Invoice Items Details Modal -->
      @if (showDetailsModal() && selectedPurchase()) {
        <div class="glass-modal-backdrop animate-fade-in">
          <div class="glass-panel glass-modal">
            <div class="modal-header">
              <h3>Invoice Items Details ({{ selectedPurchase().purchase.invoiceNumber }})</h3>
              <button (click)="showDetailsModal.set(false)" class="btn btn-glass btn-circle"><i class="bi bi-x"></i></button>
            </div>
            
            <div class="modal-body mt-3">
              <div class="info-row">
                <p><strong>Supplier:</strong> {{ selectedPurchase().purchase.supplier?.name }}</p>
                <p><strong>Date:</strong> {{ selectedPurchase().purchase.invoiceDate | date:'medium' }}</p>
              </div>

              <div class="glass-table-container mt-3">
                <table class="glass-table">
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Batch Number</th>
                      <th>Expiry Date</th>
                      <th>Quantity Purchased</th>
                      <th>Purchase Rate</th>
                      <th>MRP</th>
                      <th>GST %</th>
                      <th>Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of selectedPurchase().items; track item._id) {
                      <tr>
                        <td><strong>{{ item.medicine.name }}</strong></td>
                        <td><code>{{ item.batchNumber }}</code></td>
                        <td>{{ item.expiryDate | date:'shortDate' }}</td>
                        <td>{{ item.quantity }}</td>
                        <td>₹{{ item.purchaseRate | number:'1.2-2' }}</td>
                        <td>₹{{ item.mrp | number:'1.2-2' }}</td>
                        <td>{{ item.gstPercent }}%</td>
                        <td><strong>₹{{ item.totalAmount | number:'1.2-2' }}</strong></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="modal-totals mt-3">
                <p>Subtotal: ₹{{ selectedPurchase().purchase.subTotal | number:'1.2-2' }}</p>
                <p>Tax (GST): ₹{{ selectedPurchase().purchase.gstTotal | number:'1.2-2' }}</p>
                <h4 style="color: var(--primary);">Net Amount Paid: ₹{{ selectedPurchase().purchase.totalAmount | number:'1.2-2' }}</h4>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .supplier-container {
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
    .btn-group {
      display: flex;
      gap: 8px;
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
    }
    .row-flex {
      display: flex;
      gap: 12px;
    }
    .w-50 { width: 50%; }
    .w-100 { width: 100%; }
    .mt-3 { margin-top: 16px; }
    .mt-2 { margin-top: 8px; }
    .btn-sm {
      padding: 4px 10px;
      font-size: 0.75rem;
      border-radius: 6px;
    }
    
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

    /* Modal Styling */
    .glass-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .glass-modal {
      width: 100%;
      max-width: 800px;
      max-height: 85vh;
      overflow-y: auto;
      padding: 32px;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      padding: 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
      background: rgba(255,255,255,0.02);
      padding: 12px 18px;
      border-radius: 8px;
      font-size: 0.9rem;
    }
    .modal-totals {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
      font-size: 0.95rem;
      border-top: 1px solid var(--glass-border);
      padding-top: 16px;
    }
  `]
})
export class SupplierComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  activeTab = signal<'suppliers' | 'purchases'>('suppliers');
  
  suppliers = signal<any[]>([]);
  purchases = signal<any[]>([]);
  
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Modal State
  showDetailsModal = signal(false);
  selectedPurchase = signal<any | null>(null);

  // Form Model
  supplierForm = {
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstNumber: '',
    address: ''
  };

  ngOnInit(): void {
    if (this.router.url.includes('purchases')) {
      this.activeTab.set('purchases');
    }
    this.loadData();
  }

  loadData(): void {
    this.apiService.getSuppliers().subscribe({
      next: (data) => this.suppliers.set(data),
      error: (err) => console.error(err)
    });

    this.apiService.getPurchases().subscribe({
      next: (data) => this.purchases.set(data),
      error: (err) => console.error(err)
    });
  }

  clearAlerts(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  handleAddSupplier(): void {
    this.clearAlerts();

    this.apiService.createSupplier(this.supplierForm).subscribe({
      next: (res) => {
        this.successMessage.set(`Supplier '${res.name}' registered successfully!`);
        this.loadData();
        this.supplierForm = {
          name: '',
          contactPerson: '',
          phone: '',
          email: '',
          gstNumber: '',
          address: ''
        };
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to register supplier');
      }
    });
  }

  viewInvoiceDetails(purchaseId: string): void {
    this.apiService.getPurchaseDetails(purchaseId).subscribe({
      next: (data) => {
        this.selectedPurchase.set(data);
        this.showDetailsModal.set(true);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set('Failed to fetch invoice details.');
      }
    });
  }
}
