import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-expiry-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="expiry-alerts-container animate-fade-in">
      <div class="header-section">
        <div>
          <h1>Expiry Alerts Monitor</h1>
          <p>Review soon-to-expire drug batches, schedule supplier returns, and export safety ledgers.</p>
        </div>
      </div>

      <div class="split-view">
        <!-- Main Expiry Workspace -->
        <div class="main-column glass-panel">
          <!-- Horizontal filter tabs -->
          <div class="tabs-header border-b">
            <button class="tab-btn" [class.active]="activeAlertTab() === 30" (click)="activeAlertTab.set(30)">
              Expiring in 30 Days <span class="badge badge-danger ml-1">{{ count30() }}</span>
            </button>
            <button class="tab-btn" [class.active]="activeAlertTab() === 60" (click)="activeAlertTab.set(60)">
              Expiring in 60 Days <span class="badge badge-warning ml-1">{{ count60() }}</span>
            </button>
            <button class="tab-btn" [class.active]="activeAlertTab() === 90" (click)="activeAlertTab.set(90)">
              Expiring in 90 Days <span class="badge badge-info ml-1">{{ count90() }}</span>
            </button>
            <button class="tab-btn" [class.active]="activeAlertTab() === 0" (click)="activeAlertTab.set(0)">
              Expired Batches <span class="badge badge-dark ml-1">{{ countExpired() }}</span>
            </button>
          </div>

          <!-- Alert Items Table -->
          <div class="glass-table-container mt-4">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Batch Number</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>Stock Qty</th>
                  <th>MRP</th>
                  <th>Supplier Distributor</th>
                </tr>
              </thead>
              <tbody>
                @for (batch of getActiveList(); track batch._id) {
                  <tr>
                    <td><strong>{{ batch.medicine.name }}</strong> <small class="text-secondary">({{ batch.medicine.strength }})</small></td>
                    <td><code>{{ batch.batchNumber }}</code></td>
                    <td>
                      <span class="badge" [ngClass]="getBadgeClass(batch.expiryDate)">
                        {{ batch.expiryDate | date:'mediumDate' }}
                      </span>
                    </td>
                    <td>
                      <strong [style.color]="getDaysLeftColor(batch.expiryDate)">
                        {{ getDaysLeftText(batch.expiryDate) }}
                      </strong>
                    </td>
                    <td><strong style="color: var(--primary);">{{ batch.quantity }}</strong></td>
                    <td>₹{{ batch.mrp | number:'1.2-2' }}</td>
                    <td>{{ batch.supplier ? batch.supplier.name : 'Unknown' }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="text-center text-muted py-4">No medicine batches matching this expiry status.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Sidebar: Quick Actions -->
        <div class="sidebar-column glass-panel">
          <h3>Quick Actions Workspace</h3>
          <p class="panel-subtitle">Expedite warehouse operations and resolve aging inventory items.</p>
          
          <div class="action-buttons-list mt-4">
            <button (click)="triggerAction('Alerts Sent')" class="btn btn-glass w-100 action-btn-row">
              <i class="bi bi-send-fill text-danger"></i>
              <div class="btn-text-area">
                <span class="btn-title">Send Expiry Alerts</span>
                <span class="btn-desc">Notify supplier about returns</span>
              </div>
            </button>
            
            <button (click)="printReport()" class="btn btn-glass w-100 action-btn-row mt-2">
              <i class="bi bi-file-earmark-bar-graph-fill text-warning"></i>
              <div class="btn-text-area">
                <span class="btn-title">Generate Expiry Report</span>
                <span class="btn-desc">Export print-ready document</span>
              </div>
            </button>
            
            <button (click)="triggerAction('Supplier Return processed')" class="btn btn-glass w-100 action-btn-row mt-2">
              <i class="bi bi-arrow-left-right text-info"></i>
              <div class="btn-text-area">
                <span class="btn-title">Return to Supplier</span>
                <span class="btn-desc">Log supplier warehouse returns</span>
              </div>
            </button>
          </div>

          <!-- Alert summary box -->
          <div class="summary-box-info mt-4">
            <h4 class="border-b pb-2"><i class="bi bi-info-circle-fill text-info"></i> Summary Audit</h4>
            <div class="summary-row mt-2">
              <span>Total Expiry Risk Value:</span>
              <strong class="text-danger">₹{{ totalRiskValue() | number:'1.2-2' }}</strong>
            </div>
            <p class="small-muted mt-2">Proactive monitoring of supplier return timelines prevents write-off losses.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .expiry-alerts-container {
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
    @media (max-width: 1100px) {
      .split-view {
        grid-template-columns: 1fr;
      }
    }
    .tabs-header {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      padding-bottom: 2px;
    }
    .tab-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 0.95rem;
      font-weight: 500;
      padding: 8px 12px 12px;
      cursor: pointer;
      position: relative;
      white-space: nowrap;
      transition: color 0.2s ease;
    }
    .tab-btn:hover {
      color: var(--text-primary);
    }
    .tab-btn.active {
      color: var(--primary);
      font-weight: 600;
    }
    .tab-btn.active::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 12px;
      right: 12px;
      height: 3px;
      background: var(--primary);
      border-radius: 4px;
    }
    .border-b { border-bottom: 1px solid var(--glass-border); }
    .pb-2 { padding-bottom: 8px; }
    
    .action-buttons-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .action-btn-row {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 16px;
      padding: 14px 20px;
      text-align: left;
    }
    .action-btn-row i {
      font-size: 1.5rem;
    }
    .btn-text-area {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .btn-title {
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--text-primary);
    }
    .btn-desc {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    
    .summary-box-info {
      background: rgba(0,0,0,0.15);
      border: 1px solid var(--glass-border);
      border-radius: 8px;
      padding: 16px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
    }
    .small-muted {
      font-size: 0.75rem;
      color: var(--text-muted);
      line-height: 1.3;
    }
    .panel-subtitle {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    
    .badge-dark {
      background: rgba(255,255,255,0.05);
      color: var(--text-secondary);
      border: 1px solid var(--glass-border);
    }
    .ml-1 { margin-left: 4px; }
    .mt-4 { margin-top: 24px; }
    .mt-2 { margin-top: 8px; }
    .text-danger { color: var(--danger); }
    .text-warning { color: var(--warning); }
    .text-info { color: var(--info); }
    .w-100 { width: 100%; }
  `]
})
export class ExpiryAlertsComponent implements OnInit {
  private apiService = inject(ApiService);

  activeAlertTab = signal<number>(30); // 30, 60, 90, 0 (expired)
  
  allInventory = signal<any[]>([]);

  // Count signals
  count30 = signal(0);
  count60 = signal(0);
  count90 = signal(0);
  countExpired = signal(0);

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts(): void {
    // Fetch all stock
    this.apiService.getInventory('active').subscribe({
      next: (data) => {
        // Also fetch expired stock so we count everything
        this.apiService.getInventory('expired').subscribe({
          next: (expiredData) => {
            const combined = [...data, ...expiredData];
            this.allInventory.set(combined);
            this.computeCounts(combined);
          },
          error: (err) => console.error(err)
        });
      },
      error: (err) => console.error(err)
    });
  }

  computeCounts(data: any[]): void {
    const today = new Date();
    
    let c30 = 0;
    let c60 = 0;
    let c90 = 0;
    let cExp = 0;

    data.forEach(batch => {
      const exp = new Date(batch.expiryDate);
      const diffTime = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        cExp++;
      } else if (diffDays <= 30) {
        c30++;
      } else if (diffDays <= 60) {
        c60++;
      } else if (diffDays <= 90) {
        c90++;
      }
    });

    this.count30.set(c30);
    this.count60.set(c60);
    this.count90.set(c90);
    this.countExpired.set(cExp);
  }

  getActiveList(): any[] {
    const today = new Date();
    const tab = this.activeAlertTab();

    return this.allInventory().filter(batch => {
      const exp = new Date(batch.expiryDate);
      const diffTime = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (tab === 0) return diffDays <= 0;
      if (tab === 30) return diffDays > 0 && diffDays <= 30;
      if (tab === 60) return diffDays > 30 && diffDays <= 60;
      if (tab === 90) return diffDays > 60 && diffDays <= 90;
      return false;
    });
  }

  totalRiskValue(): number {
    return this.allInventory()
      .filter(batch => {
        const exp = new Date(batch.expiryDate);
        const diffTime = exp.getTime() - today().getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 90; // Total risk sum
      })
      .reduce((sum, b) => sum + (b.quantity * b.mrp), 0);
  }

  // --- Helpers ---
  getDaysLeftText(expiryDateStr: string): string {
    const diffDays = getDaysDiff(expiryDateStr);
    if (diffDays <= 0) return 'Expired';
    return `${diffDays} days`;
  }

  getDaysLeftColor(expiryDateStr: string): string {
    const diffDays = getDaysDiff(expiryDateStr);
    if (diffDays <= 0) return 'var(--text-muted)';
    if (diffDays <= 30) return 'var(--danger)';
    if (diffDays <= 60) return 'var(--warning)';
    return 'var(--info)';
  }

  getBadgeClass(expiryDateStr: string): string {
    const diffDays = getDaysDiff(expiryDateStr);
    if (diffDays <= 0) return 'badge-dark';
    if (diffDays <= 30) return 'badge-danger';
    if (diffDays <= 60) return 'badge-warning';
    return 'badge-info';
  }

  triggerAction(actionName: string): void {
    alert(`Success: ${actionName} triggered for checked batches.`);
  }

  printReport(): void {
    window.print();
  }
}

// Global scope helpers
function today(): Date {
  const t = new Date();
  t.setHours(0,0,0,0);
  return t;
}

function getDaysDiff(expiryDateStr: string): number {
  const exp = new Date(expiryDateStr);
  const diffTime = exp.getTime() - today().getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
