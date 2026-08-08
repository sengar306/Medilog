import { Component, inject, OnInit, signal } from '@angular/core';
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
                          <span class="badge badge-success"><i class="bi bi-geo-alt"></i> {{ med.rack.name }}</span>
                        } @else {
                          <span class="text-muted">Unassigned</span>
                        }
                      </td>
                      <td>{{ med.minStockLevel }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="text-center text-muted">No medicines registered yet. Use the registration form to add one.</td>
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
  `]
})
export class MedicineComponent implements OnInit {
  private apiService = inject(ApiService);

  activeTab = signal<'medicines' | 'racks'>('medicines');
  
  medicines = signal<any[]>([]);
  racks = signal<any[]>([]);
  
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

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
    this.loadData();
  }

  loadData(): void {
    this.apiService.getMedicines().subscribe({
      next: (data) => this.medicines.set(data),
      error: (err) => console.error(err)
    });

    this.apiService.getRacks().subscribe({
      next: (data) => this.racks.set(data),
      error: (err) => console.error(err)
    });
  }

  clearAlerts(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
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
