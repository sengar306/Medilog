import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api.service';
import { SideDrawerComponent } from '../core/components/side-drawer.component';

@Component({
  selector: 'app-stockist-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, SideDrawerComponent],
  template: `
    <div class="page-container">
      <!-- Top Title Header -->
      <div class="header-card glass-panel">
        <div class="header-info">
          <h2><i class="bi bi-box-seam-fill text-teal"></i> Stockist Wholesale Offers Catalog</h2>
          <p>Upload and manage medicine offers available for sale to registered chemists</p>
        </div>
        <button class="btn btn-primary" (click)="openAddModal()">
          <i class="bi bi-plus-lg"></i> Add Medicine for Sale
        </button>
      </div>

      <!-- Search & Filters -->
      <div class="filter-bar glass-panel mt-4">
        <div class="search-box">
          <i class="bi bi-search search-icon"></i>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            (ngModelChange)="filterCatalog()" 
            placeholder="Search medicine name, brand, or category..." 
            class="form-control"
          />
        </div>
        <div class="stats-pills">
          <span class="badge badge-info">Total Items: {{ filteredMedicines.length }}</span>
          <span class="badge badge-success">Available Stock: {{ totalStock }}</span>
        </div>
      </div>

      <!-- Medicine Grid / Table -->
      <div class="table-container glass-panel mt-4">
        @if (loading) {
          <div class="text-center p-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">Loading wholesale catalog...</p>
          </div>
        } @else {
          <table class="custom-table">
            <thead>
              <tr>
                <th>Product Image</th>
                <th>Medicine Name & Brand</th>
                <th>Category</th>
                <th>Pack Size</th>
                <th>Wholesale Rate</th>
                <th>MRP</th>
                <th>Available Stock</th>
                <th>Min Qty</th>
                <th>Expiry Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (med of filteredMedicines; track med._id) {
                <tr>
                  <td>
                    <div class="thumb-container">
                      <img [src]="med.imageUrl || getCategoryFallback(med.category)" alt="Medicine" class="prod-thumb" (error)="onImgError($event, med.category)" />
                    </div>
                  </td>
                  <td>
                    <div class="med-name-cell">
                      <span class="med-title">{{ med.name }}</span>
                      @if (med.brand) {
                        <span class="med-brand text-muted">By {{ med.brand }}</span>
                      }
                      @if (med.batchNumber) {
                        <span class="badge-sm badge-dark">Batch: {{ med.batchNumber }}</span>
                      }
                    </div>
                  </td>
                  <td><span class="badge badge-secondary">{{ med.category }}</span></td>
                  <td>{{ med.packSize || '10x10 Strips' }}</td>
                  <td class="wholesale-price">₹{{ med.wholesalePrice | number:'1.2-2' }}</td>
                  <td class="text-muted">₹{{ med.mrp | number:'1.2-2' }}</td>
                  <td>
                    <span class="stock-badge" [class.low]="med.stockQuantity < 50" [class.out]="med.stockQuantity <= 0">
                      {{ med.stockQuantity }} units
                    </span>
                  </td>
                  <td>{{ med.minOrderQty || 1 }}</td>
                  <td>{{ med.expiryDate ? (med.expiryDate | date:'MMM yyyy') : 'N/A' }}</td>
                  <td>
                    <div class="action-btn-group">
                      <button class="btn-icon-btn edit" (click)="openEditModal(med)" title="Edit Offer">
                        <i class="bi bi-pencil-square"></i>
                      </button>
                      <button class="btn-icon-btn delete" (click)="deleteMedicine(med)" title="Delete Offer">
                        <i class="bi bi-trash-fill"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="empty-cell">
                    <i class="bi bi-inbox fs-2 text-muted"></i>
                    <p class="mt-2">No medicines found in your wholesale catalog.</p>
                    <button class="btn btn-sm btn-outline-primary mt-1" (click)="openAddModal()">Add First Medicine</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Add/Edit Side Drawer -->
      <app-side-drawer
        [open]="showModal"
        [title]="isEditMode ? 'Edit Sale Offer' : 'Add Medicine for Sale'"
        [subtitle]="isEditMode ? 'Update wholesale pricing & available stock' : 'Publish medicine offer to Retail Chemists B2B marketplace'"
        width="560px"
        [primaryButtonText]="isEditMode ? 'Update Offer' : 'Publish Offer'"
        secondaryButtonText="Cancel"
        [submitLoading]="saving"
        (closed)="closeModal()"
        (submitted)="saveMedicine()">
        
        <form (ngSubmit)="saveMedicine()">
          <div class="form-group mb-3">
            <label class="form-label required">Medicine Name *</label>
            <input type="text" [(ngModel)]="formData.name" name="name" required class="form-control glass-input" placeholder="e.g. Paracetamol 650mg Extra" />
          </div>

          <div class="row-flex mt-3" style="display: flex; gap: 10px;">
            <div class="form-group w-50">
              <label class="form-label">Brand / Manufacturer</label>
              <input type="text" [(ngModel)]="formData.brand" name="brand" class="form-control glass-input" placeholder="e.g. Cipla / Sun Pharma" />
            </div>
            <div class="form-group w-50">
              <label class="form-label">Category</label>
              <select [(ngModel)]="formData.category" name="category" class="form-control glass-input glass-select">
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection</option>
                <option value="Ointment">Ointment</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div class="row-flex mt-3" style="display: flex; gap: 10px;">
            <div class="form-group w-50">
              <label class="form-label required">Wholesale Rate (₹) *</label>
              <input type="number" [(ngModel)]="formData.wholesalePrice" name="wholesalePrice" required class="form-control glass-input" placeholder="Selling price to chemist" />
            </div>
            <div class="form-group w-50">
              <label class="form-label required">MRP (₹) *</label>
              <input type="number" [(ngModel)]="formData.mrp" name="mrp" required class="form-control glass-input" placeholder="Maximum retail price" />
            </div>
          </div>

          <div class="row-flex mt-3" style="display: flex; gap: 10px;">
            <div class="form-group w-50">
              <label class="form-label required">Available Stock *</label>
              <input type="number" [(ngModel)]="formData.stockQuantity" name="stockQuantity" required class="form-control glass-input" placeholder="Units available" />
            </div>
            <div class="form-group w-50">
              <label class="form-label">Min Order Qty</label>
              <input type="number" [(ngModel)]="formData.minOrderQty" name="minOrderQty" class="form-control glass-input" placeholder="1" />
            </div>
          </div>

          <div class="form-group mt-3">
            <label class="form-label">Pack Size</label>
            <input type="text" [(ngModel)]="formData.packSize" name="packSize" class="form-control glass-input" placeholder="10x10 Strips" />
          </div>

          <div class="row-flex mt-3" style="display: flex; gap: 10px;">
            <div class="form-group w-50">
              <label class="form-label">Batch Number</label>
              <input type="text" [(ngModel)]="formData.batchNumber" name="batchNumber" class="form-control glass-input" placeholder="Batch / Lot #" />
            </div>
            <div class="form-group w-50">
              <label class="form-label">Expiry Date</label>
              <input type="date" [(ngModel)]="formData.expiryDate" name="expiryDate" class="form-control glass-input" />
            </div>
          </div>

          <div class="form-group mt-3">
            <label class="form-label">Product Image URL</label>
            <input type="text" [(ngModel)]="formData.imageUrl" name="imageUrl" class="form-control glass-input" placeholder="https://example.com/medicine-image.jpg" />
          </div>

          <div class="form-group mt-3">
            <label class="form-label">Description / Offer Details</label>
            <textarea [(ngModel)]="formData.description" name="description" class="form-control glass-input" rows="2" placeholder="Bulk offer notes, bonus schemes, etc."></textarea>
          </div>
        </form>
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
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-radius: 14px;
      gap: 16px;
    }
    .search-box {
      position: relative;
      flex-grow: 1;
      max-width: 450px;
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
    .stats-pills {
      display: flex;
      gap: 10px;
    }
    .table-container {
      border-radius: 16px;
      overflow: hidden;
      padding: 0;
    }
    .custom-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .custom-table th {
      background: rgba(15, 23, 42, 0.6);
      color: var(--text-secondary);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 14px 18px;
      border-bottom: 1px solid var(--glass-border);
    }
    .custom-table td {
      padding: 14px 18px;
      border-bottom: 1px solid var(--bg-muted);
      font-size: 0.9rem;
    }
    .med-name-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .med-title {
      font-weight: 600;
      color: var(--text-primary);
    }
    .wholesale-price {
      font-weight: 700;
      color: var(--success);
    }
    .stock-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.15);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .stock-badge.low {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border-color: rgba(245, 158, 11, 0.3);
    }
    .stock-badge.out {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.3);
    }
    .badge-sm {
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      width: fit-content;
    }
    .badge-dark {
      background: var(--bg-hover);
      color: var(--text-secondary);
    }
    .action-btn-group {
      display: flex;
      gap: 8px;
    }
    .btn-icon-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid var(--glass-border);
      background: var(--bg-hover);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .thumb-container {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      overflow: hidden;
      background: var(--bg-muted);
      border: 1px solid var(--glass-border);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .prod-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .btn-icon-btn.edit:hover {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
      border-color: rgba(59, 130, 246, 0.4);
    }
    .btn-icon-btn.delete:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.4);
    }
    .empty-cell {
      text-align: center;
      padding: 40px !important;
    }

    /* Modal Styling */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(6px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-card {
      width: 600px;
      max-width: 90vw;
      border-radius: 20px;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .modal-header h3 {
      font-size: 1.2rem;
      font-weight: 700;
      margin: 0;
    }
    .btn-close {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 1.2rem;
      cursor: pointer;
    }
    .form-row {
      display: flex;
      gap: 16px;
    }
    .col-12 { width: 100%; }
    .col-6 { width: 50%; }
    .col-4 { width: 33.33%; }
    .required::after {
      content: ' *';
      color: #ef4444;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
  `]
})
export class StockistCatalogComponent implements OnInit {
  private apiService = inject(ApiService);

