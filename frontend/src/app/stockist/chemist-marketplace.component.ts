import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api.service';
import { SideDrawerComponent } from '../core/components/side-drawer.component';

@Component({
  selector: 'app-chemist-marketplace',
  standalone: true,
  imports: [CommonModule, FormsModule, SideDrawerComponent],
  template: `
    <div class="page-container">
      <!-- Header Card with View Switcher -->
      <div class="header-card glass-panel">
        <div class="header-info">
          <h2><i class="bi bi-shop-window text-teal"></i> Stockist B2B Wholesale Marketplace</h2>
          <p>Browse wholesale medicines from verified stockists, place bulk orders, and track deliveries</p>
        </div>

        <div class="view-toggle">
          <button class="toggle-btn" [class.active]="currentView === 'marketplace'" (click)="currentView = 'marketplace'">
            <i class="bi bi-grid-3x3-gap-fill"></i> Browse Marketplace
          </button>
          <button class="toggle-btn" [class.active]="currentView === 'my-orders'" (click)="switchToOrders()">
            <i class="bi bi-bag-check-fill"></i> My B2B Orders
            @if (myOrders.length > 0) {
              <span class="badge-count">{{ myOrders.length }}</span>
            }
          </button>
        </div>
      </div>

      <!-- VIEW 1: MARKETPLACE CATALOG -->
      @if (currentView === 'marketplace') {
        <!-- Search & Category Filters -->
        <div class="filter-row glass-panel mt-4">
          <div class="search-box">
            <i class="bi bi-search search-icon"></i>
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              (ngModelChange)="loadMarketplace()" 
              placeholder="Search medicine, brand, or category..." 
              class="form-control"
            />
          </div>

          <div class="category-filters">
            @for (cat of categories; track cat) {
              <button 
                class="cat-chip" 
                [class.active]="selectedCategory === cat" 
                (click)="selectCategory(cat)">
                {{ cat }}
              </button>
            }
          </div>

          <div class="cart-trigger-btn" (click)="openCartModal()">
            <i class="bi bi-cart3"></i>
            <span>Cart</span>
            @if (cartItems.length > 0) {
              <span class="cart-badge">{{ cartTotalQty }}</span>
            }
          </div>
        </div>

        <!-- Marketplace Products Grid -->
        <div class="products-grid mt-4">
          @if (loading) {
            <div class="glass-panel text-center p-5 col-span-full">
              <div class="spinner-border text-primary"></div>
              <p class="mt-2 text-muted">Loading wholesale offers...</p>
            </div>
          } @else {
            @for (item of marketplaceItems; track item._id) {
              <div class="product-card glass-panel">
                <div class="prod-image-wrapper">
                  <img [src]="item.imageUrl || getCategoryFallback(item.category)" alt="Medicine Product" class="prod-card-img" (error)="onImgError($event, item.category)" />
                  <span class="badge badge-secondary category-badge-top">{{ item.category }}</span>
                </div>

                <div class="card-badge">
                  <span class="stock-status" [class.in-stock]="item.stockQuantity > 0">
                    <i class="bi bi-check-circle-fill"></i> In Stock ({{ item.stockQuantity }})
                  </span>
                </div>

                <div class="product-info">
                  <h3 class="prod-title">{{ item.name }}</h3>
                  @if (item.brand) {
                    <p class="prod-brand text-muted">Manufacturer: {{ item.brand }}</p>
                  }
                  <div class="stockist-name">
                    <i class="bi bi-building"></i> Stockist: 
                    <strong>{{ item.stockist?.chemistName || item.stockist?.username || 'Wholesale Supplier' }}</strong>
                  </div>
                  <div class="pack-size text-muted mt-1">
                    <i class="bi bi-box"></i> Pack Size: {{ item.packSize || '10x10 Strips' }}
                  </div>
                </div>

                <div class="pricing-row">
                  <div class="price-box">
                    <span class="price-label">Wholesale Rate</span>
                    <span class="price-value">₹{{ item.wholesalePrice | number:'1.2-2' }}</span>
                  </div>
                  <div class="mrp-box text-muted">
                    <span class="mrp-label">MRP</span>
                    <span class="mrp-value">₹{{ item.mrp | number:'1.2-2' }}</span>
                  </div>
                </div>

                <div class="card-action">
                  @if (isInCart(item._id)) {
                    <div class="qty-counter">
                      <button (click)="updateCartQty(item._id, -1)">-</button>
                      <span>{{ getCartQty(item._id) }}</span>
                      <button (click)="updateCartQty(item._id, 1)">+</button>
                    </div>
                  } @else {
                    <button class="btn btn-outline-primary btn-block" (click)="addToCart(item)">
                      <i class="bi bi-cart-plus"></i> Add to Order Cart
                    </button>
                  }
                </div>
              </div>
            } @empty {
              <div class="glass-panel text-center p-5 col-span-full">
                <i class="bi bi-search fs-1 text-muted"></i>
                <h4 class="mt-3">No wholesale offers found</h4>
                <p class="text-muted">Try adjusting your search filter.</p>
              </div>
            }
          }
        </div>
      }

      <!-- VIEW 2: MY PLACED B2B ORDERS -->
      @if (currentView === 'my-orders') {
        <div class="orders-list mt-4">
          @if (loadingOrders) {
            <div class="glass-panel text-center p-5">
              <div class="spinner-border text-primary"></div>
              <p class="mt-2 text-muted">Loading your orders...</p>
            </div>
          } @else {
            <div class="my-orders-grid">
              @for (ord of myOrders; track ord._id) {
                <div class="my-order-card glass-panel">
                  <div class="ord-header">
                    <div class="ord-meta">
                      <span class="ord-num">{{ ord.orderNumber }}</span>
                      <span class="ord-date text-muted">{{ ord.createdAt | date:'medium' }}</span>
                    </div>
                    <span class="ord-status-pill" [ngClass]="getStatusClass(ord.status)">
                      {{ ord.status }}
                    </span>
                  </div>

                  <div class="ord-stockist">
                    <i class="bi bi-building"></i> Stockist: 
                    <strong>{{ ord.stockist?.chemistName || ord.stockist?.username }}</strong>
                  </div>

                  <div class="ord-items-summary">
                    @for (item of ord.items; track item._id) {
                      <div class="ord-item-line">
                        <span>{{ item.name }} (x{{ item.quantity }})</span>
                        <span>₹{{ item.totalPrice | number:'1.2-2' }}</span>
                      </div>
                    }
                  </div>

                  <div class="ord-footer">
                    <div class="ord-total">
                      <span>Total:</span>
                      <strong>₹{{ ord.totalAmount | number:'1.2-2' }}</strong>
                    </div>

                    <!-- Progress Stepper -->
                    <div class="progress-bar-mini">
                      <div class="step" [class.complete]="isStepDone(ord.status, 1)" title="Order Placed">
                        <i class="bi bi-check-circle-fill"></i> Placed
                      </div>
                      <div class="step" [class.complete]="isStepDone(ord.status, 2)" title="Accepted by Stockist">
                        <i class="bi bi-check-circle-fill"></i> Accepted
                      </div>
                      <div class="step" [class.complete]="isStepDone(ord.status, 3)" title="Out for Delivery">
                        <i class="bi bi-truck"></i> Delivery
                      </div>
                      <div class="step" [class.complete]="isStepDone(ord.status, 4)" title="Delivered">
                        <i class="bi bi-box2-heart-fill"></i> Delivered
                      </div>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="glass-panel text-center p-5">
                  <i class="bi bi-bag-x fs-1 text-muted"></i>
                  <h4 class="mt-3">No placed orders yet</h4>
                  <p class="text-muted">Browse the marketplace and place your first wholesale order!</p>
                  <button class="btn btn-primary mt-2" (click)="currentView = 'marketplace'">Browse Marketplace</button>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- WHOLESALE ORDER CART SIDE DRAWER -->
      <app-side-drawer
        [open]="showCartModal"
        title="Wholesale Order"
        [subtitle]="'Ordering from: ' + (cartStockistName || 'Wholesale Supplier')"
        width="560px"
        primaryButtonText="Confirm & Place Order"
        secondaryButtonText="Cancel"
        [submitDisabled]="cartItems.length === 0 || submitting"
        [submitLoading]="submitting"
        (closed)="closeCartModal()"
        (submitted)="submitOrder()">
        
        @if (cartItems.length === 0) {
          <div class="text-center p-4">
            <i class="bi bi-cart-x fs-1 text-muted"></i>
            <p class="mt-2 text-muted">Your cart is empty.</p>
          </div>
        } @else {
          <div class="cart-stockist-group">
            <p class="stockist-header text-muted mb-3">
              Ordering from: <strong style="color: var(--text-primary);">{{ cartStockistName }}</strong>
            </p>

            <div class="cart-items-list mb-3">
              @for (cItem of cartItems; track cItem.medicine._id) {
                <div class="cart-item-row glass-panel mb-2" style="padding: 12px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                  <div class="citem-info">
                    <span class="citem-title" style="font-weight: 600; display: block;">{{ cItem.medicine.name }}</span>
                    <span class="citem-rate text-muted" style="font-size: 0.8rem;">₹{{ cItem.medicine.wholesalePrice }} / unit</span>
                  </div>
                  <div class="qty-counter" style="display: flex; align-items: center; gap: 6px;">
                    <button class="btn btn-sm btn-glass" (click)="updateCartQty(cItem.medicine._id, -1)">-</button>
                    <span style="font-weight: 600; min-width: 20px; text-align: center;">{{ cItem.quantity }}</span>
                    <button class="btn btn-sm btn-glass" (click)="updateCartQty(cItem.medicine._id, 1)">+</button>
                  </div>
                  <div class="citem-total" style="font-weight: 700; color: var(--primary);">
                    ₹{{ cItem.medicine.wholesalePrice * cItem.quantity | number:'1.2-2' }}
                  </div>
                </div>
              }
            </div>

            <div class="form-group mt-3">
              <label class="form-label">Delivery Address</label>
              <input type="text" [(ngModel)]="deliveryAddress" class="form-control glass-input" placeholder="Enter pharmacy delivery address" />
            </div>

            <div class="form-group mt-3">
              <label class="form-label">Order Notes / Special Instructions</label>
              <input type="text" [(ngModel)]="orderNotes" class="form-control glass-input" placeholder="e.g. Please deliver by morning" />
            </div>

            <div class="cart-summary mt-4" style="background: var(--bg-muted); padding: 16px; border-radius: 10px;">
              <div class="summary-line" style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span>Total Items:</span>
                <span style="font-weight: 600;">{{ cartTotalQty }}</span>
              </div>
              <div class="summary-line grand-total" style="display: flex; justify-content: space-between; font-size: 1.15rem; font-weight: 700; color: var(--primary);">
                <span>Grand Total:</span>
                <span>₹{{ cartGrandTotal | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>
        }
      </app-side-drawer>
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
    .view-toggle {
      display: flex;
      gap: 8px;
      background: var(--bg-muted);
      padding: 4px;
      border-radius: 12px;
      border: 1px solid var(--glass-border);
    }
    .toggle-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .toggle-btn.active {
      background: rgba(15, 118, 110, 0.25);
      color: var(--primary);
      border: 1px solid rgba(15, 118, 110, 0.4);
      font-weight: 600;
    }
    .badge-count {
      background: var(--primary);
      color: white;
      font-size: 0.65rem;
      padding: 2px 6px;
      border-radius: 10px;
    }
    .filter-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-radius: 14px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .search-box {
      position: relative;
      width: 320px;
    }
    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
    }
    .search-box input {
      padding-left: 40px;
      border-radius: 10px;
    }
    .category-filters {
      display: flex;
      gap: 8px;
      overflow-x: auto;
    }
    .cat-chip {
      background: var(--bg-hover);
      border: 1px solid var(--glass-border);
      color: var(--text-secondary);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .cat-chip.active, .cat-chip:hover {
      background: rgba(15, 118, 110, 0.1);
      color: var(--primary);
      border-color: rgba(15, 118, 110, 0.3);
    }
    .cart-trigger-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--primary);
      color: white;
      padding: 8px 18px;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(15, 118, 110, 0.3);
      position: relative;
    }
    .cart-badge {
      background: #ef4444;
      color: white;
      font-size: 0.7rem;
      font-weight: 800;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: -6px;
      right: -6px;
    }
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    .col-span-full { grid-column: 1 / -1; }
    .product-card {
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
      border: 1px solid var(--glass-border);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .product-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
    }
    .prod-image-wrapper {
      position: relative;
      width: 100%;
      height: 160px;
      border-radius: 12px;
      overflow: hidden;
      background: var(--bg-muted);
    }
    .prod-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    .product-card:hover .prod-card-img {
      transform: scale(1.05);
    }
    .category-badge-top {
      position: absolute;
      top: 10px;
      left: 10px;
      backdrop-filter: blur(8px);
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .card-badge {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .stock-status {
      font-size: 0.75rem;
      color: var(--success);
    }
    .prod-title {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .stockist-name {
      font-size: 0.85rem;
      color: var(--primary);
    }
    .pricing-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      background: var(--bg-muted);
      padding: 10px 14px;
      border-radius: 10px;
    }
    .price-box {
      display: flex;
      flex-direction: column;
    }
    .price-label { font-size: 0.7rem; color: var(--text-secondary); }
    .price-value { font-size: 1.2rem; font-weight: 800; color: var(--success); }
    .mrp-box { text-align: right; }
    .mrp-label { font-size: 0.7rem; }
    .mrp-value { text-decoration: line-through; }
    .qty-counter {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: var(--bg-muted);
      border-radius: 10px;
      padding: 4px 12px;
      border: 1px solid var(--glass-border);
    }
    .qty-counter button {
      background: none;
      border: none;
      color: var(--text-primary);
      font-size: 1.2rem;
      cursor: pointer;
      width: 28px;
    }
    .qty-counter span {
      font-weight: 700;
    }
    .btn-block { width: 100%; }

    /* Orders Tab Styles */
    .my-orders-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
    }
    .my-order-card {
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ord-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--bg-hover);
      padding-bottom: 10px;
    }
    .ord-num { font-weight: 700; font-size: 1rem; }
    .ord-date { font-size: 0.75rem; margin-left: 8px; }
    .ord-status-pill {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .ord-status-pill.pending { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
    .ord-status-pill.accepted { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
    .ord-status-pill.delivery { background: rgba(14, 165, 233, 0.2); color: #0ea5e9; }
    .ord-status-pill.delivered { background: rgba(16, 185, 129, 0.2); color: var(--success); }
    .ord-stockist { font-size: 0.85rem; color: var(--primary); }
    .ord-items-summary {
      background: var(--bg-muted);
      border-radius: 10px;
      padding: 10px;
      font-size: 0.85rem;
    }
    .ord-item-line {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
    }
    .ord-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 8px;
    }
    .progress-bar-mini {
      display: flex;
      gap: 6px;
      font-size: 0.65rem;
    }
    .progress-bar-mini .step {
      display: flex;
      align-items: center;
      gap: 2px;
      color: var(--text-secondary);
      opacity: 0.5;
    }
    .progress-bar-mini .step.complete {
      color: var(--success);
      opacity: 1;
      font-weight: 600;
    }

    /* ============================
       Cart Side Panel
       ============================ */
    .cart-side-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.4);
      z-index: 9998;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
    }
    .cart-side-overlay.open {
      opacity: 1;
      pointer-events: auto;
    }

    .cart-side-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 440px;
      max-width: 100vw;
      height: 100vh;
      background: var(--bg-card);
      border-left: 1px solid var(--border);
      box-shadow: -8px 0 30px rgba(0, 0, 0, 0.08);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .cart-side-panel.open {
      transform: translateX(0);
    }

    .side-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .sp-title {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--primary);
    }
    .sp-title h3 {
      margin: 0;
      font-size: 1.05rem;
      color: var(--text-primary);
    }
    .sp-title i { font-size: 1.2rem; }
    .sp-close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.1rem;
      cursor: pointer;
      padding: 4px;
      border-radius: var(--radius-sm);
      transition: all 200ms;
    }
    .sp-close-btn:hover { color: var(--text-primary); background: var(--bg-hover); }

    .side-panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }

    /* Empty Cart */
    .sp-empty-cart {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 24px;
      text-align: center;
      color: var(--text-muted);
    }
    .sp-empty-cart i { font-size: 3rem; margin-bottom: 12px; opacity: 0.4; }
    .sp-empty-cart h4 { color: var(--text-secondary); margin-bottom: 6px; }
    .sp-empty-cart p { font-size: 0.85rem; margin-bottom: 16px; }

    /* Stockist Banner */
    .sp-stockist-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      background: var(--bg-muted);
      border-bottom: 1px solid var(--border);
      font-size: 0.87rem;
    }
    .sp-stockist-banner i { color: var(--primary); font-size: 1.1rem; }
    .sp-label { font-size: 0.7rem; color: var(--text-muted); display: block; }

    /* Items Label */
    .sp-items-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px 8px;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .sp-clear-btn {
      background: none;
      border: none;
      color: var(--danger);
      font-size: 0.75rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 200ms;
    }
    .sp-clear-btn:hover { background: rgba(220, 38, 38, 0.06); }

    /* Items Scroll */
    .sp-items-scroll {
      padding: 0 20px;
      max-height: 300px;
      overflow-y: auto;
    }

    /* Cart Item */
    .sp-cart-item {
      padding: 12px 0;
      border-bottom: 1px solid var(--border-light);
    }
    .sp-cart-item:last-child { border-bottom: none; }

    .sp-item-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .sp-item-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sp-item-name {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text-primary);
    }
    .sp-item-category {
      font-size: 0.7rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    .sp-item-remove {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.9rem;
      padding: 2px;
      transition: color 200ms;
    }
    .sp-item-remove:hover { color: var(--danger); }

    .sp-item-brand {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .sp-item-meta {
      display: flex;
      gap: 8px;
      margin-top: 6px;
    }
    .sp-meta-tag {
      font-size: 0.7rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 3px;
      background: var(--bg-muted);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .sp-item-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
      gap: 12px;
    }
    .sp-item-pricing { flex: 1; }
    .sp-wholesale-price {
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--primary);
    }
    .sp-wholesale-price small {
      font-weight: 400;
      font-size: 0.72rem;
      color: var(--text-muted);
    }
    .sp-mrp-price {
      font-size: 0.72rem;
      color: var(--text-muted);
    }
    .sp-savings-tag {
      font-size: 0.65rem;
      color: var(--success);
      font-weight: 700;
      margin-left: 4px;
      background: rgba(22, 163, 74, 0.08);
      padding: 1px 4px;
      border-radius: 3px;
    }

    .sp-qty-control {
      display: flex;
      align-items: center;
      gap: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .sp-qty-control button {
      background: var(--bg-muted);
      border: none;
      color: var(--text-primary);
      width: 28px;
      height: 28px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      transition: background 200ms;
    }
    .sp-qty-control button:hover { background: var(--bg-hover); }
    .sp-qty-control span {
      font-weight: 700;
      font-size: 0.82rem;
      min-width: 28px;
      text-align: center;
    }

    .sp-item-total {
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--text-primary);
      white-space: nowrap;
    }

    /* Form Section */
    .sp-form-section {
      padding: 16px 20px;
      border-top: 1px solid var(--border);
    }
    .sp-form-group {
      margin-bottom: 12px;
    }
    .sp-form-group:last-child { margin-bottom: 0; }
    .sp-form-group label {
      display: block;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Summary Section */
    .sp-summary-section {
      padding: 16px 20px;
      border-top: 1px solid var(--border);
      background: var(--bg-muted);
    }
    .sp-summary-section h4 {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-secondary);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sp-summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      padding: 3px 0;
      color: var(--text-secondary);
    }
    .sp-savings-row {
      color: var(--success);
      font-weight: 600;
    }
    .sp-grand-total-row {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--primary);
      border-top: 1px solid var(--border);
      padding-top: 8px;
      margin-top: 6px;
    }

    /* Panel Footer */
    .side-panel-footer {
      display: flex;
      gap: 10px;
      padding: 16px 20px;
      border-top: 1px solid var(--border);
      flex-shrink: 0;
    }
    .sp-btn-cancel {
      flex: 1;
      padding: 10px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.85rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 200ms;
    }
    .sp-btn-cancel:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
    .sp-btn-order {
      flex: 2;
      padding: 10px;
      border: none;
      background: var(--primary);
      color: white;
      font-weight: 700;
      font-size: 0.87rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 200ms;
      box-shadow: 0 2px 8px rgba(15, 118, 110, 0.2);
    }
    .sp-btn-order:hover {
      background: var(--primary-dark);
      box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);
    }
    .sp-btn-order:disabled {
      background: #94A3B8;
      cursor: not-allowed;
      box-shadow: none;
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    @media (max-width: 480px) {
      .cart-side-panel {
        width: 100vw;
      }
    }
  `]
})
export class ChemistMarketplaceComponent implements OnInit {
  private apiService = inject(ApiService);

