import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="inventory-container animate-fade-in">
      <div class="header-section">
        <div>
          <h1>Inventory & Expiry Ledger</h1>
          <p>Monitor batch-wise stock levels, check expiry timelines, and view transaction records.</p>
        </div>
        
        <div class="tab-buttons btn-group">
          <button class="btn" [class.btn-primary]="activeTab() === 'batches'" [class.btn-glass]="activeTab() !== 'batches'" (click)="setTab('batches')">
            <i class="bi bi-box-seam-fill"></i> Batches in Stock
          </button>
          <button class="btn" [class.btn-primary]="activeTab() === 'alerts'" [class.btn-glass]="activeTab() !== 'alerts'" (click)="setTab('alerts')">
            <i class="bi bi-exclamation-octagon-fill"></i> Stock Alerts
          </button>
          <button class="btn" [class.btn-primary]="activeTab() === 'ledger'" [class.btn-glass]="activeTab() !== 'ledger'" (click)="setTab('ledger')">
            <i class="bi bi-clock-history"></i> Stock Transaction Ledger
          </button>
        </div>
      </div>

      <!-- Search & Chemist Selector Bar -->
      <div class="glass-panel mb-3" style="display: flex; align-items: center; gap: 15px; padding: 12px 16px; flex-wrap: wrap;">
        <div style="flex: 1; display: flex; align-items: center; gap: 10px; min-width: 250px;">
          <i class="bi bi-search" style="font-size: 1.1rem; color: var(--text-secondary);"></i>
          <input 
            type="text" 
            [value]="searchQuery()" 
            (input)="updateSearch($event)" 
            placeholder="Filter batches, medicine name, generic formula, batch number, transaction, or chemist..." 
            style="flex: 1; border: none; outline: none; background: transparent; color: #fff; font-size: 1rem;" 
          />
          @if (searchQuery()) {
            <button (click)="clearSearch()" style="border: none; background: transparent; color: var(--text-secondary); font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0 4px;">
              <i class="bi bi-x-circle-fill"></i>
            </button>
          }
        </div>

        @if (isAdmin()) {
          <div style="display: flex; align-items: center; gap: 10px;">
            <label class="form-label mb-0" style="white-space: nowrap; color: #38bdf8; font-weight: 600;"><i class="bi bi-shop"></i> Inspect Chemist Store:</label>
            <select [(ngModel)]="selectedUserId" (change)="onChemistChange()" class="glass-input glass-select" style="width: 200px; padding: 6px 12px;">
              <option value="all">🏬 All Chemists / Stores</option>
              @for (user of chemistUsers(); track user._id) {
                <option [value]="user._id">🏥 {{ user.chemistName || user.username }} ({{ user.username }})</option>
              }
            </select>
          </div>
        }
      </div>

      <!-- Tab 1: Batches in Stock -->
      @if (activeTab() === 'batches') {
        <div class="glass-panel">
          <div class="filter-bar">
            <h3>Active Inventory Batches</h3>
            
            <div class="filter-controls">
              <label class="form-label inline-label">Filter Status</label>
              <select [(ngModel)]="batchFilter" (change)="loadBatches()" class="glass-input glass-select inline-select">
                <option value="active">Active & Safe Stock</option>
                <option value="near-expiry">Near Expiry (90 Days)</option>
                <option value="expired">Expired Batches</option>
              </select>
            </div>
          </div>

          <div class="glass-table-container mt-3">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Chemist Store</th>
                  <th>Batch Number</th>
                  <th>Quantity Left</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Purchase Rate</th>
                  <th>MRP</th>
                  <th>Rack Location</th>
                  <th>Supplier</th>
                </tr>
              </thead>
              <tbody>
                @for (batch of filteredBatches(); track batch._id) {
                  <tr>
                    <td><strong>{{ batch.medicine?.name }}</strong> <small class="text-secondary">({{ batch.medicine?.strength }})</small></td>
                    <td>
                      <span class="badge" style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #7dd3fc;">
                        <i class="bi bi-shop"></i> {{ batch.chemistName || batch.user?.chemistName || batch.medicine?.user?.chemistName || 'Central Store' }}
                      </span>
                    </td>
                    <td><code>{{ batch.batchNumber }}</code></td>
                    <td><strong style="color: var(--primary);">{{ batch.quantity }}</strong> / {{ batch.initialQuantity }}</td>
                    <td>{{ batch.expiryDate | date:'mediumDate' }}</td>
                    <td>
                      <span class="badge" [ngClass]="getBatchStatusClass(batch.expiryDate)">
                        {{ getBatchStatusText(batch.expiryDate) }}
                      </span>
                    </td>
                    <td>₹{{ batch.purchaseRate | number:'1.2-2' }}</td>
                    <td>₹{{ batch.mrp | number:'1.2-2' }}</td>
                    <td>
                      @if (batch.medicine?.rack) {
                        <span class="badge badge-info"><i class="bi bi-geo-alt"></i> {{ batch.medicine.rack.name }}</span>
                      } @else {
                        <span class="text-muted">N/A</span>
                      }
                    </td>
                    <td>{{ batch.supplier ? batch.supplier.name : 'Unknown' }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="10" class="text-center text-muted">No inventory batches matching selection.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Tab 2: Stock Alerts (Low Stock / Expiring) -->
      @if (activeTab() === 'alerts') {
        <div class="split-view">
          <!-- Low Stock Column -->
          <div class="glass-panel">
            <div class="panel-header text-danger-icon">
              <i class="bi bi-arrow-down-square-fill"></i>
              <h3>Reorder List (Low Stock)</h3>
            </div>
            <p class="panel-subtitle">Items whose cumulative stock is below minimum safe levels.</p>
            
            <div class="glass-table-container mt-3">
              <table class="glass-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Current Stock</th>
                    <th>Required Min</th>
                    <th>Rack</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of filteredLowStock(); track item.medicine._id) {
                    <tr>
                      <td><strong>{{ item.medicine.name }}</strong> <small>({{ item.medicine.strength }})</small></td>
                      <td><span class="badge badge-danger">{{ item.currentStock }}</span></td>
                      <td>{{ item.minStockLevel }}</td>
                      <td>
                        @if (item.medicine.rack) {
                          <span class="badge badge-info">{{ item.medicine.rack.name }}</span>
                        } @else {
                          <span class="text-muted">-</span>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4" class="text-center text-muted">Stock levels healthy! No reorder items.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Near Expiry Column -->
          <div class="glass-panel">
            <div class="panel-header text-warning-icon">
              <i class="bi bi-calendar2-range-fill"></i>
              <h3>Expiring Soon (90 Days)</h3>
            </div>
            <p class="panel-subtitle">Inventory batches nearing expiry. Sell soon or return to supplier.</p>
            
            <div class="glass-table-container mt-3">
              <table class="glass-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Batch</th>
                    <th>Qty</th>
                    <th>Expiry Date</th>
                  </tr>
                </thead>
                <tbody>
                  @for (batch of filteredNearExpiry(); track batch._id) {
                    <tr>
                      <td><strong>{{ batch.medicine.name }}</strong></td>
                      <td><code>{{ batch.batchNumber }}</code></td>
                      <td>{{ batch.quantity }}</td>
                      <td><span class="badge badge-warning">{{ batch.expiryDate | date:'mediumDate' }}</span></td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4" class="text-center text-muted">No stock batches expiring within 90 days.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- Tab 3: Transaction Ledger -->
      @if (activeTab() === 'ledger') {
        <div class="glass-panel">
          <div class="panel-header">
            <h3>System Stock Ledger Trail</h3>
            <span class="badge badge-info">Latest 100 Transactions</span>
          </div>
          <p class="panel-subtitle">Audited record of all stock additions, deductions, adjustments, and writes.</p>

          <div class="glass-table-container mt-3">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Medicine</th>
                  <th>Batch No</th>
                  <th>Transaction Type</th>
                  <th>Stock Delta</th>
                  <th>Stock Balance</th>
                  <th>Reference</th>
                  <th>Responsible User</th>
                </tr>
              </thead>
              <tbody>
                @for (tx of filteredLedger(); track tx._id) {
                  <tr>
                    <td>{{ tx.createdAt | date:'MMM d, yyyy, h:mm a' }}</td>
                    <td><strong>{{ tx.medicine ? tx.medicine.name : 'Unknown' }}</strong></td>
                    <td><code>{{ tx.batchNumber }}</code></td>
                    <td>
                      <span class="badge" [ngClass]="getTxTypeClass(tx.transactionType)">
                        {{ tx.transactionType }}
                      </span>
                    </td>
                    <td>
                      <strong [style.color]="tx.quantity > 0 ? 'var(--success)' : 'var(--danger)'">
                        {{ tx.quantity > 0 ? '+' : '' }}{{ tx.quantity }}
                      </strong>
                    </td>
                    <td>{{ tx.previousStock }} <i class="bi bi-arrow-right"></i> <strong>{{ tx.newStock }}</strong></td>
                    <td>{{ tx.remarks || 'Manual adjustment' }}</td>
                    <td><code>{{ tx.user ? tx.user.username : 'System' }}</code></td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="text-center text-muted">No stock transactions ledger entry found.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .inventory-container {
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
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    .filter-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .inline-label {
      margin-bottom: 0;
      white-space: nowrap;
    }
    .inline-select {
      width: 220px;
    }
    .split-view {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    @media (max-width: 992px) {
      .split-view {
        grid-template-columns: 1fr;
      }
    }
    .panel-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .panel-header i {
      font-size: 1.5rem;
    }
    .text-danger-icon i { color: var(--danger); }
    .text-warning-icon i { color: var(--warning); }
    .panel-subtitle {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    .mt-3 { margin-top: 16px; }
  `]
})
export class InventoryComponent implements OnInit {
  private apiService = inject(ApiService);

  activeTab = signal<'batches' | 'alerts' | 'ledger'>('batches');

  batches = signal<any[]>([]);
  lowStock = signal<any[]>([]);
  nearExpiry = signal<any[]>([]);
  ledger = signal<any[]>([]);
  
  // Multi-tenancy & Chemist filter for Admin
  isAdmin = signal<boolean>(false);
  chemistUsers = signal<any[]>([]);
  selectedUserId = 'all';

  batchFilter = 'active';
  searchQuery = signal('');

  updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  filteredBatches = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.batches();
    if (!query) return list;
    return list.filter(b => 
      (b.medicine?.name && b.medicine.name.toLowerCase().includes(query)) ||
      (b.medicine?.genericName && b.medicine.genericName.toLowerCase().includes(query)) ||
      (b.batchNumber && b.batchNumber.toLowerCase().includes(query)) ||
      (b.supplier?.name && b.supplier.name.toLowerCase().includes(query)) ||
      (b.user?.chemistName && b.user.chemistName.toLowerCase().includes(query)) ||
      (b.medicine?.user?.chemistName && b.medicine.user.chemistName.toLowerCase().includes(query))
    );
  });

  filteredLowStock = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.lowStock();
    if (!query) return list;
    return list.filter(item => 
      (item.medicine?.name && item.medicine.name.toLowerCase().includes(query)) ||
      (item.medicine?.genericName && item.medicine.genericName.toLowerCase().includes(query)) ||
      (item.medicine?.user?.chemistName && item.medicine.user.chemistName.toLowerCase().includes(query))
    );
  });

  filteredNearExpiry = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.nearExpiry();
    if (!query) return list;
    return list.filter(b => 
      (b.medicine?.name && b.medicine.name.toLowerCase().includes(query)) ||
      (b.medicine?.genericName && b.medicine.genericName.toLowerCase().includes(query)) ||
      (b.batchNumber && b.batchNumber.toLowerCase().includes(query)) ||
      (b.user?.chemistName && b.user.chemistName.toLowerCase().includes(query))
    );
  });

  filteredLedger = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.ledger();
    if (!query) return list;
    return list.filter(tx => 
      (tx.medicine?.name && tx.medicine.name.toLowerCase().includes(query)) ||
      (tx.batchNumber && tx.batchNumber.toLowerCase().includes(query)) ||
      (tx.remarks && tx.remarks.toLowerCase().includes(query)) ||
      (tx.user?.username && tx.user.username.toLowerCase().includes(query)) ||
      (tx.user?.chemistName && tx.user.chemistName.toLowerCase().includes(query)) ||
      (tx.transactionType && tx.transactionType.toLowerCase().includes(query))
    );
  });

  ngOnInit(): void {
    this.checkAdminStatus();
    this.loadBatches();
    this.loadAlerts();
    this.loadLedger();
  }

  checkAdminStatus(): void {
    const isAdm = this.apiService.hasRole(['Admin']);
    this.isAdmin.set(isAdm);
    if (isAdm) {
      this.apiService.getUsers().subscribe({
        next: (users) => this.chemistUsers.set(users),
        error: (err) => console.error('Failed to load chemist users', err)
      });
    }
  }

  onChemistChange(): void {
    this.loadBatches();
    this.loadAlerts();
    this.loadLedger();
  }

  setTab(tab: 'batches' | 'alerts' | 'ledger'): void {
    this.activeTab.set(tab);
    if (tab === 'batches') this.loadBatches();
    if (tab === 'alerts') this.loadAlerts();
    if (tab === 'ledger') this.loadLedger();
  }

  loadBatches(): void {
    const uId = this.isAdmin() && this.selectedUserId !== 'all' ? this.selectedUserId : undefined;
    this.apiService.getInventory(this.batchFilter, undefined, undefined, uId).subscribe({
      next: (data) => this.batches.set(data),
      error: (err) => console.error(err)
    });
  }

  loadAlerts(): void {
    const uId = this.isAdmin() && this.selectedUserId !== 'all' ? this.selectedUserId : undefined;
    this.apiService.getLowStock(uId).subscribe({
      next: (data) => this.lowStock.set(data),
      error: (err) => console.error(err)
    });

    this.apiService.getInventory('near-expiry', undefined, undefined, uId).subscribe({
      next: (data) => this.nearExpiry.set(data),
      error: (err) => console.error(err)
    });
  }

  loadLedger(): void {
    const uId = this.isAdmin() && this.selectedUserId !== 'all' ? this.selectedUserId : undefined;
    this.apiService.getStockLedger(undefined, uId).subscribe({
      next: (data) => this.ledger.set(data),
      error: (err) => console.error(err)
    });
  }

  // --- Expiry Badge Formatter ---
  getBatchStatusClass(expiryDateStr: string): string {
    const today = new Date();
    const exp = new Date(expiryDateStr);
    
    if (exp < today) return 'badge-danger';
    
    const limit = new Date();
    limit.setDate(today.getDate() + 90);
    if (exp <= limit) return 'badge-warning';
    
    return 'badge-success';
  }

  getBatchStatusText(expiryDateStr: string): string {
    const today = new Date();
    const exp = new Date(expiryDateStr);
    
    if (exp < today) return 'EXPIRED';
    
    const limit = new Date();
    limit.setDate(today.getDate() + 90);
    if (exp <= limit) return 'NEAR EXPIRY';
    
    return 'SAFE';
  }

  // --- Transaction Ledger formatting ---
  getTxTypeClass(type: string): string {
    if (type === 'Purchase') return 'badge-info';
    if (type === 'Sale') return 'badge-success';
    if (type === 'Expiry') return 'badge-danger';
    return 'badge-warning'; // Adjustment
  }
}
