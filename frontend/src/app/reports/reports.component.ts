import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reports-container animate-fade-in">
      <div class="page-header">
        <div>
          <h1 class="gradient-text">📊 Analytics & Reports</h1>
          <p class="sub-title">Comprehensive business intelligence for your pharmacy</p>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tab-bar glass-panel">
        @for (tab of tabs; track tab.id) {
          <button class="tab-btn" [class.active]="activeTab === tab.id" (click)="switchTab(tab.id)" [id]="'tab-' + tab.id">
            <i [class]="'bi ' + tab.icon"></i> {{ tab.label }}
          </button>
        }
      </div>

      <!-- Date Range Filter -->
      <div class="glass-panel filter-bar">
        <div class="filter-group">
          <label>From Date</label>
          <input type="date" class="form-control" [(ngModel)]="fromDate" (change)="loadCurrentTab()" id="report-from-date" />
        </div>
        <div class="filter-group">
          <label>To Date</label>
          <input type="date" class="form-control" [(ngModel)]="toDate" (change)="loadCurrentTab()" id="report-to-date" />
        </div>
        <button class="btn btn-glass" (click)="clearFilters()">
          <i class="bi bi-x-circle"></i> Clear
        </button>
        <button class="btn btn-primary-glass" (click)="loadCurrentTab()">
          <i class="bi bi-arrow-repeat"></i> Refresh
        </button>
        <button class="btn btn-success-glass ml-auto" (click)="exportCSV()">
          <i class="bi bi-download"></i> Export CSV
        </button>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="loading-state glass-panel">
          <div class="spinner"></div>
          <p>Loading analytics data...</p>
        </div>
      }

      <!-- TAB: Sales Summary -->
      @if (!loading() && activeTab === 'sales') {
        <div class="animate-fade-in">
          <!-- KPI Row -->
          <div class="kpi-row">
            <div class="glass-panel kpi-mini">
              <span class="kpi-label">Total Invoices</span>
              <span class="kpi-value">{{ salesData().summary.totalSales }}</span>
            </div>
            <div class="glass-panel kpi-mini success">
              <span class="kpi-label">Total Revenue</span>
              <span class="kpi-value">₹{{ salesData().summary.totalRevenue | number:'1.2-2' }}</span>
            </div>
            <div class="glass-panel kpi-mini info">
              <span class="kpi-label">Total GST</span>
              <span class="kpi-value">₹{{ salesData().summary.totalGst | number:'1.2-2' }}</span>
            </div>
            <div class="glass-panel kpi-mini warning">
              <span class="kpi-label">Total Discounts</span>
              <span class="kpi-value">₹{{ salesData().summary.totalDiscount | number:'1.2-2' }}</span>
            </div>
          </div>

          <!-- Payment Breakdown -->
          <div class="glass-panel mt-4">
            <h3 class="panel-title"><i class="bi bi-pie-chart-fill"></i> Payment Mode Breakdown</h3>
            <div class="payment-bars">
              @for (mode of paymentModes; track mode) {
                <div class="pay-row">
                  <span class="pay-label">{{ mode }}</span>
                  <div class="pay-bar-track">
                    <div class="pay-bar-fill" [style.width]="getPaymentPercent(mode) + '%'" [class]="'pay-' + mode.toLowerCase()"></div>
                  </div>
                  <span class="pay-amount">₹{{ (salesData().summary.paymentBreakdown[mode] || 0) | number:'1.0-0' }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Sales Table -->
          <div class="glass-panel mt-4">
            <h3 class="panel-title"><i class="bi bi-table"></i> Sales Transactions ({{ salesData().sales?.length || 0 }})</h3>
            <div class="glass-table-container">
              <table class="glass-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Payment</th>
                    <th>Subtotal</th>
                    <th>GST</th>
                    <th>Discount</th>
                    <th>Net</th>
                    <th>Cashier</th>
                  </tr>
                </thead>
                <tbody>
                  @for (sale of salesData().sales; track sale._id) {
                    <tr>
                      <td><code>{{ sale.invoiceNumber }}</code></td>
                      <td>{{ sale.saleDate | date:'dd MMM yy' }}</td>
                      <td>{{ sale.customer?.name || '—' }}</td>
                      <td><span class="badge badge-info">{{ sale.paymentMode }}</span></td>
                      <td>₹{{ sale.subTotal | number:'1.2-2' }}</td>
                      <td>₹{{ sale.gstTotal | number:'1.2-2' }}</td>
                      <td class="text-warning">₹{{ sale.discountAmount | number:'1.2-2' }}</td>
                      <td><strong class="text-success">₹{{ sale.totalAmount | number:'1.2-2' }}</strong></td>
                      <td><code>{{ sale.cashier?.username || '—' }}</code></td>
                    </tr>
                  } @empty {
                    <tr><td colspan="9" class="empty-row">No sales found for selected period</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- TAB: Top Medicines -->
      @if (!loading() && activeTab === 'top-medicines') {
        <div class="animate-fade-in">
          <div class="glass-panel">
            <h3 class="panel-title"><i class="bi bi-trophy-fill" style="color: #f59e0b;"></i> Top Selling Medicines</h3>
            <div class="top-meds-list">
              @for (item of topMeds(); track item._id; let i = $index) {
                <div class="top-med-row">
                  <div class="rank-badge" [class.gold]="i===0" [class.silver]="i===1" [class.bronze]="i===2">
                    #{{ i + 1 }}
                  </div>
                  <div class="med-info">
                    <p class="med-name">{{ item.medicine?.name || 'Unknown' }}</p>
                    <p class="med-meta">{{ item.medicine?.strength }} · {{ item.medicine?.category }} · {{ item.salesCount }} invoices</p>
                  </div>
                  <div class="med-stats">
                    <span class="stat-qty">{{ item.totalQuantitySold }} units</span>
                    <span class="stat-rev">₹{{ item.totalRevenue | number:'1.0-0' }}</span>
                  </div>
                  <!-- Revenue bar -->
                  <div class="rev-bar-track">
                    <div class="rev-bar-fill" [style.width]="getTopMedPercent(item.totalRevenue) + '%'"></div>
                  </div>
                </div>
              } @empty {
                <div class="empty-state">
                  <i class="bi bi-inbox"></i>
                  <p>No medicine sales data available</p>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- TAB: Profit Analysis -->
      @if (!loading() && activeTab === 'profit') {
        <div class="animate-fade-in">
          <div class="kpi-row">
            <div class="glass-panel kpi-mini success">
              <span class="kpi-label">Total Revenue</span>
              <span class="kpi-value">₹{{ profitData().summary.totalRevenue | number:'1.0-0' }}</span>
            </div>
            <div class="glass-panel kpi-mini danger">
              <span class="kpi-label">Total Cost</span>
              <span class="kpi-value">₹{{ profitData().summary.totalCost | number:'1.0-0' }}</span>
            </div>
            <div class="glass-panel kpi-mini" [class.success]="profitData().summary.totalProfit > 0" [class.danger]="profitData().summary.totalProfit <= 0">
              <span class="kpi-label">Gross Profit</span>
              <span class="kpi-value">₹{{ profitData().summary.totalProfit | number:'1.0-0' }}</span>
            </div>
            <div class="glass-panel kpi-mini info">
              <span class="kpi-label">Avg Margin</span>
              <span class="kpi-value">{{ profitData().summary.overallMarginPercent }}%</span>
            </div>
          </div>
          <div class="glass-panel mt-4">
            <h3 class="panel-title"><i class="bi bi-graph-up-arrow"></i> Item-wise Profit Breakdown</h3>
            <div class="glass-table-container">
              <table class="glass-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Category</th>
                    <th>Batch</th>
                    <th>Qty</th>
                    <th>Cost/Unit</th>
                    <th>MRP/Unit</th>
                    <th>Total Cost</th>
                    <th>Total Revenue</th>
                    <th>Profit</th>
                    <th>Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of profitData().items; track $index) {
                    <tr>
                      <td>{{ item.medicine?.name || '—' }}</td>
                      <td><span class="badge badge-info">{{ item.medicine?.category || '—' }}</span></td>
                      <td><code>{{ item.batchNumber }}</code></td>
                      <td>{{ item.quantity }}</td>
                      <td>₹{{ item.purchaseRate }}</td>
                      <td>₹{{ item.mrp }}</td>
                      <td class="text-danger">₹{{ item.costPrice | number:'1.2-2' }}</td>
                      <td class="text-success">₹{{ item.salePrice | number:'1.2-2' }}</td>
                      <td [class.text-success]="item.grossProfit > 0" [class.text-danger]="item.grossProfit <= 0">
                        ₹{{ item.grossProfit | number:'1.2-2' }}
                      </td>
                      <td>
                        <span class="margin-pill" [class.positive]="item.marginPercent > 20" [class.low]="item.marginPercent <= 10">
                          {{ item.marginPercent }}%
                        </span>
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="10" class="empty-row">No profit data available</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- TAB: GST Summary -->
      @if (!loading() && activeTab === 'gst') {
        <div class="animate-fade-in">
          <div class="kpi-row">
            <div class="glass-panel kpi-mini">
              <span class="kpi-label">Total Taxable</span>
              <span class="kpi-value">₹{{ gstData().summary.grandTotalTaxable | number:'1.0-0' }}</span>
            </div>
            <div class="glass-panel kpi-mini info">
              <span class="kpi-label">Total GST</span>
              <span class="kpi-value">₹{{ gstData().summary.grandTotalGst | number:'1.0-0' }}</span>
            </div>
            <div class="glass-panel kpi-mini warning">
              <span class="kpi-label">CGST</span>
              <span class="kpi-value">₹{{ gstData().summary.grandCgst | number:'1.0-0' }}</span>
            </div>
            <div class="glass-panel kpi-mini warning">
              <span class="kpi-label">SGST</span>
              <span class="kpi-value">₹{{ gstData().summary.grandSgst | number:'1.0-0' }}</span>
            </div>
          </div>
          <div class="glass-panel mt-4">
            <h3 class="panel-title"><i class="bi bi-percent"></i> GST Rate-wise Breakdown</h3>
            <div class="glass-table-container">
              <table class="glass-table">
                <thead>
                  <tr>
                    <th>GST Rate</th>
                    <th>Taxable Amount</th>
                    <th>Total GST</th>
                    <th>CGST (50%)</th>
                    <th>SGST (50%)</th>
                    <th>No. of Line Items</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of gstData().breakdown; track row.gstRate) {
                    <tr>
                      <td><span class="gst-badge">{{ row.gstRate }}%</span></td>
                      <td>₹{{ row.taxableAmount | number:'1.2-2' }}</td>
                      <td><strong>₹{{ row.totalGst | number:'1.2-2' }}</strong></td>
                      <td>₹{{ row.cgst | number:'1.2-2' }}</td>
                      <td>₹{{ row.sgst | number:'1.2-2' }}</td>
                      <td>{{ row.itemCount }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="6" class="empty-row">No GST data found for selected period</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .reports-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .page-header { display: flex; align-items: center; justify-content: space-between; }
    h1 { font-size: 1.8rem; margin-bottom: 4px; }
    .sub-title { color: var(--text-secondary); font-size: 0.9rem; }

    .tab-bar {
      display: flex;
      gap: 6px;
      padding: 8px 12px;
      flex-wrap: wrap;
    }
    .tab-btn {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.88rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-btn:hover { background: rgba(255,255,255,0.04); color: var(--text-primary); }
    .tab-btn.active {
      background: rgba(130, 87, 229, 0.2);
      border-color: rgba(130, 87, 229, 0.4);
      color: var(--text-primary);
      font-weight: 600;
    }

    .filter-bar {
      display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; padding: 16px 20px;
    }
    .filter-group { display: flex; flex-direction: column; gap: 4px; }
    .filter-group label { font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .form-control {
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--glass-border);
      border-radius: 8px;
      color: var(--text-primary);
      padding: 8px 12px;
      font-size: 0.9rem;
    }
    .btn-primary-glass {
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid rgba(130,87,229,0.4);
      background: rgba(130,87,229,0.15);
      color: #a855f7;
      font-size: 0.88rem;
      cursor: pointer;
      font-weight: 600;
      display: flex; align-items: center; gap: 6px;
      transition: all 0.2s;
    }
    .btn-success-glass {
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid rgba(16,185,129,0.4);
      background: rgba(16,185,129,0.1);
      color: #10b981;
      font-size: 0.88rem;
      cursor: pointer;
      font-weight: 600;
      display: flex; align-items: center; gap: 6px;
      transition: all 0.2s;
    }
    .ml-auto { margin-left: auto; }

    .loading-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 16px; padding: 48px; color: var(--text-secondary);
    }
    .spinner {
      width: 36px; height: 36px; border: 3px solid rgba(130,87,229,0.15);
      border-top-color: #8257e5; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .kpi-mini {
      padding: 20px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .kpi-label { font-size: 0.78rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-value { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); }
    .kpi-mini.success .kpi-value { color: #10b981; }
    .kpi-mini.info .kpi-value { color: #0ea5e9; }
    .kpi-mini.warning .kpi-value { color: #f59e0b; }
    .kpi-mini.danger .kpi-value { color: #ef4444; }

    .panel-title { font-size: 1rem; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .mt-4 { margin-top: 0; }

    /* Payment bars */
    .payment-bars { display: flex; flex-direction: column; gap: 14px; margin-top: 8px; }
    .pay-row { display: flex; align-items: center; gap: 12px; }
    .pay-label { width: 60px; font-size: 0.85rem; color: var(--text-secondary); }
    .pay-bar-track { flex-grow: 1; height: 10px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden; }
    .pay-bar-fill { height: 100%; border-radius: 10px; transition: width 0.6s ease; }
    .pay-cash { background: #10b981; }
    .pay-upi { background: #8257e5; }
    .pay-card { background: #0ea5e9; }
    .pay-mixed { background: #f59e0b; }
    .pay-amount { width: 90px; text-align: right; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }

    /* Top medicines */
    .top-meds-list { display: flex; flex-direction: column; gap: 2px; }
    .top-med-row {
      display: flex; align-items: center; gap: 16px;
      padding: 14px 4px;
      border-bottom: 1px solid rgba(255,255,255,0.03);
    }
    .rank-badge {
      width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center;
      justify-content: center; font-size: 0.75rem; font-weight: 800; flex-shrink: 0;
      background: rgba(255,255,255,0.06); color: var(--text-secondary);
    }
    .rank-badge.gold { background: rgba(251,191,36,0.15); color: #fbbf24; }
    .rank-badge.silver { background: rgba(156,163,175,0.15); color: #9ca3af; }
    .rank-badge.bronze { background: rgba(217,119,6,0.15); color: #d97706; }
    .med-info { flex-grow: 1; }
    .med-name { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); }
    .med-meta { font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; }
    .med-stats { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; min-width: 100px; }
    .stat-qty { font-size: 0.75rem; color: var(--text-secondary); }
    .stat-rev { font-size: 0.95rem; font-weight: 700; color: #10b981; }
    .rev-bar-track { width: 120px; height: 6px; background: rgba(255,255,255,0.05); border-radius: 6px; overflow: hidden; }
    .rev-bar-fill { height: 100%; background: linear-gradient(90deg, #8257e5, #10b981); border-radius: 6px; transition: width 0.6s ease; }

    /* Profit */
    .text-success { color: #10b981 !important; }
    .text-danger { color: #ef4444 !important; }
    .text-warning { color: #f59e0b !important; }
    .margin-pill {
      padding: 3px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 600;
      background: rgba(255,255,255,0.06); color: var(--text-secondary);
    }
    .margin-pill.positive { background: rgba(16,185,129,0.15); color: #10b981; }
    .margin-pill.low { background: rgba(239,68,68,0.15); color: #ef4444; }

    /* GST */
    .gst-badge { padding: 4px 10px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; background: rgba(14,165,233,0.15); color: #0ea5e9; }

    .empty-row { text-align: center; padding: 32px; color: var(--text-muted); }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 48px; color: var(--text-muted); }
    .empty-state i { font-size: 2rem; }

    @media (max-width: 768px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }
  `]
})
export class ReportsComponent implements OnInit {
  private apiService = inject(ApiService);

  activeTab = 'sales';
  fromDate = '';
  toDate = '';
  loading = signal(false);

  salesData = signal<any>({ summary: { totalSales: 0, totalRevenue: 0, totalGst: 0, totalDiscount: 0, paymentBreakdown: {} }, sales: [] });
  topMeds = signal<any[]>([]);
  profitData = signal<any>({ summary: { totalRevenue: 0, totalCost: 0, totalProfit: 0, overallMarginPercent: 0 }, items: [] });
  gstData = signal<any>({ summary: { grandTotalTaxable: 0, grandTotalGst: 0, grandCgst: 0, grandSgst: 0 }, breakdown: [] });

  paymentModes = ['Cash', 'UPI', 'Card', 'Mixed'];

  tabs = [
    { id: 'sales',        label: 'Sales Summary',   icon: 'bi-receipt-cutoff' },
    { id: 'top-medicines', label: 'Top Medicines',  icon: 'bi-trophy-fill' },
    { id: 'profit',       label: 'Profit Analysis', icon: 'bi-graph-up-arrow' },
    { id: 'gst',          label: 'GST Summary',     icon: 'bi-percent' },
  ];

  ngOnInit(): void {
    this.loadCurrentTab();
  }

  switchTab(id: string): void {
    this.activeTab = id;
    this.loadCurrentTab();
  }

  loadCurrentTab(): void {
    this.loading.set(true);
    const f = this.fromDate || undefined;
    const t = this.toDate || undefined;

    if (this.activeTab === 'sales') {
      this.apiService.getSalesSummary(f, t).subscribe({
        next: (d) => { this.salesData.set(d); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
    } else if (this.activeTab === 'top-medicines') {
      this.apiService.getTopMedicines(15, f, t).subscribe({
        next: (d) => { this.topMeds.set(d.topMedicines || []); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
    } else if (this.activeTab === 'profit') {
      this.apiService.getProfitAnalysis(f, t).subscribe({
        next: (d) => { this.profitData.set(d); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
    } else if (this.activeTab === 'gst') {
      this.apiService.getGstSummary(f, t).subscribe({
        next: (d) => { this.gstData.set(d); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
    }
  }

  clearFilters(): void {
    this.fromDate = '';
    this.toDate = '';
    this.loadCurrentTab();
  }

  getPaymentPercent(mode: string): number {
    const breakdown = this.salesData().summary.paymentBreakdown || {};
    const total = Object.values(breakdown).reduce((s: any, v: any) => s + v, 0) as number;
    return total > 0 ? Math.round((breakdown[mode] || 0) / total * 100) : 0;
  }

  getTopMedPercent(revenue: number): number {
    const max = this.topMeds().length > 0 ? this.topMeds()[0].totalRevenue : 1;
    return Math.round((revenue / max) * 100);
  }

  exportCSV(): void {
    let csv = '';
    if (this.activeTab === 'sales') {
      const sales = this.salesData().sales || [];
      csv = 'Invoice No,Date,Customer,Payment,Subtotal,GST,Discount,Net\n';
      csv += sales.map((s: any) =>
        `${s.invoiceNumber},${new Date(s.saleDate).toLocaleDateString()},${s.customer?.name || ''},${s.paymentMode},${s.subTotal},${s.gstTotal},${s.discountAmount},${s.totalAmount}`
      ).join('\n');
    } else if (this.activeTab === 'top-medicines') {
      const meds = this.topMeds();
      csv = 'Rank,Medicine,Strength,Category,Units Sold,Revenue\n';
      csv += meds.map((m: any, i: number) =>
        `${i + 1},${m.medicine?.name || ''},${m.medicine?.strength || ''},${m.medicine?.category || ''},${m.totalQuantitySold},${m.totalRevenue}`
      ).join('\n');
    } else if (this.activeTab === 'profit') {
      const items = this.profitData().items || [];
      csv = 'Medicine,Category,Batch,Qty,Purchase Rate,MRP,Cost,Revenue,Profit,Margin%\n';
      csv += items.map((i: any) =>
        `${i.medicine?.name || ''},${i.medicine?.category || ''},${i.batchNumber},${i.quantity},${i.purchaseRate},${i.mrp},${i.costPrice},${i.salePrice},${i.grossProfit},${i.marginPercent}`
      ).join('\n');
    } else if (this.activeTab === 'gst') {
      const rows = this.gstData().breakdown || [];
      csv = 'GST Rate,Taxable Amount,Total GST,CGST,SGST,Items\n';
      csv += rows.map((r: any) =>
        `${r.gstRate}%,${r.taxableAmount},${r.totalGst},${r.cgst},${r.sgst},${r.itemCount}`
      ).join('\n');
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medilog-${this.activeTab}-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