  medicines: any[] = [];
  filteredMedicines: any[] = [];
  searchQuery: string = '';
  loading: boolean = true;
  saving: boolean = false;

  showModal: boolean = false;
  isEditMode: boolean = false;
  selectedId: string | null = null;

  formData: any = {
    name: '',
    brand: '',
    category: 'Tablet',
    packSize: '10x10 Strips',
    wholesalePrice: null,
    mrp: null,
    stockQuantity: null,
    minOrderQty: 1,
    batchNumber: '',
    expiryDate: '',
    description: ''
  };

  ngOnInit(): void {
    this.loadCatalog();
  }

  loadCatalog(): void {
    this.loading = true;
    this.apiService.getStockistCatalog().subscribe({
      next: (data) => {
        this.medicines = data || [];
        this.filterCatalog();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load catalog:', err);
        this.loading = false;
      }
    });
  }

  filterCatalog(): void {
    if (!this.searchQuery.trim()) {
      this.filteredMedicines = [...this.medicines];
      return;
    }
    const q = this.searchQuery.toLowerCase();
    this.filteredMedicines = this.medicines.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.brand && m.brand.toLowerCase().includes(q)) ||
      (m.category && m.category.toLowerCase().includes(q))
    );
  }

  get totalStock(): number {
    return this.filteredMedicines.reduce((sum, m) => sum + (m.stockQuantity || 0), 0);
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

  openAddModal(): void {
    this.isEditMode = false;
    this.selectedId = null;
    this.formData = {
      name: '',
      brand: '',
      category: 'Tablet',
      packSize: '10x10 Strips',
      wholesalePrice: null,
      mrp: null,
      stockQuantity: 100,
      minOrderQty: 1,
      batchNumber: '',
      expiryDate: '',
      description: '',
      imageUrl: ''
    };
    this.showModal = true;
  }

  openEditModal(med: any): void {
    this.isEditMode = true;
    this.selectedId = med._id;
    this.formData = {
      name: med.name,
      brand: med.brand || '',
      category: med.category || 'Tablet',
      packSize: med.packSize || '10x10 Strips',
      wholesalePrice: med.wholesalePrice,
      mrp: med.mrp,
      stockQuantity: med.stockQuantity,
      minOrderQty: med.minOrderQty || 1,
      batchNumber: med.batchNumber || '',
      expiryDate: med.expiryDate ? new Date(med.expiryDate).toISOString().split('T')[0] : '',
      description: med.description || '',
      imageUrl: med.imageUrl || ''
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveMedicine(): void {
    if (!this.formData.name || !this.formData.wholesalePrice || !this.formData.mrp) {
      alert('Please fill all required fields');
      return;
    }

    this.saving = true;
    if (this.isEditMode && this.selectedId) {
      this.apiService.updateStockistMedicine(this.selectedId, this.formData).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
          this.loadCatalog();
        },
        error: (err) => {
          this.saving = false;
          alert(err.error?.message || 'Failed to update medicine');
        }
      });
    } else {
      this.apiService.createStockistMedicine(this.formData).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
          this.loadCatalog();
        },
        error: (err) => {
          this.saving = false;
          alert(err.error?.message || 'Failed to add medicine');
        }
      });
    }
  }

  deleteMedicine(med: any): void {
    if (confirm(`Are you sure you want to delete "${med.name}" from your catalog?`)) {
      this.apiService.deleteStockistMedicine(med._id).subscribe({
        next: () => {
          this.loadCatalog();
        },
        error: (err) => {
          alert(err.error?.message || 'Failed to delete medicine');
        }
      });
    }
  }
}