  currentView: 'marketplace' | 'my-orders' = 'marketplace';
  categories: string[] = ['All', 'Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'General'];
  selectedCategory: string = 'All';
  searchQuery: string = '';

  marketplaceItems: any[] = [];
  myOrders: any[] = [];
  loading: boolean = true;
  loadingOrders: boolean = false;
  submitting: boolean = false;

  // Cart
  cartItems: { medicine: any; quantity: number }[] = [];
  showCartModal: boolean = false;
  deliveryAddress: string = '';
  orderNotes: string = '';

  ngOnInit(): void {
    this.loadMarketplace();
    this.loadMyOrders();
    // Prefill address from logged in user profile if available
    const u = this.apiService.currentUser();
    if (u && u.pdfConfig?.address) {
      this.deliveryAddress = u.pdfConfig.address;
    }
  }

  loadMarketplace(): void {
    this.loading = true;
    this.apiService.getMarketplaceMedicines(this.searchQuery, this.selectedCategory).subscribe({
      next: (data) => {
        this.marketplaceItems = data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Marketplace fetch error:', err);
        this.loading = false;
      }
    });
  }

  loadMyOrders(): void {
    this.loadingOrders = true;
    this.apiService.getStockistOrders('chemist').subscribe({
      next: (data) => {
        this.myOrders = data || [];
        this.loadingOrders = false;
      },
      error: (err) => {
        console.error('My orders fetch error:', err);
        this.loadingOrders = false;
      }
    });
  }

  switchToOrders(): void {
    this.currentView = 'my-orders';
    this.loadMyOrders();
  }

  selectCategory(cat: string): void {
    this.selectedCategory = cat;
    this.loadMarketplace();
  }

  // --- Cart Helpers ---
  addToCart(item: any): void {
    // Single stockist check per order
    if (this.cartItems.length > 0) {
      const existingStockistId = this.cartItems[0].medicine.stockist?._id || this.cartItems[0].medicine.stockist;
      const newItemStockistId = item.stockist?._id || item.stockist;
      if (existingStockistId !== newItemStockistId) {
        if (confirm('Your cart contains items from another Stockist. Clear cart and start new order?')) {
          this.cartItems = [];
        } else {
          return;
        }
      }
    }

    const minQty = item.minOrderQty || 1;
    this.cartItems.push({ medicine: item, quantity: minQty });
  }

  isInCart(medId: string): boolean {
    return this.cartItems.some(c => c.medicine._id === medId);
  }

  getCartQty(medId: string): number {
    const found = this.cartItems.find(c => c.medicine._id === medId);
    return found ? found.quantity : 0;
  }

  updateCartQty(medId: string, delta: number): void {
    const idx = this.cartItems.findIndex(c => c.medicine._id === medId);
    if (idx !== -1) {
      this.cartItems[idx].quantity += delta;
      if (this.cartItems[idx].quantity <= 0) {
        this.cartItems.splice(idx, 1);
      }
    }
  }

  get cartTotalQty(): number {
    return this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  get cartGrandTotal(): number {
    return this.cartItems.reduce((sum, item) => sum + (item.medicine.wholesalePrice * item.quantity), 0);
  }

  get cartStockistName(): string {
    if (this.cartItems.length === 0) return 'None';
    const s = this.cartItems[0].medicine.stockist;
    return typeof s === 'object' ? (s.chemistName || s.username) : 'Stockist';
  }

  openCartModal(): void {
    this.showCartModal = true;
  }

  closeCartModal(): void {
    this.showCartModal = false;
  }

  clearCart(): void {
    this.cartItems = [];
  }

  removeFromCart(medId: string): void {
    this.cartItems = this.cartItems.filter(c => c.medicine._id !== medId);
  }

  get cartTotalSavings(): number {
    return this.cartItems.reduce((sum, item) => {
      if (item.medicine.mrp && item.medicine.mrp > item.medicine.wholesalePrice) {
        return sum + (item.medicine.mrp - item.medicine.wholesalePrice) * item.quantity;
      }
      return sum;
    }, 0);
  }

  submitOrder(): void {
    if (this.cartItems.length === 0) return;

    const stockistId = this.cartItems[0].medicine.stockist?._id || this.cartItems[0].medicine.stockist;

    const payload = {
      stockistId,
      items: this.cartItems.map(c => ({
        medicineId: c.medicine._id,
        quantity: c.quantity
      })),
      deliveryAddress: this.deliveryAddress,
      notes: this.orderNotes
    };

    this.submitting = true;
    this.apiService.placeStockistOrder(payload).subscribe({
      next: (res) => {
        this.submitting = false;
        alert(`🎉 Order ${res.order?.orderNumber} placed successfully! Notification sent to stockist.`);
        this.cartItems = [];
        this.closeCartModal();
        this.switchToOrders();
      },
      error: (err) => {
        this.submitting = false;
        alert(err.error?.message || 'Failed to place order');
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending': return 'pending';
      case 'Accepted': return 'accepted';
      case 'Out for Delivery': return 'delivery';
      case 'Delivered': return 'delivered';
      default: return '';
    }
  }

  isStepDone(status: string, stepNum: number): boolean {
    const levels: { [key: string]: number } = {
      'Pending': 1,
      'Accepted': 2,
      'Out for Delivery': 3,
      'Delivered': 4
    };
    return (levels[status] || 0) >= stepNum;
  }

  getCategoryFallback(category: string): string {
    const cat = (category || '').toLowerCase();
    if (cat.includes('syrup')) return 'https://images.unsplash.com/photo-1577401239170-897942555fb3?w=500&auto=format&fit=crop&q=60';
    if (cat.includes('injection')) return 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500&auto=format&fit=crop&q=60';
    if (cat.includes('capsule')) return 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=60';
    return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60';
  }

  onImgError(event: any, category: string): void {
    event.target.src = this.getCategoryFallback(category);
  }
}
