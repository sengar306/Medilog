import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-medicine-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="transfer-container animate-fade-in">
      <div class="page-header">
        <div>
          <h1 class="gradient-text"><i class="bi bi-arrow-left-right"></i> Inter-Store Medicine Transfer</h1>
          <p class="sub-title">Transfer medicine batches to other chemist stores and accept incoming stock transfers.</p>
        </div>
        <button (click)="openInitiateModal()" class="btn btn-primary">
          <i class="bi bi-send-plus-fill"></i> Initiate Transfer
        </button>
      </div>

      <!-- Alerts -->
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

      <!-- Transfer Tab Controls -->
      <div class="tab-controls glass-panel">
        <div class="tab-buttons btn-group">
          <button class="btn" [class.btn-primary]="activeTab() === 'incoming'" [class.btn-glass]="activeTab() !== 'incoming'" (click)="activeTab.set('incoming')">
            <i class="bi bi-box-arrow-in-down"></i> Incoming Transfers
            @if (pendingIncomingCount() > 0) {
              <span class="nav-badge danger ml-2">{{ pendingIncomingCount() }}</span>
            }
          </button>

          <button class="btn" [class.btn-primary]="activeTab() === 'outgoing'" [class.btn-glass]="activeTab() !== 'outgoing'" (click)="activeTab.set('outgoing')">
            <i class="bi bi-box-arrow-up-right"></i> Outgoing Transfers
          </button>
        </div>
      </div>

      <!-- Tab 1: Incoming Transfers -->
      @if (activeTab() === 'incoming') {
        <div class="glass-panel">
          <div class="panel-header">
            <h3><i class="bi bi-inbox-fill" style="color: #38bdf8;"></i> Incoming Medicine Transfer Requests</h3>
            <span class="badge badge-info">{{ incomingTransfers().length }} Total</span>
          </div>

          <div class="glass-table-container mt-3">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Transfer #</th>
                  <th>Sender Chemist Store</th>
                  <th>Medicine Name</th>
                  <th>Batch #</th>
                  <th>Qty</th>
                  <th>Expiry Date</th>
                  <th>Rate / MRP</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (trf of incomingTransfers(); track trf._id) {
                  <tr>
                    <td><code>{{ trf.transferNumber }}</code></td>
                    <td>
                      <strong style="color: #38bdf8;">
                        <i class="bi bi-shop"></i> {{ trf.sender?.chemistName || trf.sender?.username || 'Unknown Store' }}
                      </strong>
                    </td>
                    <td><strong>{{ trf.medicine?.name }}</strong> <small class="text-secondary">({{ trf.medicine?.strength }})</small></td>
                    <td><code>{{ trf.batchNumber }}</code></td>
                    <td><strong style="color: var(--primary);">{{ trf.quantity }}</strong></td>
                    <td>{{ trf.expiryDate | date:'mediumDate' }}</td>
                    <td>₹{{ trf.purchaseRate | number:'1.2-2' }} / ₹{{ trf.mrp | number:'1.2-2' }}</td>
                    <td>
                      <span class="badge" [ngClass]="getStatusBadgeClass(trf.status)">
                        {{ trf.status }}
                      </span>
                    </td>
                    <td>
                      @if (trf.status === 'Pending') {
                        <div style="display: flex; gap: 6px;">
                          <button (click)="acceptTransfer(trf)" class="btn btn-sm btn-primary" title="Accept & Add to Inventory Stock">
                            <i class="bi bi-check-circle-fill"></i> Accept & Receive
                          </button>
                          <button (click)="rejectTransfer(trf)" class="btn btn-sm btn-danger" title="Reject Transfer">
                            <i class="bi bi-x-circle-fill"></i> Reject
                          </button>
                        </div>
                      } @else {
                        <span class="text-muted" style="font-size: 0.8rem;">
                          {{ trf.actionDate | date:'short' }}
                        </span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="9" class="text-center text-muted py-4">No incoming transfer requests found.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Tab 2: Outgoing Transfers -->
      @if (activeTab() === 'outgoing') {
        <div class="glass-panel">
          <div class="panel-header">
            <h3><i class="bi bi-send-fill" style="color: #a855f7;"></i> Outgoing Medicine Transfers Sent</h3>
            <span class="badge badge-info">{{ outgoingTransfers().length }} Total</span>
          </div>

          <div class="glass-table-container mt-3">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Transfer #</th>
                  <th>Recipient Chemist Store</th>
                  <th>Medicine Name</th>
                  <th>Batch #</th>
                  <th>Qty</th>
                  <th>Expiry Date</th>
                  <th>Date Sent</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                @for (trf of outgoingTransfers(); track trf._id) {
                  <tr>
                    <td><code>{{ trf.transferNumber }}</code></td>
                    <td>
                      <strong style="color: #a855f7;">
                        <i class="bi bi-shop"></i> {{ trf.receiver?.chemistName || trf.receiver?.username || 'Unknown Store' }}
                      </strong>
                    </td>
                    <td><strong>{{ trf.medicine?.name }}</strong> <small class="text-secondary">({{ trf.medicine?.strength }})</small></td>
                    <td><code>{{ trf.batchNumber }}</code></td>
                    <td><strong style="color: var(--primary);">{{ trf.quantity }}</strong></td>
                    <td>{{ trf.expiryDate | date:'mediumDate' }}</td>
                    <td>{{ trf.createdAt | date:'short' }}</td>
                    <td>
                      <span class="badge" [ngClass]="getStatusBadgeClass(trf.status)">
                        {{ trf.status }}
                      </span>
                    </td>
                    <td>
                      @if (trf.status === 'Pending') {
                        <button (click)="cancelTransfer(trf)" class="btn btn-sm btn-glass text-danger-color" title="Cancel Transfer Request">
                          <i class="bi bi-x-lg"></i> Cancel
                        </button>
                      } @else {
                        <span class="text-muted" style="font-size: 0.8rem;">Completed</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="9" class="text-center text-muted py-4">No outgoing transfers initiated yet.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Initiate Medicine Transfer Modal -->
      @if (showInitiateModal()) {
        <div class="modal-overlay" (click)="closeInitiateModal()">
          <div class="modal-card" (click)="$event.stopPropagation()" style="max-width: 600px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--glass-border); padding-bottom: 12px;">
              <h3 style="margin: 0; display: flex; align-items: center; gap: 8px;">
                <i class="bi bi-send-plus-fill" style="color: #38bdf8;"></i> Initiate Medicine Transfer
              </h3>
              <button (click)="closeInitiateModal()" style="background: none; border: none; color: var(--text-secondary); font-size: 1.2rem; cursor: pointer;">✕</button>
            </div>

            <form (ngSubmit)="handleInitiateTransfer()" class="mt-3">
              <div class="form-group">
                <label class="form-label">Select Target Chemist Store / Recipient *</label>
                <select [(ngModel)]="transferForm.receiverId" name="receiverId" class="glass-input glass-select" required style="padding: 10px 16px;">
                  <option value="">-- Choose Recipient Store --</option>
                  @for (user of users(); track user._id) {
                    @if (user._id !== currentUserId()) {
                      <option [value]="user._id">🏥 {{ user.chemistName || user.username }} ({{ user.username }})</option>
                    }
                  }
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Select Medicine & Batch from Stock *</label>
                <select [(ngModel)]="selectedBatchId" (change)="onBatchSelect()" name="selectedBatchId" class="glass-input glass-select" required style="padding: 10px 16px;">
                  <option value="">-- Choose Medicine Batch in Stock --</option>
                  @for (batch of activeBatches(); track batch._id) {
                    <option [value]="batch._id">
                      💊 {{ batch.medicine?.name }} (Batch: {{ batch.batchNumber }}, Stock Left: {{ batch.quantity }})
                    </option>
                  }
                </select>
              </div>

              @if (selectedBatchDetails()) {
                <div class="batch-summary-card glass-panel my-3" style="padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px; font-size: 0.88rem;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>Expiry Date: <strong>{{ selectedBatchDetails().expiryDate | date:'mediumDate' }}</strong></span>
                    <span>Available Stock: <strong style="color: #38bdf8;">{{ selectedBatchDetails().quantity }} units</strong></span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span>Purchase Rate: <strong>₹{{ selectedBatchDetails().purchaseRate }}</strong></span>
                    <span>MRP: <strong>₹{{ selectedBatchDetails().mrp }}</strong></span>
                  </div>
                </div>
              }

              <div class="form-group">
                <label class="form-label">Transfer Quantity *</label>
                <input 
                  type="number" 
                  [(ngModel)]="transferForm.quantity" 
                  name="quantity" 
                  class="glass-input" 
                  min="1" 
                  [max]="selectedBatchDetails() ? selectedBatchDetails().quantity : 9999" 
                  placeholder="Enter units to transfer"
                  required
                >
              </div>

              <div class="form-group">
                <label class="form-label">Transfer Remarks / Notes</label>
                <input type="text" [(ngModel)]="transferForm.remarks" name="remarks" class="glass-input" placeholder="e.g. Emergency stock request, Branch transfer...">
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;">
                <button (click)="closeInitiateModal()" type="button" class="btn btn-glass">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="!transferForm.receiverId || !selectedBatchId || transferForm.quantity < 1">
                  <i class="bi bi-send-fill"></i> Send Transfer Request
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .transfer-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    .sub-title {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    .btn-group {
      display: flex;
      gap: 8px;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .nav-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 10px;
    }
    .nav-badge.danger {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .mt-3 { margin-top: 16px; }
    .my-3 { margin: 12px 0; }
    .ml-2 { margin-left: 8px; }
    .py-4 { padding-top: 24px; padding-bottom: 24px; }
    .text-danger-color { color: #ef4444; }

    .alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
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
  `]
})
export class MedicineTransferComponent implements OnInit {
  private apiService = inject(ApiService);

  activeTab = signal<'incoming' | 'outgoing'>('incoming');
  transfers = signal<any[]>([]);
  users = signal<any[]>([]);
  activeBatches = signal<any[]>([]);

  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Modal State
  showInitiateModal = signal<boolean>(false);
  selectedBatchId: string = '';
  selectedBatchDetails = signal<any>(null);

  transferForm = {
    receiverId: '',
    quantity: 1,
    remarks: ''
  };

  currentUserId = computed(() => {
    const user = this.apiService.currentUser();
    return user ? user._id : '';
  });

  incomingTransfers = computed(() => {
    const uId = this.currentUserId();
    return this.transfers().filter(t => t.receiver?._id === uId || t.receiver === uId);
  });

  outgoingTransfers = computed(() => {
    const uId = this.currentUserId();
    return this.transfers().filter(t => t.sender?._id === uId || t.sender === uId);
  });

  pendingIncomingCount = computed(() => {
    return this.incomingTransfers().filter(t => t.status === 'Pending').length;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.apiService.getTransfers().subscribe({
      next: (data) => this.transfers.set(data),
      error: (err) => console.error('Failed to load transfers', err)
    });

    this.apiService.getUsers().subscribe({
      next: (data) => this.users.set(data),
      error: (err) => console.error('Failed to load users', err)
    });

    this.apiService.getInventory('IN_STOCK').subscribe({
      next: (data) => this.activeBatches.set(data.filter(b => b.quantity > 0)),
      error: (err) => console.error('Failed to load stock batches', err)
    });
  }

  clearAlerts(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  openInitiateModal(): void {
    this.clearAlerts();
    this.selectedBatchId = '';
    this.selectedBatchDetails.set(null);
    this.transferForm = {
      receiverId: '',
      quantity: 1,
      remarks: ''
    };
    this.showInitiateModal.set(true);
  }

  closeInitiateModal(): void {
    this.showInitiateModal.set(false);
  }

  onBatchSelect(): void {
    if (!this.selectedBatchId) {
      this.selectedBatchDetails.set(null);
      return;
    }
    const b = this.activeBatches().find(item => item._id === this.selectedBatchId);
    this.selectedBatchDetails.set(b || null);
  }

  handleInitiateTransfer(): void {
    const batch = this.selectedBatchDetails();
    if (!batch || !this.transferForm.receiverId) return;
    this.clearAlerts();

    const payload = {
      receiverId: this.transferForm.receiverId,
      medicineId: batch.medicine._id || batch.medicine,
      batchNumber: batch.batchNumber,
      quantity: this.transferForm.quantity,
      remarks: this.transferForm.remarks
    };

    this.apiService.createTransfer(payload).subscribe({
      next: (res) => {
        this.successMessage.set(`Transfer #${res.transferNumber} initiated successfully! Waiting for recipient acceptance.`);
        this.closeInitiateModal();
        this.loadData();
        this.activeTab.set('outgoing');
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to initiate medicine transfer');
      }
    });
  }

  acceptTransfer(trf: any): void {
    if (!confirm(`Accept transfer #${trf.transferNumber} of ${trf.quantity} units of '${trf.medicine?.name}' into your inventory stock?`)) return;
    this.clearAlerts();

    this.apiService.acceptTransfer(trf._id).subscribe({
      next: (res) => {
        this.successMessage.set(`Transfer #${res.transferNumber} accepted! Medicine & batch added to your inventory stock.`);
        this.loadData();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to accept transfer');
      }
    });
  }

  rejectTransfer(trf: any): void {
    if (!confirm(`Reject transfer #${trf.transferNumber}? The reserved stock will be returned to sender.`)) return;
    this.clearAlerts();

    this.apiService.rejectTransfer(trf._id).subscribe({
      next: (res) => {
        this.successMessage.set(`Transfer #${res.transferNumber} rejected.`);
        this.loadData();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to reject transfer');
      }
    });
  }

  cancelTransfer(trf: any): void {
    if (!confirm(`Cancel outgoing transfer #${trf.transferNumber}? Reserved stock will be restored to your inventory.`)) return;
    this.clearAlerts();

    this.apiService.cancelTransfer(trf._id).subscribe({
      next: (res) => {
        this.successMessage.set(`Transfer #${res.transferNumber} cancelled.`);
        this.loadData();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to cancel transfer');
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    if (status === 'Accepted') return 'badge-success';
    if (status === 'Pending') return 'badge-warning';
    if (status === 'Rejected' || status === 'Cancelled') return 'badge-danger';
    return 'badge-info';
  }
}
