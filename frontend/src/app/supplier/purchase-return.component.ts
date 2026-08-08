import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-purchase-returns',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="returns-container animate-fade-in">
      <div class="page-header">
        <div>
          <h1 class="gradient-text">↩️ Purchase Returns</h1>
          <p class="sub-title">Return medicines to suppliers with automatic debit notes & inventory reversal</p>
        </div>
        <button class="btn btn-primary-glass" (click)="openCreateModal()" id="btn-new-return">
          <i class="bi bi-plus-lg"></i> New Return
        </button>
      </div>

      <!-- Returns List -->
      <div class="glass-panel">
        <div class="panel-header">
          <h3><i class="bi bi-arrow-return-left"></i> Purchase Returns ({{ returns().length }})</h3>
        </div>

        @if (loading()) {
          <div class="loading-state"><div class="spinner"></div><p>Loading returns...</p></div>
        } @else {
          <div class="glass-table-container">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Return No.</th>
                  <th>Debit Note</th>
                  <th>Purchase Ref</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Return Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (ret of returns(); track ret._id) {
                  <tr>
                    <td><code>{{ ret.returnNumber }}</code></td>
                    <td><code class="text-info">{{ ret.debitNoteNumber }}</code></td>
                    <td><code>{{ ret.purchase?.invoiceNumber || '—' }}</code></td>
                    <td>{{ ret.supplier?.name || '—' }}</td>
                    <td>{{ ret.returnDate | date:'dd MMM yy' }}</td>
                    <td><span class="badge badge-info">{{ ret.items?.length }} items</span></td>
                    <td><strong class="text-danger">₹{{ ret.totalReturnAmount | number:'1.2-2' }}</strong></td>
                    <td><span class="badge" [ngClass]="getStatusBadge(ret.status)">{{ ret.status }}</span></td>
                    <td>
                      <button class="btn-action" (click)="viewReturn(ret)" title="View details">
                        <i class="bi bi-eye-fill"></i>
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="9" class="empty-row">
                    <i class="bi bi-arrow-return-left"></i>
                    <p>No purchase returns created yet</p>
                  </td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Create Return Modal -->
      @if (showCreateModal) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-panel glass-panel" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3><i class="bi bi-arrow-return-left" style="color: #ef4444;"></i> Create Purchase Return</h3>
              <button class="btn-icon" (click)="closeModal()"><i class="bi bi-x-lg"></i></button>
            </div>

            <div class="modal-body">
              <!-- Step 1: Select Purchase -->
              <div class="form-section">
                <h4 class="section-title">📦 Select Purchase Order</h4>
                <select class="form-control" [(ngModel)]="selectedPurchaseId" (change)="onPurchaseSelect()" id="ret-purchase-select">
                  <option value="">— Choose a Purchase Invoice —</option>
                  @for (p of purchases(); track p._id) {
                    <option [value]="p._id">{{ p.invoiceNumber }} — {{ p.supplier?.name }} ({{ p.invoiceDate | date:'dd MMM yy' }}) — ₹{{ p.totalAmount }}</option>
                  }
                </select>
              </div>

              <!-- Return Reason -->
              <div class="form-section">
                <h4 class="section-title">📝 Return Reason</h4>
                <input type="text" class="form-control" [(ngModel)]="returnReason" placeholder="e.g. Damaged goods, Near expiry, Wrong product" id="ret-reason" />
              </div>

              <!-- Items to Return -->
              <div class="form-section">
                <div class="section-title-row">
                  <h4 class="section-title">💊 Items to Return</h4>
                  <button class="btn-add-med" (click)="addReturnItem()"><i class="bi bi-plus"></i> Add Item</button>
                </div>

                @for (item of returnItems; track $index; let i = $index) {
                  <div class="return-item-row glass-panel">
                    <div class="form-group">
                      <label>Medicine</label>
                      <select class="form-control" [(ngModel)]="item.medicineId" [id]="'ret-med-' + i">
                        <option value="">Select medicine</option>
                        @for (m of medicines(); track m._id) {
                          <option [value]="m._id">{{ m.name }} {{ m.strength }}</option>
                        }
                      </select>
                    </div>
                    <div class="form-group">
                      <label>Batch Number</label>
                      <input type="text" class="form-control" [(ngModel)]="item.batchNumber" placeholder="Batch no." [id]="'ret-batch-' + i" />
                    </div>
                    <div class="form-group">
                      <label>Return Qty</label>
                      <input type="number" class="form-control" [(ngModel)]="item.returnQuantity" min="1" [id]="'ret-qty-' + i" />
                    </div>
                    <div class="form-group">
                      <label>Item Reason</label>
                      <input type="text" class="form-control" [(ngModel)]="item.reason" placeholder="Optional" [id]="'ret-item-reason-' + i" />
                    </div>
                    <button class="btn-remove" (click)="removeReturnItem(i)"><i class="bi bi-trash-fill"></i></button>
                  </div>
                }

                @if (returnItems.length === 0) {
                  <p class="text-muted" style="text-align:center; padding:16px;">Click "Add Item" to specify what to return</p>
                }
              </div>

              <div class="form-section">
                <h4 class="section-title">💬 Remarks</h4>
                <input type="text" class="form-control" [(ngModel)]="returnRemarks" placeholder="Optional internal remarks" id="ret-remarks" />
              </div>
            </div>

            <div class="modal-footer">
              @if (saveError) { <p class="error-msg">{{ saveError }}</p> }
              <button class="btn btn-glass" (click)="closeModal()">Cancel</button>
              <button class="btn btn-danger-glass" (click)="saveReturn()" [disabled]="saving()">
                @if (saving()) { <span class="spinner-sm"></span> Processing... }
                @else { <i class="bi bi-arrow-return-left"></i> Process Return }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- View Return Modal -->
      @if (viewingReturn()) {
        <div class="modal-overlay" (click)="viewingReturn.set(null)">
          <div class="modal-panel glass-panel" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3><i class="bi bi-arrow-return-left" style="color: #ef4444;"></i> Return Details</h3>
              <button class="btn-icon" (click)="viewingReturn.set(null)"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="modal-body">
              <div class="rx-detail-grid">
                <div class="detail-row"><span>Return No.</span><code>{{ viewingReturn()?.returnNumber }}</code></div>
                <div class="detail-row"><span>Debit Note</span><code class="text-info">{{ viewingReturn()?.debitNoteNumber }}</code></div>
                <div class="detail-row"><span>Supplier</span><strong>{{ viewingReturn()?.supplier?.name }}</strong></div>
                <div class="detail-row"><span>Return Date</span><strong>{{ viewingReturn()?.returnDate | date:'dd MMM yyyy' }}</strong></div>
                <div class="detail-row"><span>Reason</span><strong>{{ viewingReturn()?.reason || '—' }}</strong></div>
                <div class="detail-row"><span>Total Return</span><strong class="text-danger">₹{{ viewingReturn()?.totalReturnAmount | number:'1.2-2' }}</strong></div>
                <div class="detail-row"><span>Status</span><span class="badge" [ngClass]="getStatusBadge(viewingReturn()?.status)">{{ viewingReturn()?.status }}</span></div>
              </div>

              <div class="rx-med-list" style="margin-top:20px;">
                <h4>Returned Items</h4>
                <div class="glass-table-container">
                  <table class="glass-table">
                    <thead><tr><th>Medicine</th><th>Batch</th><th>Qty</th><th>Rate</th><th>Amount</th><th>Reason</th></tr></thead>
                    <tbody>
                      @for (item of viewingReturn()?.items; track $index) {
                        <tr>
                          <td>{{ item.medicine?.name || '—' }}</td>
                          <td><code>{{ item.batchNumber }}</code></td>
                          <td>{{ item.returnQuantity }}</td>
                          <td>₹{{ item.purchaseRate }}</td>
                          <td><strong class="text-danger">₹{{ item.returnAmount | number:'1.2-2' }}</strong></td>
                          <td>{{ item.reason || '—' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .returns-container { display: flex; flex-direction: column; gap: 20px; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; }
    h1 { font-size: 1.8rem; margin-bottom: 4px; }
    .sub-title { color: var(--text-secondary); font-size: 0.9rem; }
    .btn-primary-glass { padding: 10px 18px; border-radius: 10px; border: 1px solid rgba(130,87,229,0.4); background: rgba(130,87,229,0.15); color: #a855f7; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.9rem; }
    .btn-danger-glass { padding: 10px 18px; border-radius: 10px; border: 1px solid rgba(239,68,68,0.4); background: rgba(239,68,68,0.1); color: #ef4444; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.9rem; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .form-control { background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); padding: 8px 12px; font-size: 0.9rem; width: 100%; }
    select.form-control option { background: #1a1625; }
    .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; color: var(--text-secondary); }
    .spinner { width: 32px; height: 32px; border: 3px solid rgba(130,87,229,0.15); border-top-color: #8257e5; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .text-danger { color: #ef4444; }
    .text-info { color: #0ea5e9; }
    .text-muted { color: var(--text-muted); }
    .btn-action { width: 30px; height: 30px; border-radius: 7px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.04); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; transition: all 0.15s; }
    .btn-action:hover { color: var(--text-primary); border-color: rgba(255,255,255,0.15); }
    .empty-row { text-align: center; padding: 40px; color: var(--text-muted); }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; }
    .modal-panel { width: 100%; max-width: 760px; max-height: 90vh; display: flex; flex-direction: column; border-radius: 20px; overflow: hidden; animation: modalIn 0.25s ease; }
    @keyframes modalIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; border-bottom: 1px solid var(--glass-border); }
    .modal-header h3 { font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .modal-body { flex-grow: 1; overflow-y: auto; padding: 20px 24px; }
    .modal-footer { padding: 16px 24px; border-top: 1px solid var(--glass-border); display: flex; align-items: center; gap: 12px; justify-content: flex-end; }
    .btn-icon { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1rem; padding: 4px; border-radius: 6px; }

    .form-section { margin-bottom: 20px; }
    .section-title { font-size: 0.82rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .section-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; }
    .return-item-row { display: grid; grid-template-columns: 2fr 1.5fr 1fr 1.5fr auto; gap: 10px; align-items: flex-end; padding: 14px 16px; margin-bottom: 8px; }
    .btn-add-med { padding: 6px 12px; border-radius: 7px; border: 1px solid rgba(130,87,229,0.3); background: rgba(130,87,229,0.1); color: #a855f7; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 4px; }
    .btn-remove { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #ef4444; border-radius: 7px; padding: 8px 10px; cursor: pointer; }
    .error-msg { color: #ef4444; font-size: 0.85rem; flex-grow: 1; }
    .spinner-sm { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; margin-right: 4px; }

    .rx-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .detail-row { display: flex; flex-direction: column; gap: 4px; }
    .detail-row span:first-child { font-size: 0.72rem; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.4px; }
    .rx-med-list h4 { font-size: 0.82rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 10px; }
  `]
})
export class PurchaseReturnComponent implements OnInit {
  private apiService = inject(ApiService);

  returns = signal<any[]>([]);
  purchases = signal<any[]>([]);
  medicines = signal<any[]>([]);
  loading = signal(false);
  saving = signal(false);
  viewingReturn = signal<any>(null);
  showCreateModal = false;
  saveError = '';
  selectedPurchaseId = '';
  returnReason = '';
  returnRemarks = '';
  returnItems: any[] = [];

  ngOnInit(): void {
    this.loadReturns();
    this.loadPurchases();
    this.loadMedicines();
  }

  loadReturns(): void {
    this.loading.set(true);
    this.apiService.getPurchaseReturns().subscribe({
      next: (d) => { this.returns.set(d.returns || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  loadPurchases(): void {
    this.apiService.getPurchases().subscribe({
      next: (d: any) => {
        const list = Array.isArray(d) ? d : ((d as any).purchases || []);
        this.purchases.set(list);
      },
      error: () => {}
    });
  }

  loadMedicines(): void {
    this.apiService.getMedicines().subscribe({
      next: (d: any) => {
        this.medicines.set(Array.isArray(d) ? d : []);
      },
      error: () => {}
    });
  }

  openCreateModal(): void {
    this.selectedPurchaseId = '';
    this.returnReason = '';
    this.returnRemarks = '';
    this.returnItems = [];
    this.saveError = '';
    this.showCreateModal = true;
  }

  closeModal(): void { this.showCreateModal = false; }

  onPurchaseSelect(): void { /* could pre-fill batches in future */ }

  addReturnItem(): void {
    this.returnItems.push({ medicineId: '', batchNumber: '', returnQuantity: 1, reason: '' });
  }

  removeReturnItem(i: number): void { this.returnItems.splice(i, 1); }

  saveReturn(): void {
    if (!this.selectedPurchaseId || this.returnItems.length === 0) {
      this.saveError = 'Select a purchase and add at least one item'; return;
    }
    const invalidItem = this.returnItems.find(item => !item.medicineId || !item.batchNumber || !item.returnQuantity);
    if (invalidItem) { this.saveError = 'All item fields are required'; return; }

    this.saving.set(true);
    this.saveError = '';

    this.apiService.createPurchaseReturn({
      purchaseId: this.selectedPurchaseId,
      reason: this.returnReason,
      remarks: this.returnRemarks,
      items: this.returnItems
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showCreateModal = false;
        this.loadReturns();
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError = err.error?.message || 'Failed to process return';
      }
    });
  }

  viewReturn(ret: any): void {
    this.apiService.getPurchaseReturn(ret._id).subscribe({
      next: (d) => this.viewingReturn.set(d),
      error: () => this.viewingReturn.set(ret)
    });
  }

  getStatusBadge(status: string): string {
    if (status === 'Approved') return 'badge-success';
    if (status === 'Rejected') return 'badge-danger';
    return 'badge-warning';
  }
}
