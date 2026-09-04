import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-medicine',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="medicine-container animate-fade-in">
      <div class="header-section">
        <div>
          <h1>Medicine Master & Warehouse Racks</h1>
          <p>Register drugs and configure storage rack locations.</p>
        </div>
        <div class="tab-buttons btn-group">
          <button class="btn" [class.btn-primary]="activeTab() === 'medicines'" [class.btn-glass]="activeTab() !== 'medicines'" (click)="activeTab.set('medicines')">
            <i class="bi bi-capsule"></i> Medicines Master
          </button>
          <button class="btn" [class.btn-primary]="activeTab() === 'racks'" [class.btn-glass]="activeTab() !== 'racks'" (click)="activeTab.set('racks')">
            <i class="bi bi-layers"></i> Warehouse Racks
          </button>
        </div>
      </div>

      <!-- Messages -->
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

      <!-- Chemist Selector Bar for Admin -->
      @if (isAdmin()) {
        <div class="glass-panel mb-3" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <label class="form-label mb-0" style="white-space: nowrap; color: #38bdf8; font-weight: 600;"><i class="bi bi-shop"></i> Inspect Chemist Store:</label>
            <select [(ngModel)]="selectedUserId" (change)="onChemistChange()" class="glass-input glass-select" style="width: 220px; padding: 6px 12px;">
              <option value="all">🏬 All Chemists / Stores</option>
              @for (user of chemistUsers(); track user._id) {
                <option [value]="user._id">🏥 {{ user.chemistName || user.username }} ({{ user.username }})</option>
              }
            </select>
          </div>
        </div>
      }

      <div class="split-view">
        <!-- Main List Column -->
        <div class="list-column glass-panel">
          @if (activeTab() === 'medicines') {
            <div class="list-header">
              <h3>Registered Medicines Master</h3>
              <span class="badge badge-info">{{ medicines().length }} Total</span>
            </div>
            
            <div class="glass-table-container">
              <table class="glass-table">
                <thead>
                  <tr>
                    <th>Medicine Name</th>
                    <th>Code</th>
                    <th>Strength</th>
                    <th>Category</th>
                    <th>Generic Name</th>
                    <th>Rack Location</th>
                    <th>Min Level</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (med of medicines(); track med._id) {
                    <tr>
                      <td><strong>{{ med.name }}</strong></td>
                      <td><code>{{ med.code || 'N/A' }}</code></td>
                      <td>{{ med.strength || 'N/A' }}</td>
                      <td><span class="badge badge-info">{{ med.category || 'Tablet' }}</span></td>
                      <td><em>{{ med.genericName || 'N/A' }}</em></td>
                      <td>
                        @if (med.rack) {
                          <span class="badge badge-success" (click)="openMapRackModal(med)" style="cursor: pointer;" title="Click to change storage rack">
                            <i class="bi bi-geo-alt-fill"></i> {{ med.rack.name || med.rack }}
                          </span>
                        } @else {
                          <span class="badge" (click)="openMapRackModal(med)" style="cursor: pointer; background: rgba(255,255,255,0.04); color: var(--text-secondary); border: 1px solid var(--glass-border);" title="Click to assign storage rack">
                            Unassigned
                          </span>
                        }
                      </td>
                      <td>{{ med.minStockLevel }}</td>
                      <td>
                        <button (click)="openMapRackModal(med)" class="btn btn-sm btn-primary-glass" style="padding: 4px 10px; font-size: 0.8rem;" title="Map Storage Rack">
                          <i class="bi bi-geo-alt"></i> Map Rack
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="8" class="text-center text-muted">No medicines registered yet. Use the registration form to add one.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="list-header">
              <h3>Warehouse Racks Configuration</h3>
              <span class="badge badge-info">{{ racks().length }} Racks</span>
            </div>

            <div class="glass-table-container">
              <table class="glass-table">
                <thead>
                  <tr>
                    <th>Rack Name</th>
                    <th>Description</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  @for (rack of racks(); track rack._id) {
                    <tr>
                      <td><strong>{{ rack.name }}</strong></td>
                      <td>{{ rack.description || 'No description' }}</td>
                      <td>{{ rack.createdAt | date:'shortDate' }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="3" class="text-center text-muted">No warehouse racks configured yet. Use the form to configure one.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Form Column -->
        <div class="form-column glass-panel">
          @if (activeTab() === 'medicines') {
            <h3>Register New Medicine</h3>
            <form (ngSubmit)="handleAddMedicine()" class="mt-3">
              <div class="form-group">
                <label class="form-label">Medicine Name *</label>
                <input type="text" [(ngModel)]="medForm.name" name="name" class="glass-input" placeholder="e.g. Paracetamol" required>
              </div>

              <div class="form-group">
                <label class="form-label">Generic Name (Formula)</label>
                <input type="text" [(ngModel)]="medForm.genericName" name="genericName" class="glass-input" placeholder="e.g. Acetaminophen">
              </div>

              <div class="row-flex">
                <div class="form-group w-50">
                  <label class="form-label">Strength</label>
                  <input type="text" [(ngModel)]="medForm.strength" name="strength" class="glass-input" placeholder="e.g. 500mg, 10ml">
                </div>
                <div class="form-group w-50">
                  <label class="form-label">Category</label>
                  <select [(ngModel)]="medForm.category" name="category" class="glass-input glass-select">
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Ointment">Ointment</option>
                    <option value="Inhaler">Inhaler</option>
                  </select>
                </div>
              </div>

              <div class="row-flex">
                <div class="form-group w-50">
                  <label class="form-label">Rack Location</label>
                  <select [(ngModel)]="medForm.rackId" name="rackId" class="glass-input glass-select">
                    <option [value]="null">Select Rack...</option>
                    @for (rack of racks(); track rack._id) {
                      <option [value]="rack._id">{{ rack.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-group w-50">
                  <label class="form-label">Min Stock Level</label>
                  <input type="number" [(ngModel)]="medForm.minStockLevel" name="minStockLevel" class="glass-input" min="1">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Medicine Code / Barcode</label>
                <input type="text" [(ngModel)]="medForm.code" name="code" class="glass-input" placeholder="e.g. EAN code">
              </div>

              <button type="submit" class="btn btn-primary w-100 mt-2">
                <i class="bi bi-plus-circle"></i> Save Medicine
              </button>
            </form>
          } @else {
            <h3>Configure Storage Rack</h3>
            <form (ngSubmit)="handleAddRack()" class="mt-3">
              <div class="form-group">
                <label class="form-label">Rack Name *</label>
                <input type="text" [(ngModel)]="rackForm.name" name="name" class="glass-input" placeholder="e.g. Rack A, Shelf 2" required>
              </div>

              <div class="form-group">
                <label class="form-label">Description</label>
                <textarea [(ngModel)]="rackForm.description" name="description" class="glass-input" rows="4" placeholder="Storage area specifications..."></textarea>
              </div>

              <button type="submit" class="btn btn-primary w-100 mt-2">
                <i class="bi bi-plus-circle"></i> Save Rack
              </button>
            </form>
          }
        </div>
      </div>

      <!-- Map Storage Rack Modal -->
      @if (showMapRackModal()) {
        <div class="modal-overlay" (click)="closeMapRackModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--glass-border); padding-bottom: 12px;">
              <h3 style="margin: 0; display: flex; align-items: center; gap: 8px;">
                <i class="bi bi-geo-alt-fill" style="color: #38bdf8;"></i> Map Warehouse Storage Rack
              </h3>
              <button (click)="closeMapRackModal()" style="background: none; border: none; color: var(--text-secondary); font-size: 1.2rem; cursor: pointer;">✕</button>
            </div>

            <div class="mt-3">
              <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 16px;">
                Configure storage rack location for <strong style="color: #fff;">{{ targetMedicineForMapping()?.name }}</strong> 
                <span class="text-secondary" *ngIf="targetMedicineForMapping()?.strength"> ({{ targetMedicineForMapping()?.strength }})</span>.
              </p>

              <div class="form-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="form-label" style="margin-bottom: 0;">Select Storage Rack Location *</label>
                  <button (click)="toggleInlineRackCreation()" type="button" class="btn-link-sm" style="background: none; border: none; color: #38bdf8; font-size: 0.8rem; cursor: pointer; text-decoration: underline;">
                    {{ isAddingNewRack() ? 'Cancel' : '+ Add New Storage Rack' }}
                  </button>
                </div>

                @if (!isAddingNewRack()) {
                  <select [(ngModel)]="selectedRackForMapping" class="glass-input glass-select" style="font-size: 0.95rem; padding: 10px 16px;">
                    <option value="null">-- Unassigned (No Rack Assigned) --</option>
                    @for (rack of racks(); track rack._id) {
                      <option [value]="rack._id">📍 {{ rack.name }} {{ rack.description ? '(' + rack.description + ')' : '' }}</option>
                    }
                  </select>
                } @else {
                  <!-- Inline New Rack Form -->
                  <div class="inline-rack-form" style="background: rgba(0,0,0,0.3); border: 1px dashed rgba(56, 189, 248, 0.4); padding: 12px; border-radius: 8px;">
                    <input type="text" [(ngModel)]="newRackName" placeholder="New Rack Name (e.g. Rack A1, Shelf 3)" class="glass-input mb-2" style="font-size: 0.88rem;">
                    <input type="text" [(ngModel)]="newRackDescription" placeholder="Description (Optional)" class="glass-input mb-2" style="font-size: 0.88rem;">
                    <button (click)="saveInlineRack()" [disabled]="!newRackName.trim()" type="button" class="btn btn-sm btn-primary w-100">
                      <i class="bi bi-plus-circle-fill"></i> Create & Select Rack
                    </button>
                  </div>
                }
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;">
                <button (click)="closeMapRackModal()" type="button" class="btn btn-glass">Cancel</button>
                <button (click)="saveRackMapping()" type="button" class="btn btn-primary">
                  <i class="bi bi-check-circle-fill"></i> Save Mapping
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .medicine-container {
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
    .btn-group {
      display: flex;
      gap: 8px;
    }
    .split-view {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
    }
    @media (max-width: 992px) {
      .split-view {
        grid-template-columns: 1fr;
      }
    }
    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .row-flex {
      display: flex;
      gap: 12px;
    }
    .w-50 { width: 50%; }
    .w-100 { width: 100%; }
    .mt-3 { margin-top: 16px; }
    .mt-2 { margin-top: 8px; }
    .mb-2 { margin-bottom: 8px; }
    .ml-1 { margin-left: 4px; }
    
    .alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
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
    .btn-primary-glass {
      background: rgba(37, 99, 235, 0.15);
      border: 1px solid rgba(37, 99, 235, 0.3);
      color: #60a5fa;
    }
    .btn-primary-glass:hover {
      background: rgba(37, 99, 235, 0.3);
      color: #fff;
    }
  `]
})
export class MedicineComponent implements OnInit {
  private apiService = inject(ApiService);

  activeTab = signal<'medicines' | 'racks'>('medicines');
  
  medicines = signal<any[]>([]);
  racks = signal<any[]>([]);
  chemistUsers = signal<any[]>([]);
  selectedUserId = 'all';

  isAdmin = computed(() => {
    const user = this.apiService.currentUser();
    if (!user) return false;
    const rName = typeof user.role === 'string' ? user.role : (user.role?.name || '');
    return rName === 'Admin' || rName === 'Super Admin';
  });

  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Map Rack Modal State
  showMapRackModal = signal<boolean>(false);
  targetMedicineForMapping = signal<any>(null);
  selectedRackForMapping: string = 'null';
  isAddingNewRack = signal<boolean>(false);
  newRackName: string = '';
  newRackDescription: string = '';

  // Forms
  medForm = {
    name: '',
    genericName: '',
    strength: '',
    category: 'Tablet',
    rackId: null as string | null,
    minStockLevel: 10,
    code: ''
  };

  rackForm = {
    name: '',
    description: ''
  };

  ngOnInit(): void {
    if (this.isAdmin()) {
      this.apiService.getUsers().subscribe({
        next: (users) => this.chemistUsers.set(users.filter((u: any) => u.role?.name !== 'Admin')),
        error: (err) => console.error('Failed to load chemist users:', err)
      });
    }
    this.loadData();
  }

  loadData(): void {
    const userId = this.isAdmin() ? this.selectedUserId : undefined;

    this.apiService.getMedicines(userId).subscribe({
      next: (data) => this.medicines.set(data),
      error: (err) => console.error(err)
    });

    this.apiService.getRacks(userId).subscribe({
      next: (data) => this.racks.set(data),
      error: (err) => console.error(err)
    });
  }

  onChemistChange(): void {
    this.loadData();
  }

  clearAlerts(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  // --- Map Rack Modal Methods ---
  openMapRackModal(med: any): void {
    this.targetMedicineForMapping.set(med);
    this.selectedRackForMapping = med.rack ? (med.rack._id || med.rack) : 'null';
    this.isAddingNewRack.set(false);
    this.newRackName = '';
    this.newRackDescription = '';
    this.showMapRackModal.set(true);
  }

  closeMapRackModal(): void {
    this.showMapRackModal.set(false);
    this.targetMedicineForMapping.set(null);
    this.isAddingNewRack.set(false);
  }

  toggleInlineRackCreation(): void {
    this.isAddingNewRack.update(v => !v);
  }

  saveInlineRack(): void {
    if (!this.newRackName.trim()) return;
    this.clearAlerts();

    this.apiService.createRack({ name: this.newRackName.trim(), description: this.newRackDescription }).subscribe({
      next: (created) => {
        this.racks.update(list => [...list, created]);
        this.selectedRackForMapping = created._id;
        this.isAddingNewRack.set(false);
        this.newRackName = '';
        this.newRackDescription = '';
        this.successMessage.set(`New rack '${created.name}' created! Click 'Save Mapping' to assign to medicine.`);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to create rack');
      }
    });
  }

  saveRackMapping(): void {
    const med = this.targetMedicineForMapping();
    if (!med) return;
    this.clearAlerts();

    const newRackId = this.selectedRackForMapping === 'null' ? null : this.selectedRackForMapping;

    this.apiService.updateMedicine(med._id, { rackId: newRackId }).subscribe({
      next: (updated) => {
        const rackName = updated.rack ? updated.rack.name : 'Unassigned';
        this.successMessage.set(`Rack location for '${med.name}' successfully mapped to: ${rackName}`);
        this.closeMapRackModal();
        this.loadData();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to update rack mapping');
      }
    });
  }

  handleAddMedicine(): void {
    this.clearAlerts();
    
    // Clean rackId if unselected
    const payload = {
      ...this.medForm,
      rackId: this.medForm.rackId === 'null' ? null : this.medForm.rackId
    };

    this.apiService.createMedicine(payload).subscribe({
      next: (res) => {
        this.successMessage.set(`Medicine '${res.name}' registered successfully!`);
        this.loadData();
        // Reset form
        this.medForm = {
          name: '',
          genericName: '',
          strength: '',
          category: 'Tablet',
          rackId: null,
          minStockLevel: 10,
          code: ''
        };
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to register medicine');
      }
    });
  }

  handleAddRack(): void {
    this.clearAlerts();

    this.apiService.createRack(this.rackForm).subscribe({
      next: (res) => {
        this.successMessage.set(`Warehouse Rack '${res.name}' created successfully!`);
        this.loadData();
        // Reset form
        this.rackForm = {
          name: '',
          description: ''
        };
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to create warehouse rack');
      }
    });
  }
}
