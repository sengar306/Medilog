import { Component, ElementRef, HostListener, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api.service';

interface CartItem {
  medicineId: string;
  name: string;
  strength: string;
  category: string;
  mrp: number;
  gstPercent: number;
  quantity: number;
  availableStock: number;
}

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="billing-container animate-fade-in">
      <!-- Navigation Tabs Bar -->
      <div class="billing-tabs-nav glass-panel">
        <button class="tab-btn" [class.active]="activeTab() === 'pos'" (click)="activeTab.set('pos')">
          <i class="bi bi-cart3"></i> POS Terminal (New Bill)
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'history'" (click)="switchTab('history')">
          <i class="bi bi-journal-text"></i> Generated Bills History
          <span class="badge badge-info ms-1" *ngIf="salesHistory().length">{{ salesHistory().length }}</span>
        </button>
      </div>

      <!-- Custom Success / Dispatch Alert -->
      @if (toastMessage()) {
        <div class="alert alert-success mt-2 flex items-center justify-between" style="background: rgba(5, 46, 22, 0.95); border: 1px solid rgba(34, 197, 94, 0.8); color: #fff; padding: 14px 18px; border-radius: 14px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <span>{{ toastMessage() }}</span>
            @if (activeWaLink()) {
              <a [href]="activeWaLink()" target="_blank" class="btn btn-sm" style="background: #22c55e; color: #052e16; text-decoration: none; font-weight: 800; padding: 6px 16px; border-radius: 8px; font-size: 13px;">
                💬 Click to Send WhatsApp Message to +91 {{ customerPhone }}
              </a>
            }
          </div>
          <button (click)="toastMessage.set(null)" class="btn btn-sm" style="color: #aaa; background: none; border: none; font-size: 16px;">✕</button>
        </div>
      }

      <!-- Main Checkout Grid (POS View) -->
      <div class="billing-split" *ngIf="activeTab() === 'pos' && !receiptData()">
        <!-- Left Side: POS Shopping Cart & Drug Selector -->
        <div class="cart-column glass-panel">
          <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h3>Retail POS Cart</h3>
            <div style="display: flex; gap: 8px;">
              <button (click)="clearCart()" class="btn btn-glass btn-sm"><i class="bi bi-trash"></i> Empty</button>
            </div>
          </div>

          <!-- Add Item Bar -->
          <div class="add-item-bar mt-3">
            <div class="form-group select-drug-group searchable-dropdown-container">
              <label class="form-label">Search Medicine *</label>
              
              <div class="search-input-wrapper">
                <i class="bi bi-search search-icon"></i>
                <input type="text" 
                       class="glass-input search-medicine-input" 
                       placeholder="🔍 Type medicine name to search..." 
                       [(ngModel)]="medicineSearchQuery" 
                       (focus)="onSearchFocus()" 
                       (input)="onSearchInput()"
                       autocomplete="off"
                       #searchInput>
                @if (medicineSearchQuery) {
                  <button type="button" class="btn-clear-search-input" (click)="clearSearch()" title="Clear search">✕</button>
                }
              </div>

              <!-- Dropdown Menu Overlay (Matching Medicines List) -->
              @if (isMedicineDropdownOpen) {
                <div class="custom-dropdown-menu glass-panel animate-fade-in" (click)="$event.stopPropagation()">
                  <div class="dropdown-options-list">
                    <div class="dropdown-option-item default-option" 
                         [class.selected]="!selectedMedicineId" 
                         (click)="selectMedicineOption(null)">
                      <span class="option-name text-muted">Select medicine from master...</span>
                    </div>

                    @for (med of filteredMedicinesForSelect; track med._id) {
                      <div class="dropdown-option-item" 
                           [class.selected]="selectedMedicineId === med._id" 
                           (click)="selectMedicineOption(med)">
                        <span class="option-name">
                          <strong>{{ med.name }}</strong> ({{ med.strength }}) - Stock: {{ getMedicineStock(med._id) }}
                        </span>
                      </div>
                    } @empty {
                      <div class="dropdown-no-results">
                        <p>No medicines match "{{ medicineSearchQuery }}"</p>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
            
            <div class="form-group select-qty-group">
              <label class="form-label">Qty</label>
              <input type="number" [(ngModel)]="itemQty" class="glass-input text-center" min="1">
            </div>

            <button (click)="addToCart()" class="btn btn-primary btn-add">
              <i class="bi bi-plus-lg"></i> Add
            </button>
          </div>

          <!-- Cart Items Table -->
          <div class="glass-table-container mt-4">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Rate (MRP)</th>
                  <th>Quantity</th>
                  <th>Taxes (GST)</th>
                  <th>Total Cost</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                @for (item of cart(); track item.medicineId) {
                  <tr>
                    <td><strong>{{ item.name }}</strong> <small class="text-secondary">({{ item.strength }})</small></td>
                    <td>₹{{ item.mrp | number:'1.2-2' }}</td>
                    <td>
                      <div class="qty-editor">
                        <button (click)="updateQty(item, -1)" class="btn-qty-arrow"><i class="bi bi-dash"></i></button>
                        <span class="qty-value">{{ item.quantity }}</span>
                        <button (click)="updateQty(item, 1)" class="btn-qty-arrow"><i class="bi bi-plus"></i></button>
                      </div>
                    </td>
                    <td>{{ item.gstPercent }}%</td>
                    <td><strong>₹{{ (item.quantity * item.mrp * (1 + item.gstPercent / 100)) | number:'1.2-2' }}</strong></td>
                    <td>
                      <button (click)="removeFromCart(item)" class="btn btn-glass btn-icon text-danger-color"><i class="bi bi-trash"></i></button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="text-center text-muted py-4">Shopping cart is empty. Search and add items above.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right Side: Billing Customer & Payment Summary -->
        <div class="summary-column glass-panel">
          <h3>Checkout & Invoice Details</h3>
          
          @if (errorMessage()) {
            <div class="alert alert-danger mt-2">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form (ngSubmit)="processCheckout()" class="mt-3">
            <h4 class="section-title">Customer Information</h4>
            <div class="form-group mb-2">
              <label class="form-label" style="font-size: 0.8rem; color: #94a3b8;">Select Existing Registered Patient (Optional)</label>
              <select class="glass-input glass-select" (change)="onRegisteredCustomerSelect($event)">
                <option value="">-- Choose existing customer or enter new below --</option>
                @for (cust of registeredCustomers(); track cust._id) {
                  <option [value]="cust._id">{{ cust.name }} ({{ cust.phone || 'No phone' }})</option>
                }
              </select>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label class="form-label">Phone Number (Customer WhatsApp)</label>
                @if (isNewCustomerNotice()) {
                  <small style="color: #38bdf8; font-size: 0.72rem; font-weight: 600;">✨ New Patient Account will be auto-created</small>
                }
              </div>
              <input type="text" [(ngModel)]="customerPhone" (input)="onCustomerPhoneChange()" name="custPhone" class="glass-input" placeholder="e.g. 9876543210">
            </div>
            
            <div class="form-group">
              <label class="form-label">Customer Name</label>
              <input type="text" [(ngModel)]="customerName" (input)="onCustomerNameChange()" name="custName" class="glass-input" placeholder="Patient Name">
            </div>

            <!-- Doctor Prescription Capture Section -->
            <h4 class="section-title mt-4">Doctor Prescription (Rx) Photo</h4>
            <div class="form-group rx-upload-group mt-2">
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" (click)="startCamera()" class="btn btn-glass btn-sm" style="display: flex; align-items: center; gap: 6px; color: #38bdf8; border-color: rgba(56, 189, 248, 0.3);">
                  <i class="bi bi-camera-fill"></i> 📸 Snap Rx via Camera
                </button>

                <button type="button" (click)="rxFileInput.click()" class="btn btn-glass btn-sm" style="display: flex; align-items: center; gap: 6px;">
                  <i class="bi bi-paperclip"></i> 📁 Upload Rx Image
                </button>
                
                <input type="file" #rxFileInput (change)="onPrescriptionFileSelected($event)" style="display: none;" accept="image/*" capture="environment">
              </div>

              <!-- Live Camera Stream Viewer -->
              @if (isCameraActive()) {
                <div class="camera-stream-box glass-panel text-center mt-2" style="background: #090d16; border: 1px solid #38bdf8; border-radius: 12px; padding: 10px;">
                  <video #rxVideo autoplay playsinline style="width: 100%; max-height: 220px; border-radius: 8px; background: #000; object-fit: cover;"></video>
                  <div class="camera-controls mt-2" style="display: flex; justify-content: center; gap: 10px;">
                    <button type="button" (click)="capturePhoto()" class="btn btn-primary btn-sm" style="font-weight: bold; background: #38bdf8; color: #090d16;">
                      <i class="bi bi-camera"></i> Capture Snapshot
                    </button>
                    <button type="button" (click)="stopCamera()" class="btn btn-glass btn-sm">
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              }

              <!-- Prescription Thumbnail Preview -->
              @if (prescriptionImage()) {
                <div class="rx-preview-box mt-2" style="position: relative; display: inline-block; background: rgba(0,0,0,0.4); border: 1px solid rgba(168, 85, 247, 0.5); border-radius: 10px; padding: 8px;">
                  <img [src]="prescriptionImage()" style="max-height: 110px; border-radius: 6px; display: block;" alt="Rx Photo">
                  <div style="display: flex; gap: 8px; margin-top: 6px; align-items: center; justify-content: space-between;">
                    <span class="badge badge-purple" style="font-size: 0.72rem;">✓ Rx Photo Attached</span>
                    <button type="button" (click)="removePrescription()" class="btn btn-glass btn-sm text-danger" style="font-size: 0.75rem; padding: 2px 6px !important;" title="Remove Photo">✕ Remove</button>
                  </div>
                </div>
              }
            </div>

            <h4 class="section-title mt-4">Payment Configuration</h4>
            <div class="form-group">
              <label class="form-label">Payment Mode</label>
              <select [(ngModel)]="paymentMode" name="payMode" class="glass-input glass-select">
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI Mobile Wallet</option>
                <option value="Mixed">Mixed Payment</option>
              </select>
            </div>

            <!-- Financial summary -->
            <div class="totals-box mt-4">
              <div class="totals-row">
                <span>Cart Subtotal:</span>
                <span>₹{{ subTotal | number:'1.2-2' }}</span>
              </div>
              <div class="totals-row">
                <span>GST Tax Sum:</span>
                <span>₹{{ gstTotal | number:'1.2-2' }}</span>
              </div>
              <div class="form-group discount-group mt-2">
                <div class="d-flex align-items-center justify-content-between mb-1">
                  <label class="form-label inline-label mb-0">Discount (%)</label>
                  @if (discountAmount > 0) {
                    <span class="discount-equivalent-badge" style="background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.4); color: #c084fc; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 0.82rem;">-₹{{ discountAmount | number:'1.2-2' }}</span>
                  }
                </div>
                <div class="discount-input-box">
                  <div style="position: relative; display: flex; align-items: center;">
                    <input type="number" [(ngModel)]="discountValue" name="discount" class="glass-input discount-input text-right" min="0" max="100" placeholder="0" style="padding-right: 28px;">
                    <span style="position: absolute; right: 10px; color: #a855f7; font-weight: bold; pointer-events: none;">%</span>
                  </div>
                </div>
              </div>
              <div class="totals-row final-row mt-2">
                <span>Grand Total:</span>
                <span class="gradient-text">₹{{ grandTotal | number:'1.2-2' }}</span>
              </div>
            </div>

            <button type="submit" class="btn btn-primary w-100 mt-4" [disabled]="cart().length === 0">
              <i class="bi bi-receipt-cutoff"></i> Finalize Bill & Generate Invoice
            </button>
          </form>
        </div>
      </div>

      <!-- Retail Bill Receipt View (Shown after checkout completes) -->
      @if (receiptData()) {
        <div class="receipt-layout animate-fade-in">
          <div class="receipt-card glass-panel">
            <div class="receipt-header">
              <i class="bi bi-heart-pulse-fill logo-icon"></i>
              <h2>MediLog Pharmacy</h2>
              <p>Smart Retail Billing System</p>
              <p class="invoice-number mt-2">Invoice: <strong>{{ receiptData().sale.invoiceNumber }}</strong></p>
            </div>

            <div class="receipt-meta mt-3">
              <div>
                <p><strong>Customer:</strong> {{ customerName || 'Walk-in customer' }}</p>
                <p><strong>Phone:</strong> {{ customerPhone || 'N/A' }}</p>
              </div>
              <div style="text-align: right;">
                <p><strong>Date:</strong> {{ receiptData().sale.saleDate | date:'medium' }}</p>
                <p><strong>Cashier:</strong> {{ cashierUsername }}</p>
              </div>
            </div>

            <div class="receipt-items-table mt-4">
              <table class="receipt-table">
                <thead>
                  <tr>
                    <th>Medicine Details</th>
                    <th>Batch</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>GST %</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of receiptData().items; track item._id) {
                    <tr>
                      <td><strong>{{ item.medicine ? item.medicine.name : 'Medicine' }}</strong></td>
                      <td><code>{{ item.batchNumber }}</code></td>
                      <td>{{ item.quantity }}</td>
                      <td>₹{{ item.rate | number:'1.2-2' }}</td>
                      <td>{{ item.gstPercent }}%</td>
                      <td>₹{{ item.totalAmount | number:'1.2-2' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="receipt-totals mt-4">
              <p>Subtotal: ₹{{ receiptData().sale.subTotal | number:'1.2-2' }}</p>
              <p>GST Taxes: ₹{{ receiptData().sale.gstTotal | number:'1.2-2' }}</p>
              <p>Discounts Applied: -₹{{ receiptData().sale.discountAmount | number:'1.2-2' }}</p>
              <h3 class="net-payable-title gradient-text mt-2">Amount Paid: ₹{{ receiptData().sale.totalAmount | number:'1.2-2' }}</h3>
              <p class="payment-mode-label">Payment Mode: <strong>{{ receiptData().sale.paymentMode }}</strong></p>
            </div>

            @if (receiptData().sale.prescriptionUrl) {
              <div class="rx-attached-receipt mt-3 p-2 text-center" style="background: rgba(168, 85, 247, 0.1); border: 1px dashed rgba(168, 85, 247, 0.4); border-radius: 10px;">
                <p style="margin: 0; font-size: 0.85rem; color: #c084fc; font-weight: 600;">📋 Doctor Prescription Photo Attached</p>
                <a [href]="apiService.baseUrl + receiptData().sale.prescriptionUrl" target="_blank" class="btn btn-glass btn-sm mt-2" style="color: #c084fc; font-size: 0.8rem; text-decoration: none;">
                  <i class="bi bi-eye"></i> Open Prescription Photo
                </a>
              </div>
            }

            <div class="receipt-footer mt-4">
              <p><i class="bi bi-shield-check-fill"></i> Thank you! Get well soon.</p>
              <div class="footer-buttons mt-3 no-print" style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <a [href]="apiService.getSalePdfUrl(receiptData().sale._id)" target="_blank" class="btn btn-primary" style="display: flex; align-items: center; gap: 6px; text-decoration: none; border-radius: 8px; padding: 10px 16px; font-weight: bold;">
                  <i class="bi bi-file-earmark-pdf"></i> View Invoice PDF
                </a>
                <button (click)="downloadPdf(receiptData().sale._id)" class="btn btn-glass" style="display: flex; align-items: center; gap: 6px;">
                  <i class="bi bi-download"></i> Download PDF
                </button>
                <button (click)="printReceipt()" class="btn btn-glass"><i class="bi bi-printer"></i> Thermal Print</button>
                @if (customerPhone) {
                  <button (click)="openDirectWhatsApp()" class="btn" style="background: #16a34a; color: white; border: none; border-radius: 8px; font-weight: bold; padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                    <i class="bi bi-whatsapp"></i> Open WhatsApp Web
                  </button>
                }
                <button (click)="resetPOS()" class="btn btn-primary-glass"><i class="bi bi-plus-circle"></i> New POS Bill</button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Generated Bills History View -->
      <div class="history-view glass-panel animate-fade-in" *ngIf="activeTab() === 'history'">
        <div class="list-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
          <div>
            <h3>Generated Bills Register</h3>
            <p class="text-secondary" style="margin: 0; font-size: 0.88rem;">Complete history of all sales transactions & invoice records</p>
          </div>

          <div style="display: flex; gap: 10px; align-items: center;">
            <div class="search-input-wrapper" style="min-width: 280px;">
              <i class="bi bi-search search-icon"></i>
              <input type="text" 
                     class="glass-input search-medicine-input" 
                     placeholder="Search by Invoice #, Customer, Phone, Payment..." 
                     [(ngModel)]="historySearchQuery">
            </div>

            <button (click)="loadSalesHistory()" class="btn btn-glass" style="display: flex; align-items: center; gap: 6px;">
              <i class="bi bi-arrow-clockwise"></i> Refresh
            </button>
          </div>
        </div>

        <div class="glass-table-container">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer Name</th>
                <th>Phone Number</th>
                <th>Date & Time</th>
                <th>Payment Mode</th>
                <th>Subtotal</th>
                <th>GST Tax</th>
                <th>Discount</th>
                <th>Grand Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (sale of filteredSalesHistory; track sale._id) {
                <tr>
                  <td><code>{{ sale.invoiceNumber }}</code></td>
                  <td><strong>{{ sale.customer?.name || 'Walk-in Customer' }}</strong></td>
                  <td><code>{{ sale.customer?.phone || 'N/A' }}</code></td>
                  <td>{{ sale.saleDate | date:'medium' }}</td>
                  <td>
                    <span class="badge" [ngClass]="{
                      'badge-success': sale.paymentMode === 'Cash',
                      'badge-info': sale.paymentMode === 'UPI',
                      'badge-warning': sale.paymentMode === 'Card',
                      'badge-purple': sale.paymentMode === 'Mixed'
                    }">{{ sale.paymentMode }}</span>
                  </td>
                  <td>₹{{ sale.subTotal | number:'1.2-2' }}</td>
                  <td>₹{{ sale.gstTotal | number:'1.2-2' }}</td>
                  <td>-₹{{ sale.discountAmount | number:'1.2-2' }}</td>
                  <td><strong style="color: #4ade80; font-size: 0.98rem;">₹{{ sale.totalAmount | number:'1.2-2' }}</strong></td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      <button (click)="viewSaleDetails(sale._id)" class="btn btn-glass btn-sm" title="View Full Receipt">
                        <i class="bi bi-receipt"></i> View
                      </button>
                      @if (sale.prescriptionUrl) {
                        <a [href]="apiService.baseUrl + sale.prescriptionUrl" target="_blank" class="btn btn-glass btn-sm" style="color: #c084fc; text-decoration: none;" title="View Doctor Prescription Photo">
                          <i class="bi bi-image"></i> Rx
                        </a>
                      }
                      <a [href]="apiService.getSalePdfUrl(sale._id)" target="_blank" class="btn btn-glass btn-sm" style="text-decoration: none;" title="Open Invoice PDF">
                        <i class="bi bi-file-earmark-pdf"></i> PDF
                      </a>
                      <button (click)="downloadPdf(sale._id)" class="btn btn-glass btn-sm" title="Download Invoice PDF">
                        <i class="bi bi-download"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="10" class="text-center text-muted py-4">
                    @if (historyLoading()) {
                      <span><i class="bi bi-arrow-repeat spin"></i> Loading generated bills...</span>
                    } @else {
                      <span>No generated bills found matching search query.</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .billing-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .billing-tabs-nav {
      display: flex;
      gap: 12px;
      padding: 10px 16px;
      border-radius: 12px;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 10px;
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .tab-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
    }
    .tab-btn.active {
      background: rgba(130, 87, 229, 0.2);
      border-color: rgba(130, 87, 229, 0.4);
      color: #fff;
      box-shadow: 0 4px 14px rgba(130, 87, 229, 0.25);
    }
    .badge-purple {
      background: rgba(168, 85, 247, 0.15);
      border: 1px solid rgba(168, 85, 247, 0.3);
      color: #c084fc;
    }
    .ms-1 { margin-left: 4px; }
    .me-1 { margin-right: 4px; }
    .py-4 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    .billing-split {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      align-items: start;
    }
    @media (max-width: 1100px) {
      .billing-split {
        grid-template-columns: 1fr;
      }
    }
    .add-item-bar {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }
    .select-drug-group {
      flex: 1;
      min-width: 250px;
    }
    .searchable-dropdown-container {
      position: relative;
    }
    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-input-wrapper .search-icon {
      position: absolute;
      left: 12px;
      color: #3b82f6;
      font-size: 1rem;
      pointer-events: none;
    }
    .search-medicine-input {
      width: 100%;
      padding-left: 36px !important;
      padding-right: 32px !important;
      height: 42px;
      font-size: 0.92rem;
    }
    .btn-clear-search-input {
      position: absolute;
      right: 10px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #94a3b8;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-clear-search-input:hover {
      background: rgba(239, 68, 68, 0.3);
      color: #ef4444;
    }
    .custom-dropdown-menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 1050;
      background: rgba(15, 23, 42, 0.97);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(59, 130, 246, 0.2);
      backdrop-filter: blur(20px);
      overflow: hidden;
      padding: 6px;
    }
    .dropdown-options-list {
      max-height: 250px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .dropdown-options-list::-webkit-scrollbar {
      width: 5px;
    }
    .dropdown-options-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
    }
    .dropdown-option-item {
      padding: 10px 14px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 0.92rem;
      color: #f8fafc;
    }
    .dropdown-option-item:hover {
      background: rgba(59, 130, 246, 0.2);
      color: #ffffff;
    }
    .dropdown-option-item.selected {
      background: rgba(59, 130, 246, 0.3);
      font-weight: 600;
    }
    .dropdown-no-results {
      padding: 16px 12px;
      text-align: center;
      color: #94a3b8;
      font-size: 0.88rem;
    }
    .select-qty-group {
      width: 90px;
    }
    .btn-add {
      height: 42px;
    }
    .qty-editor {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 2px 6px;
    }
    .btn-qty-arrow {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0 4px;
      font-size: 14px;
      transition: color 0.2s;
    }
    .btn-qty-arrow:hover {
      color: #fff;
    }
    .qty-value {
      font-weight: 600;
      min-width: 20px;
      text-align: center;
    }
    .section-title {
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 6px;
    }
    .discount-group {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .discount-toggle {
      background: rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 2px;
      display: flex;
    }
    .btn-toggle {
      padding: 2px 8px;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
      border: none;
      background: transparent;
      border-radius: 4px;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .btn-toggle.active {
      background: var(--primary-color, #6366f1);
      color: #ffffff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .discount-input-box {
      display: flex;
      align-items: center;
    }
    .discount-input {
      width: 90px;
    }
    .discount-equivalent-badge {
      font-size: 0.8rem;
      font-weight: 600;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 2px 6px;
      border-radius: 6px;
    }
    .totals-box {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 14px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 0.95rem;
      color: var(--text-secondary);
    }
    .final-row {
      font-size: 1.2rem;
      font-weight: 700;
      color: #fff;
      border-top: 1px dashed rgba(255, 255, 255, 0.15);
      padding-top: 10px;
    }
    .receipt-layout {
      display: flex;
      justify-content: center;
    }
    .receipt-card {
      width: 100%;
      max-width: 650px;
      padding: 30px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      border-radius: 16px;
    }
    .receipt-header {
      text-align: center;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.15);
      padding-bottom: 16px;
    }
    .logo-icon {
      font-size: 2.2rem;
      color: var(--primary-color);
    }
    .receipt-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
      color: var(--text-secondary);
    }
    .receipt-table {
      width: 100%;
      border-collapse: collapse;
    }
    .receipt-table th, .receipt-table td {
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 0.88rem;
    }
    .receipt-totals {
      text-align: right;
      border-top: 1px dashed rgba(255, 255, 255, 0.15);
      padding-top: 12px;
    }
    .receipt-footer {
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 16px;
    }
    .footer-buttons {
      display: flex;
      justify-content: center;
      gap: 12px;
    }
    @media print {
      body * { visibility: hidden; }
      .receipt-layout, .receipt-card, .receipt-card * { visibility: visible; }
      .receipt-layout { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; }
      .receipt-card {
        background: #ffffff !important;
        color: #000000 !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      .no-print { display: none !important; }
      .logo-icon { color: #8257e5 !important; }
      .receipt-table th { background-color: #8257e5 !important; color: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .receipt-table td { border-bottom: 1px solid #ddd !important; color: #000000 !important; }
    }
  `]
})
export class BillingComponent implements OnInit {
  public apiService = inject(ApiService);

  activeTab = signal<'pos' | 'history'>('pos');
  medicines = signal<any[]>([]);
  inventory = signal<any[]>([]);
  cart = signal<CartItem[]>([]);
  receiptData = signal<any>(null);
  errorMessage = signal<string | null>(null);
  toastMessage = signal<string | null>(null);
  activeWaLink = signal<string | null>(null);

  salesHistory = signal<any[]>([]);
  historySearchQuery: string = '';
  historyLoading = signal<boolean>(false);

  prescriptionImage = signal<string | null>(null);
  isCameraActive = signal<boolean>(false);
  @ViewChild('rxVideo') rxVideoRef!: ElementRef<HTMLVideoElement>;
  private mediaStream: MediaStream | null = null;

  registeredCustomers = signal<any[]>([]);
  isNewCustomerNotice = signal<boolean>(false);

  loadCustomers(): void {
    this.apiService.getCustomers().subscribe({
      next: (custs) => this.registeredCustomers.set(custs),
      error: (err) => console.error('Failed to load customers for POS', err)
    });
  }

  onCustomerPhoneChange(): void {
    const phone = this.customerPhone.trim();
    if (!phone) {
      this.isNewCustomerNotice.set(false);
      return;
    }

    const match = this.registeredCustomers().find(c => c.phone && c.phone.toString().trim() === phone);
    if (match) {
      this.customerName = match.name;
      this.isNewCustomerNotice.set(false);
    } else {
      this.isNewCustomerNotice.set(true);
    }
  }

  onCustomerNameChange(): void {
    const name = this.customerName.trim();
    const phone = this.customerPhone.trim();
    if (!phone && name) {
      const match = this.registeredCustomers().find(c => c.name && c.name.toLowerCase() === name.toLowerCase());
      if (match && match.phone) {
        this.customerPhone = match.phone;
        this.isNewCustomerNotice.set(false);
      }
    }
  }

  onRegisteredCustomerSelect(event: Event): void {
    const custId = (event.target as HTMLSelectElement).value;
    if (!custId) return;
    const match = this.registeredCustomers().find(c => c._id === custId);
    if (match) {
      this.customerName = match.name;
      this.customerPhone = match.phone || '';
      this.isNewCustomerNotice.set(false);
    }
  }

  switchTab(tab: 'pos' | 'history'): void {
    this.activeTab.set(tab);
    if (tab === 'history') {
      this.loadSalesHistory();
    }
  }

  loadSalesHistory(): void {
    this.historyLoading.set(true);
    this.apiService.getSales().subscribe({
      next: (sales) => {
        this.salesHistory.set(sales);
        this.historyLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch sales history', err);
        this.historyLoading.set(false);
      }
    });
  }

  get filteredSalesHistory(): any[] {
    const q = this.historySearchQuery.trim().toLowerCase();
    if (!q) return this.salesHistory();

    return this.salesHistory().filter(s => {
      const inv = (s.invoiceNumber || '').toLowerCase();
      const custName = (s.customer?.name || 'walk-in customer').toLowerCase();
      const custPhone = (s.customer?.phone || '').toLowerCase();
      const payMode = (s.paymentMode || '').toLowerCase();
      return inv.includes(q) || custName.includes(q) || custPhone.includes(q) || payMode.includes(q);
    });
  }

  viewSaleDetails(saleId: string): void {
    this.apiService.getSaleDetails(saleId).subscribe({
      next: (res) => {
        this.receiptData.set(res);
        this.activeTab.set('pos');
      },
      error: (err) => {
        console.error('Failed to view sale details', err);
      }
    });
  }

  showWaConfigModal = signal<boolean>(false);
  waConfig = signal<any>({
    senderNumber: '916398974633',
    businessName: 'Assandh Road Pharmacy',
    gatewayType: 'DIRECT_AUTOMATED',
    metaAccessToken: '',
    metaPhoneNumberId: ''
  });

  selectedMedicineId: string | null = null;
  medicineSearchQuery: string = '';
  isMedicineDropdownOpen: boolean = false;

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.searchable-dropdown-container')) {
      this.isMedicineDropdownOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    this.isMedicineDropdownOpen = false;
  }

  onSearchFocus(): void {
    this.isMedicineDropdownOpen = true;
  }

  onSearchInput(): void {
    this.isMedicineDropdownOpen = true;
    if (this.selectedMedicineId) {
      this.selectedMedicineId = null;
    }
  }

  get filteredMedicinesForSelect(): any[] {
    const query = this.medicineSearchQuery.trim().toLowerCase();
    if (!query) {
      return this.medicines();
    }
    return this.medicines().filter(med =>
      (med.name && med.name.toLowerCase().includes(query)) ||
      (med.code && med.code.toLowerCase().includes(query)) ||
      (med.strength && med.strength.toLowerCase().includes(query)) ||
      (med.genericName && med.genericName.toLowerCase().includes(query)) ||
      (med.category && med.category.toLowerCase().includes(query))
    );
  }

  selectMedicineOption(med: any | null): void {
    if (!med) {
      this.selectedMedicineId = null;
      this.medicineSearchQuery = '';
    } else {
      this.selectedMedicineId = med._id;
      const stock = this.getMedicineStock(med._id);
      this.medicineSearchQuery = `${med.name} (${med.strength}) - Stock: ${stock}`;
    }
    this.onMedicineSelect();
    this.isMedicineDropdownOpen = false;
  }

  clearSearch(): void {
    this.selectedMedicineId = null;
    this.medicineSearchQuery = '';
    this.isMedicineDropdownOpen = false;
    this.onMedicineSelect();
  }

  itemQty: number = 1;

  customerPhone: string = '6398974633';
  customerName: string = 'Vivek';
  discountValue: number = 0;

  get discountAmount(): number {
    const val = this.discountValue || 0;
    if (val <= 0) return 0;
    return Math.round((this.subTotal * (val / 100)) * 100) / 100;
  }

  paymentMode: string = 'UPI';

  cashierUsername = 'Pharmacist';

  ngOnInit(): void {
    this.loadData();
    this.loadWaConfig();
    const user = this.apiService.currentUser();
    if (user && user.username) {
      this.cashierUsername = user.username;
    }
  }

  loadData(): void {
    this.apiService.getMedicines().subscribe({
      next: (data) => this.medicines.set(data),
      error: (err) => console.error('Failed to load medicines', err)
    });

    this.apiService.getInventory('IN_STOCK').subscribe({
      next: (data) => this.inventory.set(data),
      error: (err) => console.error('Failed to load inventory', err)
    });

    this.loadSalesHistory();
    this.loadCustomers();
  }

  loadWaConfig(): void {
    this.apiService.getWhatsAppConfig().subscribe({
      next: (res) => {
        if (res && res.data) {
          this.waConfig.set(res.data);
        }
      },
      error: () => {}
    });
  }

  toggleWhatsAppModal(): void {
    this.showWaConfigModal.update(v => !v);
  }

  saveWaConfig(): void {
    this.apiService.saveWhatsAppConfig(this.waConfig()).subscribe({
      next: () => {
        this.showWaConfigModal.set(false);
        this.toastMessage.set('WhatsApp settings saved successfully.');
        setTimeout(() => this.toastMessage.set(null), 4000);
        this.loadWaConfig();
      },
      error: (err) => {
        this.errorMessage.set('Failed to save settings.');
      }
    });
  }

  disconnectWhatsApp(): void {
    if (confirm('Are you sure you want to clear your WhatsApp configuration?')) {
      const emptyConfig = {
        metaAccessToken: '',
        metaPhoneNumberId: '',
        metaBusinessId: '',
        businessName: '',
        senderNumber: ''
      };
      this.apiService.saveWhatsAppConfig(emptyConfig).subscribe({
        next: () => {
          this.loadWaConfig();
          this.toastMessage.set('WhatsApp configuration cleared.');
          setTimeout(() => this.toastMessage.set(null), 4000);
        }
      });
    }
  }

  get subTotal(): number {
    return this.cart().reduce((sum, item) => sum + (item.quantity * item.mrp), 0);
  }

  get gstTotal(): number {
    return this.cart().reduce((sum, item) => sum + (item.quantity * item.mrp * (item.gstPercent / 100)), 0);
  }

  get grandTotal(): number {
    const rawTotal = this.subTotal + this.gstTotal - this.discountAmount;
    return rawTotal > 0 ? rawTotal : 0;
  }

  getMedicineStock(medicineId: string): number {
    return this.inventory()
      .filter(b => b.medicine._id === medicineId)
      .reduce((sum, b) => sum + b.quantity, 0);
  }

  onMedicineSelect(): void {
    this.itemQty = 1;
  }

  addToCart(): void {
    if (!this.selectedMedicineId || this.selectedMedicineId === 'null') return;
    this.errorMessage.set(null);

    const medicine = this.medicines().find(m => m._id === this.selectedMedicineId);
    if (!medicine) return;

    const available = this.getMedicineStock(this.selectedMedicineId);
    const activeBatch = this.inventory().find(b => b.medicine._id === this.selectedMedicineId);
    if (!activeBatch) {
      this.errorMessage.set(`No active stock batches found for ${medicine.name}`);
      return;
    }

    if (available < this.itemQty) {
      this.errorMessage.set(`Insufficient stock. Available: ${available}, Requested: ${this.itemQty}`);
      return;
    }

    const existingIndex = this.cart().findIndex(item => item.medicineId === this.selectedMedicineId);
    
    if (existingIndex > -1) {
      const currentQty = this.cart()[existingIndex].quantity;
      if (available < currentQty + this.itemQty) {
        this.errorMessage.set(`Cannot add more. Total in cart (${currentQty + this.itemQty}) exceeds stock (${available}).`);
        return;
      }
      this.cart.update(c => {
        c[existingIndex].quantity += this.itemQty;
        return [...c];
      });
    } else {
      const newItem: CartItem = {
        medicineId: this.selectedMedicineId,
        name: medicine.name,
        strength: medicine.strength,
        category: medicine.category,
        mrp: activeBatch.mrp,
        gstPercent: activeBatch.gstPercent || 0,
        quantity: this.itemQty,
        availableStock: available
      };
      this.cart.update(c => [...c, newItem]);
    }

    this.selectedMedicineId = null;
    this.medicineSearchQuery = '';
    this.isMedicineDropdownOpen = false;
    this.itemQty = 1;
  }

  updateQty(item: CartItem, delta: number): void {
    const newQty = item.quantity + delta;
    if (newQty < 1) return;
    if (item.availableStock < newQty) {
      this.errorMessage.set(`Cannot add more. Reached maximum available stock of ${item.availableStock} for ${item.name}`);
      return;
    }
    this.errorMessage.set(null);

    this.cart.update(c => {
      const idx = c.findIndex(i => i.medicineId === item.medicineId);
      if (idx > -1) c[idx].quantity = newQty;
      return [...c];
    });
  }

  removeFromCart(item: CartItem): void {
    this.cart.update(c => c.filter(i => i.medicineId !== item.medicineId));
  }

  clearCart(): void {
    this.cart.set([]);
    this.errorMessage.set(null);
  }

  // --- Prescription Photo Camera Methods ---
  async startCamera(): Promise<void> {
    try {
      this.errorMessage.set(null);
      this.isCameraActive.set(true);
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setTimeout(() => {
        if (this.rxVideoRef && this.rxVideoRef.nativeElement) {
          this.rxVideoRef.nativeElement.srcObject = this.mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error('Camera access error:', err);
      this.isCameraActive.set(false);
      this.errorMessage.set('Could not access tablet/web camera. Please check permissions or upload an image file.');
    }
  }

  capturePhoto(): void {
    if (!this.rxVideoRef || !this.rxVideoRef.nativeElement) return;
    const video = this.rxVideoRef.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      this.prescriptionImage.set(dataUrl);
    }
    this.stopCamera();
  }

  stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.isCameraActive.set(false);
  }

  onPrescriptionFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.prescriptionImage.set(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  removePrescription(): void {
    this.prescriptionImage.set(null);
    this.stopCamera();
  }

  processCheckout(): void {
    if (this.cart().length === 0) return;
    this.errorMessage.set(null);

    const checkoutItems = this.cart().map(item => ({
      medicineId: item.medicineId,
      quantity: item.quantity
    }));

    const payload = {
      customerName: this.customerName,
      customerPhone: this.customerPhone,
      items: checkoutItems,
      discountAmount: this.discountAmount,
      paymentMode: this.paymentMode,
      prescriptionImage: this.prescriptionImage() || undefined
    };

    this.apiService.createSale(payload).subscribe({
      next: (res) => {
        this.receiptData.set(res);
        this.loadData();
        this.toastMessage.set('Invoice generated successfully!');
        if (this.customerPhone) {
           setTimeout(() => this.toastMessage.set('💬 WhatsApp bill sent automatically!'), 2000);
        }
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Transaction failed.');
      }
    });
  }

  printReceipt(): void {
    window.print();
  }

  downloadPdf(saleId: string): void {
    this.apiService.downloadSalePdf(saleId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice-${saleId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Failed to download sale PDF', err)
    });
  }

  openDirectWhatsApp(): void {
    const receipt = this.receiptData();
    if (!receipt) return;
    
    const cleanPhone = this.customerPhone.replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    const pdfUrl = `http://localhost:5000/api/v1/invoices/${receipt.sale.invoiceNumber}/pdf`;
    const text = `Hello ${this.customerName || 'Customer'},\n\nYour invoice *#${receipt.sale.invoiceNumber}* from *${this.waConfig().businessName || 'MediLog Pharmacy'}* has been generated.\n\n*Bill Summary*:\n- Subtotal: INR ${receipt.sale.subTotal.toFixed(2)}\n- GST Taxes: INR ${receipt.sale.gstTotal.toFixed(2)}\n- Discount: INR ${receipt.sale.discountAmount.toFixed(2)}\n- Grand Total: *INR ${receipt.sale.totalAmount.toFixed(2)}*\n\n📄 *Download PDF Invoice:* ${pdfUrl}\n\nThank you!`;
    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }


  resetPOS(): void {
    this.receiptData.set(null);
    this.customerName = '';
    this.customerPhone = '';
    this.discountValue = 0;
    this.paymentMode = 'Cash';
    this.activeWaLink.set(null);
    this.removePrescription();
    this.clearCart();
  }
}
