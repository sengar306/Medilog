import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-container animate-fade-in">
      <div class="dashboard-welcome">
        <h1>Welcome Back, <span class="gradient-text">{{ username }}</span></h1>
        <p>Here is your pharmacy's overview status for today.</p>
      </div>

      <!-- KPI Grid -->
      <div class="kpi-grid">
        <div class="glass-panel kpi-card">
          <div class="kpi-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--success);">
            <i class="bi bi-currency-dollar"></i>
          </div>
          <div class="kpi-info">
            <h3>Today's Sales</h3>
            <p>₹{{ metrics().summary.todaySales | number:'1.2-2' }}</p>
          </div>
        </div>

        <div class="glass-panel kpi-card">
          <div class="kpi-icon" style="background: rgba(130, 87, 229, 0.1); color: var(--primary);">
            <i class="bi bi-wallet2"></i>
          </div>
          <div class="kpi-info">
            <h3>Total Sales</h3>
            <p>₹{{ metrics().summary.totalSales | number:'1.2-2' }}</p>
          </div>
        </div>

        <div class="glass-panel kpi-card">
          <div class="kpi-icon" style="background: rgba(14, 165, 233, 0.1); color: var(--info);">
            <i class="bi bi-cart4"></i>
          </div>
          <div class="kpi-info">
            <h3>Procurements</h3>
            <p>₹{{ metrics().summary.totalPurchases | number:'1.2-2' }}</p>
          </div>
        </div>

        <div class="glass-panel kpi-card" [routerLink]="['/inventory']" style="cursor: pointer;">
          <div class="kpi-icon" [style.background]="metrics().summary.lowStockCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)'" [style.color]="metrics().summary.lowStockCount > 0 ? 'var(--danger)' : 'var(--text-secondary)'">
            <i class="bi bi-exclamation-triangle-fill"></i>
          </div>
          <div class="kpi-info">
            <h3>Low Stock Items</h3>
            <p [class.text-danger]="metrics().summary.lowStockCount > 0">{{ metrics().summary.lowStockCount }}</p>
          </div>
        </div>

        <div class="glass-panel kpi-card" [routerLink]="['/inventory']" style="cursor: pointer;">
          <div class="kpi-icon" [style.background]="metrics().summary.nearExpiryCount > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.05)'" [style.color]="metrics().summary.nearExpiryCount > 0 ? 'var(--warning)' : 'var(--text-secondary)'">
            <i class="bi bi-calendar-event"></i>
          </div>
          <div class="kpi-info">
            <h3>Near Expiry Batches</h3>
            <p [class.text-warning]="metrics().summary.nearExpiryCount > 0">{{ metrics().summary.nearExpiryCount }}</p>
          </div>
        </div>
      </div>

      <!-- Main Panel Split Grid -->
      <div class="dashboard-split">
        <!-- SVG Interactive Analytics Graph -->
        <div class="glass-panel graph-panel">
          <div class="panel-header">
            <h3>Revenue & Procurement Trends</h3>
            <span class="badge badge-info">Past 6 Months</span>
          </div>
          <div class="chart-container">
            <!-- Custom Dynamic SVG Chart -->
            <svg viewBox="0 0 600 240" class="svg-chart">
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#8257e5" stop-opacity="0.4"/>
                  <stop offset="100%" stop-color="#8257e5" stop-opacity="0.0"/>
                </linearGradient>
                <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.4"/>
                  <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0.0"/>
                </linearGradient>
              </defs>
              
              <!-- Horizontal Grid Lines -->
              <line x1="40" y1="30" x2="570" y2="30" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
              <line x1="40" y1="80" x2="570" y2="80" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
              <line x1="40" y1="130" x2="570" y2="130" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
              <line x1="40" y1="180" x2="570" y2="180" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
              <line x1="40" y1="200" x2="570" y2="200" stroke="rgba(255,255,255,0.1)" stroke-width="1" />

              <!-- Graph Paths (Sales) -->
              <path [attr.d]="getSalesPath()" fill="url(#salesGrad)" />
              <path [attr.d]="getSalesLine()" fill="none" stroke="#8257e5" stroke-width="3" filter="drop-shadow(0px 4px 8px rgba(130, 87, 229, 0.4))" />

              <!-- Graph Paths (Purchases) -->
              <path [attr.d]="getPurchasesPath()" fill="url(#purchaseGrad)" />
              <path [attr.d]="getPurchasesLine()" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-dasharray="4 2" />

              <!-- X-Axis Labels -->
              @for (label of chartLabels(); track $index) {
                <text [attr.x]="40 + $index * 106" y="222" fill="var(--text-secondary)" font-size="10" text-anchor="middle">
                  {{ label }}
                </text>
              }

              <!-- Y-Axis Labels -->
              <text x="35" y="34" fill="var(--text-secondary)" font-size="9" text-anchor="end">₹10K+</text>
              <text x="35" y="84" fill="var(--text-secondary)" font-size="9" text-anchor="end">₹5K</text>
              <text x="35" y="134" fill="var(--text-secondary)" font-size="9" text-anchor="end">₹2.5K</text>
              <text x="35" y="184" fill="var(--text-secondary)" font-size="9" text-anchor="end">₹1K</text>
              <text x="35" y="204" fill="var(--text-secondary)" font-size="9" text-anchor="end">₹0</text>
            </svg>
          </div>
          <div class="chart-legend">
            <div class="legend-item"><span class="legend-color" style="background: #8257e5;"></span> Sales (Revenue)</div>
            <div class="legend-item"><span class="legend-color" style="background: #0ea5e9; border: 1px dashed #fff;"></span> Purchases (Procurement)</div>
          </div>
        </div>

        <!-- Recent Activities & Audit Trail -->
        <div class="glass-panel activity-panel">
          <h3>Recent Operations Ledger</h3>
          
          <div class="activity-list">
            @for (log of metrics().recentActivity; track log._id) {
              <div class="activity-item">
                <div class="activity-icon" [ngClass]="getActivityIconClass(log.action)">
                  <i [ngClass]="getActivityIcon(log.action)"></i>
                </div>
                <div class="activity-details">
                  <p class="activity-desc">{{ log.description }}</p>
                  <span class="activity-time">
                    <i class="bi bi-clock"></i> {{ log.createdAt | date:'MMM d, h:mm a' }}
                    @if (log.user) {
                      by <strong style="color: var(--primary);">{{ log.user.username }}</strong>
                    }
                  </span>
                </div>
              </div>
            } @empty {
              <div class="text-center py-4 text-muted">
                <i class="bi bi-inbox fs-2"></i>
                <p>No recent actions logged.</p>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Recent Sales Table -->
      <div class="glass-panel mt-4">
        <div class="panel-header">
          <h3>Recent Retail Transactions</h3>
          <button class="btn btn-glass" [routerLink]="['/billing']">New POS Billing</button>
        </div>

        <div class="glass-table-container">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Payment Mode</th>
                <th>Subtotal</th>
                <th>GST</th>
                <th>Discount</th>
                <th>Net Payable</th>
                <th>Date</th>
                <th>Cashier</th>
              </tr>
            </thead>
            <tbody>
              @for (sale of metrics().recentSales; track sale._id) {
                <tr>
                  <td><code>{{ sale.invoiceNumber }}</code></td>
                  <td>
                    <span class="badge" [ngClass]="sale.paymentMode === 'Cash' ? 'badge-success' : 'badge-info'">
                      {{ sale.paymentMode }}
                    </span>
                  </td>
                  <td>₹{{ sale.subTotal | number:'1.2-2' }}</td>
                  <td>₹{{ sale.gstTotal | number:'1.2-2' }}</td>
                  <td>₹{{ sale.discountAmount | number:'1.2-2' }}</td>
                  <td><strong style="color: var(--primary);">₹{{ sale.totalAmount | number:'1.2-2' }}</strong></td>
                  <td>{{ sale.saleDate | date:'MMM d, yyyy' }}</td>
                  <td><code>{{ sale.cashier ? sale.cashier.username : 'System' }}</code></td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="text-center text-muted">No sales completed yet.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .dashboard-welcome h1 {
      font-size: 1.8rem;
      margin-bottom: 4px;
    }
    .dashboard-welcome p {
      color: var(--text-secondary);
      font-size: 0.95rem;
    }
    .text-danger { color: var(--danger) !important; }
    .text-warning { color: var(--warning) !important; }
    
    .dashboard-split {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
    }
    
    @media (max-width: 992px) {
      .dashboard-split {
        grid-template-columns: 1fr;
      }
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    
    .chart-container {
      width: 100%;
      height: 240px;
      margin-top: 10px;
    }
    
    .svg-chart {
      width: 100%;
      height: 100%;
    }
    
    .chart-legend {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-top: 12px;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }
    
    .activity-panel {
      display: flex;
      flex-direction: column;
      max-height: 380px;
    }
    
    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
      overflow-y: auto;
      flex-grow: 1;
      margin-top: 16px;
      padding-right: 4px;
    }
    
    .activity-item {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      border-bottom: 1px solid rgba(255,255,255,0.02);
      padding-bottom: 12px;
    }
    .activity-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    
    .activity-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
      flex-shrink: 0;
    }
    
    .icon-login { background: rgba(16, 185, 129, 0.1); color: var(--success); }
    .icon-purchase { background: rgba(14, 165, 233, 0.1); color: var(--info); }
    .icon-sale { background: rgba(130, 87, 229, 0.1); color: var(--primary); }
    .icon-generic { background: rgba(255, 255, 255, 0.05); color: var(--text-secondary); }
    
    .activity-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .activity-desc {
      font-size: 0.9rem;
      line-height: 1.3;
      color: var(--text-primary);
    }
    
    .activity-time {
      font-size: 0.75rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .py-4 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
    .text-center { text-align: center; }
  `]
})
export class DashboardComponent implements OnInit {
  private apiService = inject(ApiService);
  
  username = '';
  metrics = signal<any>({
    summary: {
      totalSales: 0,
      todaySales: 0,
      totalPurchases: 0,
      medicinesCount: 0,
      lowStockCount: 0,
      nearExpiryCount: 0,
      expiredCount: 0
    },
    charts: {
      sales: [],
      purchases: []
    },
    recentSales: [],
    recentActivity: []
  });

  chartLabels = signal<string[]>(['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']);

  ngOnInit(): void {
    const user = this.apiService.currentUser();
    this.username = user ? user.username : 'User';
    this.loadMetrics();
  }

  loadMetrics(): void {
    this.apiService.getDashboardMetrics().subscribe({
      next: (data) => {
        this.metrics.set(data);
        this.setupChartLabels(data.charts.sales);
      },
      error: (err) => {
        console.error('Failed to load dashboard metrics:', err);
      }
    });
  }

  setupChartLabels(salesData: any[]): void {
    if (!salesData || salesData.length === 0) return;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const labels = salesData.map(item => {
      return months[item._id.month - 1];
    });
    this.chartLabels.set(labels);
  }

  // --- Dynamic SVG Graph Generators ---
  
  // Maps a 6-element dataset values into Y coordinates (between 30 and 200, representing ₹0 to ₹10,000)
  mapToCoordinates(data: any[]): number[] {
    const coords = [200, 200, 200, 200, 200, 200];
    if (!data || data.length === 0) return coords;
    
    // Max value limit mapped to top of graph (y=30)
    const maxVal = 10000; 
    
    // Sort array elements into last 6 calendar months
    for (let i = 0; i < 6; i++) {
      if (i < data.length) {
        const val = data[i].total || 0;
        // Map 0 -> 200 and maxVal (10k) -> 30
        const y = 200 - (Math.min(val, maxVal) / maxVal) * 170;
        coords[i] = y;
      }
    }
    return coords;
  }

  getSalesLine(): string {
    const sales = this.metrics().charts.sales;
    const coords = this.mapToCoordinates(sales);
    
    return `M 40 ${coords[0]} L 146 ${coords[1]} L 252 ${coords[2]} L 358 ${coords[3]} L 464 ${coords[4]} L 570 ${coords[5]}`;
  }

  getSalesPath(): string {
    const sales = this.metrics().charts.sales;
    const coords = this.mapToCoordinates(sales);
    
    return `M 40 200 L 40 ${coords[0]} L 146 ${coords[1]} L 252 ${coords[2]} L 358 ${coords[3]} L 464 ${coords[4]} L 570 ${coords[5]} L 570 200 Z`;
  }

  getPurchasesLine(): string {
    const purchases = this.metrics().charts.purchases;
    const coords = this.mapToCoordinates(purchases);
    
    return `M 40 ${coords[0]} L 146 ${coords[1]} L 252 ${coords[2]} L 358 ${coords[3]} L 464 ${coords[4]} L 570 ${coords[5]}`;
  }

  getPurchasesPath(): string {
    const purchases = this.metrics().charts.purchases;
    const coords = this.mapToCoordinates(purchases);
    
    return `M 40 200 L 40 ${coords[0]} L 146 ${coords[1]} L 252 ${coords[2]} L 358 ${coords[3]} L 464 ${coords[4]} L 570 ${coords[5]} L 570 200 Z`;
  }

  // --- Audit Icons Mapper ---
  getActivityIcon(action: string): string {
    const act = action.toLowerCase();
    if (act.includes('login')) return 'bi-box-arrow-in-right';
    if (act.includes('purchase')) return 'bi-cart-check-fill';
    if (act.includes('sale')) return 'bi-receipt';
    if (act.includes('create')) return 'bi-plus-circle-fill';
    return 'bi-info-circle-fill';
  }

  getActivityIconClass(action: string): string {
    const act = action.toLowerCase();
    if (act.includes('login')) return 'icon-login';
    if (act.includes('purchase')) return 'icon-purchase';
    if (act.includes('sale')) return 'icon-sale';
    return 'icon-generic';
  }
}
