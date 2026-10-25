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
      <!-- Welcome Header -->
      <div class="welcome-section">
        <div class="welcome-text">
          <h1>Good {{ getGreeting() }}, <span class="text-primary-color">{{ username }}</span></h1>
          <p>Here's what's happening with your pharmacy today.</p>
        </div>
        <div class="welcome-actions">
          <button class="btn btn-primary" [routerLink]="['/billing']">
            <i class="bi bi-plus-lg"></i> New Bill
          </button>
          <button class="btn btn-glass" [routerLink]="['/inventory']">
            <i class="bi bi-archive"></i> Inventory
          </button>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="kpi-grid">
        <div class="glass-panel kpi-card">
          <div class="kpi-icon kpi-icon-success">
            <i class="bi bi-currency-rupee"></i>
          </div>
          <div class="kpi-info">
            <h3>Today's Sales</h3>
            <p>₹{{ metrics().summary.todaySales | number:'1.0-0' }}</p>
          </div>
        </div>

        <div class="glass-panel kpi-card">
          <div class="kpi-icon kpi-icon-primary">
            <i class="bi bi-wallet2"></i>
          </div>
          <div class="kpi-info">
            <h3>Total Revenue</h3>
            <p>₹{{ metrics().summary.totalSales | number:'1.0-0' }}</p>
          </div>
        </div>

        <div class="glass-panel kpi-card">
          <div class="kpi-icon kpi-icon-info">
            <i class="bi bi-cart-check"></i>
          </div>
          <div class="kpi-info">
            <h3>Procurements</h3>
            <p>₹{{ metrics().summary.totalPurchases | number:'1.0-0' }}</p>
          </div>
        </div>

        <div class="glass-panel kpi-card" [routerLink]="['/inventory']" style="cursor: pointer;">
          <div class="kpi-icon" [class.kpi-icon-danger]="metrics().summary.lowStockCount > 0" [class.kpi-icon-muted]="metrics().summary.lowStockCount === 0">
            <i class="bi bi-exclamation-triangle"></i>
          </div>
          <div class="kpi-info">
            <h3>Low Stock Items</h3>
            <p [class.text-danger]="metrics().summary.lowStockCount > 0">{{ metrics().summary.lowStockCount }}</p>
          </div>
        </div>

        <div class="glass-panel kpi-card" [routerLink]="['/expiry-alerts']" style="cursor: pointer;">
          <div class="kpi-icon" [class.kpi-icon-warning]="metrics().summary.nearExpiryCount > 0" [class.kpi-icon-muted]="metrics().summary.nearExpiryCount === 0">
            <i class="bi bi-calendar-event"></i>
          </div>
          <div class="kpi-info">
            <h3>Expiring Soon</h3>
            <p [class.text-warning]="metrics().summary.nearExpiryCount > 0">{{ metrics().summary.nearExpiryCount }}</p>
          </div>
        </div>
      </div>

      <!-- Main Panel Split Grid -->
      <div class="dashboard-split">
        <!-- SVG Interactive Analytics Graph -->
        <div class="glass-panel graph-panel">
          <div class="panel-header">
            <div>
              <h3>Revenue & Procurement Trends</h3>
              <p class="panel-subtitle">Performance over the past 6 months</p>
            </div>
          </div>
          <div class="chart-container">
            <!-- Custom Dynamic SVG Chart -->
            <svg viewBox="0 0 600 240" class="svg-chart">
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#0F766E" stop-opacity="0.2"/>
                  <stop offset="100%" stop-color="#0F766E" stop-opacity="0.0"/>
                </linearGradient>
                <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#2563EB" stop-opacity="0.15"/>
                  <stop offset="100%" stop-color="#2563EB" stop-opacity="0.0"/>
                </linearGradient>
              </defs>

              <!-- Horizontal Grid Lines -->
              <line x1="40" y1="30" x2="570" y2="30" stroke="#E2E8F0" stroke-width="1" />
              <line x1="40" y1="80" x2="570" y2="80" stroke="#E2E8F0" stroke-width="1" />
              <line x1="40" y1="130" x2="570" y2="130" stroke="#E2E8F0" stroke-width="1" />
              <line x1="40" y1="180" x2="570" y2="180" stroke="#E2E8F0" stroke-width="1" />
              <line x1="40" y1="200" x2="570" y2="200" stroke="#CBD5E1" stroke-width="1" />

              <!-- Graph Paths (Sales) -->
              <path [attr.d]="getSalesPath()" fill="url(#salesGrad)" />
              <path [attr.d]="getSalesLine()" fill="none" stroke="#0F766E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

              <!-- Graph Paths (Purchases) -->
              <path [attr.d]="getPurchasesPath()" fill="url(#purchaseGrad)" />
              <path [attr.d]="getPurchasesLine()" fill="none" stroke="#2563EB" stroke-width="2" stroke-dasharray="5 3" stroke-linecap="round" />

              <!-- X-Axis Labels -->
              @for (label of chartLabels(); track $index) {
                <text [attr.x]="40 + $index * 106" y="222" fill="#64748B" font-size="10" text-anchor="middle" font-family="Inter, sans-serif">
                  {{ label }}
                </text>
              }

              <!-- Y-Axis Labels -->
              <text x="35" y="34" fill="#94A3B8" font-size="9" text-anchor="end" font-family="Inter, sans-serif">₹10K+</text>
              <text x="35" y="84" fill="#94A3B8" font-size="9" text-anchor="end" font-family="Inter, sans-serif">₹5K</text>
              <text x="35" y="134" fill="#94A3B8" font-size="9" text-anchor="end" font-family="Inter, sans-serif">₹2.5K</text>
              <text x="35" y="184" fill="#94A3B8" font-size="9" text-anchor="end" font-family="Inter, sans-serif">₹1K</text>
              <text x="35" y="204" fill="#94A3B8" font-size="9" text-anchor="end" font-family="Inter, sans-serif">₹0</text>
            </svg>
          </div>
          <div class="chart-legend">
            <div class="legend-item"><span class="legend-color" style="background: var(--primary);"></span> Sales Revenue</div>
            <div class="legend-item"><span class="legend-color legend-dashed" style="background: var(--secondary);"></span> Procurement</div>
          </div>
        </div>

        <!-- Recent Activities & Audit Trail -->
        <div class="glass-panel activity-panel">
          <h3>Recent Activity</h3>

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
                      Â· <strong>{{ log.user.username }}</strong>
                    }
                  </span>
                </div>
              </div>
            } @empty {
              <div class="empty-state">
                <i class="bi bi-inbox"></i>
                <p>No recent activity logged.</p>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Recent Sales Table -->
      <div class="glass-panel mt-4">
        <div class="panel-header">
          <div>
            <h3>Recent Transactions</h3>
            <p class="panel-subtitle">Latest retail sales and billing records</p>
          </div>
          <button class="btn btn-primary btn-sm" [routerLink]="['/billing']">
            <i class="bi bi-plus-lg"></i> New POS Bill
          </button>
        </div>

        <div class="glass-table-container">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Payment</th>
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
                  <td><strong class="text-primary-color">₹{{ sale.totalAmount | number:'1.2-2' }}</strong></td>
                  <td>{{ sale.saleDate | date:'MMM d, yyyy' }}</td>
                  <td>{{ sale.cashier ? sale.cashier.username : 'System' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="text-center text-muted" style="padding: 32px;">No sales completed yet.</td>
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

    /* Welcome Section */
    .welcome-section {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }
    .welcome-text h1 {
      font-size: 1.5rem;
      margin-bottom: 2px;
    }
    .welcome-text p {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin: 0;
    }
    .welcome-actions {
      display: flex;
      gap: 10px;
    }

    /* KPI Icons */
    .kpi-icon-success { background: rgba(22, 163, 74, 0.08); color: var(--success); }
    .kpi-icon-primary { background: rgba(15, 118, 110, 0.08); color: var(--primary); }
    .kpi-icon-info { background: rgba(14, 165, 233, 0.08); color: var(--info); }
    .kpi-icon-danger { background: rgba(220, 38, 38, 0.08); color: var(--danger); }
    .kpi-icon-warning { background: rgba(245, 158, 11, 0.08); color: var(--warning); }
    .kpi-icon-muted { background: var(--bg-muted); color: var(--text-muted); }

    /* Dashboard Split */
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
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 16px;
      gap: 12px;
    }
    .panel-header h3 {
      margin-bottom: 2px;
    }
    .panel-subtitle {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin: 0;
    }

    /* Chart */
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
      gap: 20px;
      justify-content: center;
      margin-top: 12px;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legend-color {
      width: 12px;
      height: 3px;
      border-radius: 2px;
    }

    /* Activity Panel */
    .activity-panel {
      display: flex;
      flex-direction: column;
      max-height: 420px;
    }
    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 0;
      overflow-y: auto;
      flex-grow: 1;
      margin-top: 12px;
    }
    .activity-item {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-light);
    }
    .activity-item:last-child {
      border-bottom: none;
    }
    .activity-icon {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      flex-shrink: 0;
    }
    .icon-login { background: rgba(22, 163, 74, 0.08); color: var(--success); }
    .icon-purchase { background: rgba(14, 165, 233, 0.08); color: var(--info); }
    .icon-sale { background: rgba(15, 118, 110, 0.08); color: var(--primary); }
    .icon-generic { background: var(--bg-muted); color: var(--text-secondary); }

    .activity-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .activity-desc {
      font-size: 0.85rem;
      line-height: 1.35;
      color: var(--text-primary);
      margin: 0;
    }
    .activity-time {
      font-size: 0.72rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .activity-time strong {
      color: var(--primary);
    }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 32px 16px;
      color: var(--text-muted);
      font-size: 0.85rem;
    }
    .empty-state i {
      font-size: 2rem;
      opacity: 0.5;
    }

    @media (max-width: 768px) {
      .welcome-section {
        flex-direction: column;
        align-items: flex-start;
      }
      .welcome-text h1 {
        font-size: 1.2rem;
      }
    }
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

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
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
    if (act.includes('purchase')) return 'bi-cart-check';
    if (act.includes('sale')) return 'bi-receipt';
    if (act.includes('create')) return 'bi-plus-circle';
    return 'bi-info-circle';
  }

  getActivityIconClass(action: string): string {
    const act = action.toLowerCase();
    if (act.includes('login')) return 'icon-login';
    if (act.includes('purchase')) return 'icon-purchase';
    if (act.includes('sale')) return 'icon-sale';
    return 'icon-generic';
  }
}

