import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-stockist-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <!-- Top Title Header -->
      <div class="header-card glass-panel">
        <div class="header-info">
          <h2><i class="bi bi-truck-front-fill text-teal"></i> Stockist Incoming B2B Orders</h2>
          <p>Review orders placed by retail chemists, accept orders, and manage dispatch/delivery status</p>
        </div>
        <div class="status-summary-tabs">
          <button class="tab-btn" [class.active]="selectedTab === 'All'" (click)="setTab('All')">
            All ({{ orders.length }})
          </button>
          <button class="tab-btn pending" [class.active]="selectedTab === 'Pending'" (click)="setTab('Pending')">
            Pending ({{ getCount('Pending') }})
          </button>
          <button class="tab-btn accepted" [class.active]="selectedTab === 'Accepted'" (click)="setTab('Accepted')">
            Accepted ({{ getCount('Accepted') }})
          </button>
          <button class="tab-btn delivery" [class.active]="selectedTab === 'Out for Delivery'" (click)="setTab('Out for Delivery')">
            In Delivery ({{ getCount('Out for Delivery') }})
          </button>
          <button class="tab-btn delivered" [class.active]="selectedTab === 'Delivered'" (click)="setTab('Delivered')">
            Delivered ({{ getCount('Delivered') }})
          </button>
        </div>
      </div>

      <!-- Orders List Container -->
      <div class="orders-container mt-4">
        @if (loading) {
          <div class="glass-panel text-center p-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-2 text-muted">Loading received orders...</p>
          </div>
        } @else {
          <div class="orders-grid">
            @for (order of filteredOrders; track order._id) {
              <div class="order-card glass-panel" [class.highlight-pending]="order.status === 'Pending'">
                <!-- Order Header -->
                <div class="card-header">
                  <div class="order-info">
                    <span class="order-num">{{ order.orderNumber }}</span>
                    <span class="order-date">{{ order.createdAt | date:'medium' }}</span>
                  </div>
                  <span class="status-badge" [ngClass]="getStatusClass(order.status)">
                    {{ order.status }}
                  </span>
                </div>

                <!-- Chemist Details -->
                <div class="chemist-info-row">
                  <div class="avatar-icon">
                    <i class="bi bi-shop"></i>
                  </div>
                  <div class="chemist-details">
                    <span class="chemist-name">{{ order.chemistName || order.chemist?.chemistName || 'Chemist Store' }}</span>
                    <span class="chemist-contact text-muted">
                      <i class="bi bi-person-fill"></i> {{ order.chemist?.username }}
                      @if (order.chemistPhone) {
                        | <i class="bi bi-telephone-fill"></i> {{ order.chemistPhone }}
                      }
                    </span>
                    @if (order.deliveryAddress) {
                      <span class="chemist-address text-muted">
                        <i class="bi bi-geo-alt-fill"></i> {{ order.deliveryAddress }}
                      </span>
                    }
                  </div>
                </div>

                <!-- Order Items Breakdown -->
                <div class="items-list">
                  <div class="items-header">ORDERED ITEMS ({{ order.items?.length || 0 }})</div>
                  @for (item of order.items; track item._id) {
                    <div class="item-row">
                      <span class="item-name">{{ item.name }} <small class="text-muted">({{ item.packSize }})</small></span>
                      <span class="item-qty">Qty: {{ item.quantity }}</span>
                      <span class="item-price">₹{{ item.totalPrice | number:'1.2-2' }}</span>
                    </div>
                  }
                </div>

                <!-- Total & Action Bar -->
                <div class="card-footer">
                  <div class="total-box">
                    <span class="label">Total Amount:</span>
                    <span class="amount">₹{{ order.totalAmount | number:'1.2-2' }}</span>
                  </div>

                  <div class="action-buttons">
                    @if (order.status === 'Pending') {
                      <button class="btn btn-sm btn-success" (click)="updateStatus(order, 'Accepted')">
                        <i class="bi bi-check-lg"></i> Accept Order
                      </button>
                      <button class="btn btn-sm btn-outline-danger" (click)="updateStatus(order, 'Rejected')">
                        <i class="bi bi-x-lg"></i> Reject
                      </button>
                    }

                    @if (order.status === 'Accepted') {
                      <button class="btn btn-sm btn-primary" (click)="updateStatus(order, 'Out for Delivery')">
                        <i class="bi bi-truck"></i> Mark Out for Delivery
                      </button>
                    }

                    @if (order.status === 'Out for Delivery') {
                      <button class="btn btn-sm btn-success" (click)="updateStatus(order, 'Delivered')">
                        <i class="bi bi-box2-heart-fill"></i> Mark Delivered
                      </button>
                    }

                    @if (order.status === 'Delivered') {
                      <span class="badge badge-success text-sm"><i class="bi bi-check-circle-fill"></i> Order Complete</span>
                    }

                    @if (order.status === 'Rejected') {
                      <span class="badge badge-danger text-sm"><i class="bi bi-x-circle-fill"></i> Order Rejected</span>
                    }
                  </div>
                </div>
              </div>
            } @empty {
              <div class="glass-panel text-center p-5 empty-box">
                <i class="bi bi-inbox-fill text-muted fs-1"></i>
                <h4 class="mt-3">No orders found</h4>
                <p class="text-muted">No orders match the selected filter tab.</p>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 8px;
    }
    .header-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-radius: 16px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .header-info h2 {
      font-size: 1.4rem;
      font-weight: 700;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .text-teal { color: var(--primary); }
    .header-info p {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin: 0;
    }
    .status-summary-tabs {
      display: flex;
      gap: 8px;
      background: var(--bg-muted);
      padding: 4px;
      border-radius: 12px;
      border: 1px solid var(--glass-border);
    }
    .tab-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-btn:hover {
      color: var(--text-primary);
    }
    .tab-btn.active {
      background: rgba(15, 118, 110, 0.2);
      color: var(--primary);
      border: 1px solid rgba(15, 118, 110, 0.4);
      font-weight: 600;
    }
    .tab-btn.pending.active {
      background: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
      border-color: rgba(245, 158, 11, 0.4);
    }
    .tab-btn.accepted.active {
      background: rgba(59, 130, 246, 0.2);
      color: var(--primary);
      border-color: rgba(59, 130, 246, 0.4);
    }
    .tab-btn.delivery.active {
      background: rgba(14, 165, 233, 0.2);
      color: var(--primary);
      border-color: rgba(14, 165, 233, 0.4);
    }
    .tab-btn.delivered.active {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border-color: rgba(16, 185, 129, 0.4);
    }
    .orders-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 20px;
    }
    .order-card {
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      transition: all 0.2s ease;
      border: 1px solid var(--glass-border);
    }
    .order-card.highlight-pending {
      border-color: rgba(245, 158, 11, 0.5);
      box-shadow: 0 4px 20px rgba(245, 158, 11, 0.1);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--bg-hover);
      padding-bottom: 12px;
    }
    .order-info {
      display: flex;
      flex-direction: column;
    }
    .order-num {
      font-weight: 700;
      font-size: 1.05rem;
      color: var(--text-primary);
    }
    .order-date {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-badge.pending {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .status-badge.accepted {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.4);
    }
    .status-badge.delivery {
      background: rgba(14, 165, 233, 0.2);
      color: #0ea5e9;
      border: 1px solid rgba(14, 165, 233, 0.4);
    }
    .status-badge.delivered {
      background: rgba(16, 185, 129, 0.2);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .status-badge.rejected {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }
    .chemist-info-row {
      display: flex;
      gap: 12px;
      align-items: center;
      background: var(--bg-hover);
      padding: 10px 14px;
      border-radius: 12px;
    }
    .avatar-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(15, 118, 110, 0.15);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      flex-shrink: 0;
    }
    .chemist-details {
      display: flex;
      flex-direction: column;
      font-size: 0.85rem;
    }
    .chemist-name {
      font-weight: 700;
      color: var(--text-primary);
    }
    .items-list {
      background: var(--bg-muted);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .items-header {
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--text-secondary);
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      padding-bottom: 4px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    }
    .item-name { font-weight: 500; }
    .item-price { font-weight: 600; color: var(--success); }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 8px;
    }
    .total-box {
      display: flex;
      flex-direction: column;
    }
    .total-box .label {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    .total-box .amount {
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--success);
    }
    .action-buttons {
      display: flex;
      gap: 8px;
    }
    .empty-box {
      grid-column: 1 / -1;
    }
  `]
})
export class StockistOrdersComponent implements OnInit {
  private apiService = inject(ApiService);

  orders: any[] = [];
  filteredOrders: any[] = [];
  selectedTab: string = 'All';
  loading: boolean = true;

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.apiService.getStockistOrders('stockist').subscribe({
      next: (data) => {
        this.orders = data || [];
        this.filterOrders();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load orders:', err);
        this.loading = false;
      }
    });
  }

  setTab(tab: string): void {
    this.selectedTab = tab;
    this.filterOrders();
  }

  filterOrders(): void {
    if (this.selectedTab === 'All') {
      this.filteredOrders = [...this.orders];
    } else {
      this.filteredOrders = this.orders.filter(o => o.status === this.selectedTab);
    }
  }

  getCount(status: string): number {
    return this.orders.filter(o => o.status === status).length;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending': return 'pending';
      case 'Accepted': return 'accepted';
      case 'Out for Delivery': return 'delivery';
      case 'Delivered': return 'delivered';
      case 'Rejected':
      case 'Cancelled': return 'rejected';
      default: return '';
    }
  }

  updateStatus(order: any, newStatus: string): void {
    const actionText = newStatus === 'Accepted' ? 'accept' : newStatus.toLowerCase();
    if (confirm(`Are you sure you want to ${actionText} Order ${order.orderNumber}?`)) {
      this.apiService.updateStockistOrderStatus(order._id, newStatus).subscribe({
        next: (res) => {
          order.status = newStatus;
          this.filterOrders();
        },
        error: (err) => {
          alert(err.error?.message || 'Failed to update order status');
        }
      });
    }
  }
}
