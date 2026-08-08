import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-prescriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rx-container animate-fade-in">
      <div class="page-header">
        <div>
          <h1 class="gradient-text">💊 Prescription Management</h1>
          <p class="sub-title">Track & archive doctor prescriptions linked to sales</p>
        </div>
        <button class="btn btn-primary-glass" (click)="openCreateModal()" id="btn-new-rx">
          <i class="bi bi-plus-lg"></i> New Prescription
        </button>
      </div>

      <!-- Filters -->
      <div class="glass-panel filter-bar">
        <input type="text" class="form-control search-input" placeholder="🔍 Search by patient, doctor..." [(ngModel)]="searchQuery" (input)="loadPrescriptions()" id="rx-search" />
        <select class="form-control" [(ngModel)]="statusFilter" (change)="loadPrescriptions()" id="rx-status-filter">
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Dispensed">Dispensed</option>
          <option value="Partial">Partial</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <input type="date" class="form-control" [(ngModel)]="fromDate" (change)="loadPrescriptions()" id="rx-from-date" />
        <input type="date" class="form-control" [(ngModel)]="toDate" (change)="loadPrescriptions()" id="rx-to-date" />
      </div>

      <!-- Prescriptions Table -->
      <div class="glass-panel">
        <div class="panel-header">
          <h3><i class="bi bi-file-earmark-medical-fill"></i> Prescriptions ({{ prescriptions().length }})</h3>
        </div>

        @if (loading()) {
          <div class="loading-state"><div class="spinner"></div><p>Loading prescriptions...</p></div>
        } @else {
          <div class="glass-table-container">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Clinic</th>
                  <th>Medicines Rx'd</th>
                  <th>Status</th>
                  <th>Dispensed By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (rx of prescriptions(); track rx._id) {
                  <tr>
                    <td>{{ rx.prescriptionDate | date:'dd MMM yy' }}</td>
                    <td>
                      <strong>{{ rx.patientName }}</strong>
                      @if (rx.patientAge) { <span class="text-muted"> ({{ rx.patientAge }}y)</span> }
                      @if (rx.customer) { <br><small class="text-info">{{ rx.customer.phone }}</small> }
                    </td>
                    <td>
                      <span>Dr. {{ rx.doctorName }}</span>
                      @if (rx.doctorRegistrationNo) { <br><small class="text-muted">Reg: {{ rx.doctorRegistrationNo }}</small> }
                    </td>
                    <td>{{ rx.clinicName || '—' }}</td>
                    <td>
                      @if (rx.medicines?.length > 0) {
                        <div class="med-tags">
                          @for (m of rx.medicines.slice(0, 2); track $index) {
                            <span class="med-tag">{{ m.name }}</span>
                          }
                          @if (rx.medicines.length > 2) {
                            <span class="med-tag more">+{{ rx.medicines.length - 2 }}</span>
                          }
                        </div>
                      } @else { <span class="text-muted">—</span> }
                    </td>
                    <td><span class="badge" [ngClass]="getStatusBadge(rx.status)">{{ rx.status }}</span></td>
                    <td><code>{{ rx.dispensedBy?.username || '—' }}</code></td>
                    <td>
                      <div class="action-btns">
                        <button class="btn-action" (click)="viewRx(rx)" title="View Details">
                          <i class="bi bi-eye-fill"></i>
                        </button>
                        <button class="btn-action success" (click)="markDispensed(rx)" title="Mark Dispensed" [disabled]="rx.status === 'Dispensed'">
                          <i class="bi bi-check-circle-fill"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="8" class="empty-row">
                    <i class="bi bi-file-earmark-medical"></i>
                    <p>No prescriptions found</p>
                  </td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Create Prescription Modal -->
      @if (showCreateModal) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-panel glass-panel" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3><i class="bi bi-plus-circle-fill" style="color: #8257e5;"></i> New Prescription</h3>
              <button class="btn-icon" (click)="closeModal()"><i class="bi bi-x-lg"></i></button>
            </div>

            <div class="modal-body">
              <!-- Patient Info -->
              <div class="form-section">
                <h4 class="section-title">🧑 Patient Information</h4>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Patient Name *</label>
                    <input type="text" class="form-control" [(ngModel)]="form.patientName" placeholder="Full name" id="rx-patient-name" />
                  </div>
                  <div class="form-group">
                    <label>Phone (links to customer)</label>
                    <input type="tel" class="form-control" [(ngModel)]="form.customerPhone" placeholder="10-digit number" id="rx-customer-phone" />
                  </div>
                  <div class="form-group">
                    <label>Age</label>
                    <input type="number" class="form-control" [(ngModel)]="form.patientAge" placeholder="Years" id="rx-patient-age" />
                  </div>
                  <div class="form-group">
                    <label>Gender</label>
                    <select class="form-control" [(ngModel)]="form.patientGender" id="rx-patient-gender">
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Doctor Info -->
              <div class="form-section">
                <h4 class="section-title">🩺 Doctor Information</h4>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Doctor Name *</label>
                    <input type="text" class="form-control" [(ngModel)]="form.doctorName" placeholder="Dr. Full Name" id="rx-doctor-name" />
                  </div>
                  <div class="form-group">
                    <label>Registration No.</label>
                    <input type="text" class="form-control" [(ngModel)]="form.doctorRegistrationNo" placeholder="MCI number" id="rx-doctor-reg" />
                  </div>
                  <div class="form-group">
                    <label>Clinic / Hospital</label>
                    <input type="text" class="form-control" [(ngModel)]="form.clinicName" placeholder="Clinic name" id="rx-clinic" />
                  </div>
                  <div class="form-group">
                    <label>Prescription Date</label>
                    <input type="date" class="form-control" [(ngModel)]="form.prescriptionDate" id="rx-date" />
                  </div>
                </div>
              </div>

              <!-- Prescribed Medicines -->
              <div class="form-section">
                <div class="section-title-row">
                  <h4 class="section-title">💊 Prescribed Medicines</h4>
                  <button class="btn-add-med" (click)="addMedicineRow()"><i class="bi bi-plus"></i> Add</button>
                </div>
                @for (med of form.medicines; track $index; let i = $index) {
                  <div class="med-row">
                    <input type="text" class="form-control" [(ngModel)]="med.name" placeholder="Medicine name" [id]="'rx-med-' + i" />
                    <input type="text" class="form-control" [(ngModel)]="med.dosage" placeholder="Dosage (e.g. 500mg BD)" [id]="'rx-dosage-' + i" />
                    <input type="text" class="form-control" [(ngModel)]="med.duration" placeholder="Duration (e.g. 5 days)" [id]="'rx-duration-' + i" />
                    <button class="btn-remove" (click)="removeMedicineRow(i)"><i class="bi bi-trash-fill"></i></button>
                  </div>
                }
              </div>

              <!-- Diagnosis & Notes -->
              <div class="form-section">
                <div class="form-grid">
                  <div class="form-group">
                    <label>Diagnosis</label>
                    <input type="text" class="form-control" [(ngModel)]="form.diagnosis" placeholder="e.g. Viral fever, Hypertension" id="rx-diagnosis" />
                  </div>
                  <div class="form-group">
                    <label>Notes</label>
                    <input type="text" class="form-control" [(ngModel)]="form.notes" placeholder="Additional notes" id="rx-notes" />
                  </div>
                </div>
              </div>

              <!-- Image Upload -->
              <div class="form-section">
                <h4 class="section-title">📷 Upload Prescription Image (optional)</h4>
                <input type="file" class="form-control" (change)="onFileChange($event)" accept=".jpg,.jpeg,.png,.pdf" id="rx-image-upload" />
                @if (imagePreview) {
                  <img [src]="imagePreview" class="rx-preview" alt="Prescription preview" />
                }
              </div>
            </div>

            <div class="modal-footer">
              @if (saveError) { <p class="error-msg">{{ saveError }}</p> }
              <button class="btn btn-glass" (click)="closeModal()">Cancel</button>
              <button class="btn btn-primary-glass" (click)="savePrescription()" [disabled]="saving()">
                @if (saving()) { <span class="spinner-sm"></span> Saving... }
                @else { <i class="bi bi-check-lg"></i> Save Prescription }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- View Prescription Modal -->
      @if (viewingRx()) {
        <div class="modal-overlay" (click)="viewingRx.set(null)">
          <div class="modal-panel glass-panel" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3><i class="bi bi-file-earmark-medical-fill" style="color: #8257e5;"></i> Prescription Details</h3>
              <button class="btn-icon" (click)="viewingRx.set(null)"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="modal-body rx-details">
              <div class="rx-detail-grid">
                <div class="detail-row"><span>Patient</span><strong>{{ viewingRx()?.patientName }} ({{ viewingRx()?.patientAge || '?' }}y, {{ viewingRx()?.patientGender || '—' }})</strong></div>
                <div class="detail-row"><span>Doctor</span><strong>Dr. {{ viewingRx()?.doctorName }}</strong></div>
                <div class="detail-row"><span>Reg No.</span><strong>{{ viewingRx()?.doctorRegistrationNo || '—' }}</strong></div>
                <div class="detail-row"><span>Clinic</span><strong>{{ viewingRx()?.clinicName || '—' }}</strong></div>
                <div class="detail-row"><span>Date</span><strong>{{ viewingRx()?.prescriptionDate | date:'dd MMM yyyy' }}</strong></div>
                <div class="detail-row"><span>Diagnosis</span><strong>{{ viewingRx()?.diagnosis || '—' }}</strong></div>
                <div class="detail-row"><span>Status</span><span class="badge" [ngClass]="getStatusBadge(viewingRx()?.status)">{{ viewingRx()?.status }}</span></div>
                @if (viewingRx()?.sale) {
                  <div class="detail-row"><span>Linked Invoice</span><code>{{ viewingRx()?.sale?.invoiceNumber }}</code></div>
                }
              </div>

              @if (viewingRx()?.medicines?.length > 0) {
                <div class="rx-med-list">
                  <h4>Prescribed Medicines</h4>
                  @for (m of viewingRx()?.medicines; track $index) {
                    <div class="rx-med-item">
                      <i class="bi bi-capsule" style="color: #8257e5;"></i>
                      <div>
                        <strong>{{ m.name }}</strong>
                        <span class="text-muted"> · {{ m.dosage }} · {{ m.duration }}</span>
                      </div>
                    </div>
                  }
                </div>
              }

              @if (viewingRx()?.imageUrl) {
                <div class="rx-image-section">
                  <h4>Prescription Image</h4>
                  <img [src]="'http://localhost:5000' + viewingRx()?.imageUrl" class="rx-view-img" alt="Prescription" />
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .rx-container { display: flex; flex-direction: column; gap: 20px; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; }
    h1 { font-size: 1.8rem; margin-bottom: 4px; }
    .sub-title { color: var(--text-secondary); font-size: 0.9rem; }
    .btn-primary-glass {
      padding: 10px 18px; border-radius: 10px; border: 1px solid rgba(130,87,229,0.4);
      background: rgba(130,87,229,0.15); color: #a855f7; font-weight: 600; cursor: pointer;
      display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.9rem;
    }
    .filter-bar { display: flex; gap: 12px; align-items: center; padding: 14px 20px; flex-wrap: wrap; }
    .search-input { flex-grow: 1; min-width: 200px; }
    .form-control {
      background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);
      border-radius: 8px; color: var(--text-primary); padding: 8px 12px; font-size: 0.9rem;
    }
    select.form-control option { background: #1a1625; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; color: var(--text-secondary); }
    .spinner { width: 32px; height: 32px; border: 3px solid rgba(130,87,229,0.15); border-top-color: #8257e5; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .text-muted { color: var(--text-muted); font-size: 0.8rem; }
    .text-info { color: #0ea5e9; font-size: 0.78rem; }
    .med-tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .med-tag { padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; background: rgba(130,87,229,0.15); color: #a855f7; font-weight: 600; }
    .med-tag.more { background: rgba(255,255,255,0.06); color: var(--text-secondary); }
    .action-btns { display: flex; gap: 6px; }
    .btn-action {
      width: 30px; height: 30px; border-radius: 7px; border: 1px solid var(--glass-border);
      background: rgba(255,255,255,0.04); color: var(--text-secondary); cursor: pointer;
      display: flex; align-items: center; justify-content: center; font-size: 0.85rem; transition: all 0.15s;
    }
    .btn-action:hover { color: var(--text-primary); border-color: rgba(255,255,255,0.15); }
    .btn-action.success:hover { color: #10b981; border-color: rgba(16,185,129,0.4); }
    .btn-action:disabled { opacity: 0.3; cursor: not-allowed; }
    .empty-row { text-align: center; padding: 40px; color: var(--text-muted); }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;
    }
    .modal-panel {
      width: 100%; max-width: 760px; max-height: 90vh; display: flex; flex-direction: column;
      border-radius: 20px; overflow: hidden; animation: modalIn 0.25s ease;
    }
    @keyframes modalIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px 16px; border-bottom: 1px solid var(--glass-border);
    }
    .modal-header h3 { font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .modal-body { flex-grow: 1; overflow-y: auto; padding: 20px 24px; }
    .modal-footer { padding: 16px 24px; border-top: 1px solid var(--glass-border); display: flex; align-items: center; gap: 12px; justify-content: flex-end; }
    .btn-icon { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1rem; padding: 4px; border-radius: 6px; }
    .btn-icon:hover { color: var(--text-primary); }

    .form-section { margin-bottom: 20px; }
    .section-title { font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .section-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 0.78rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.4px; }
    .med-row { display: grid; grid-template-columns: 2fr 2fr 1.5fr auto; gap: 8px; margin-bottom: 8px; align-items: center; }
    .btn-add-med { padding: 6px 12px; border-radius: 7px; border: 1px solid rgba(130,87,229,0.3); background: rgba(130,87,229,0.1); color: #a855f7; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 4px; }
    .btn-remove { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #ef4444; border-radius: 7px; padding: 8px 10px; cursor: pointer; }
    .rx-preview { max-height: 150px; border-radius: 8px; margin-top: 8px; border: 1px solid var(--glass-border); }
    .error-msg { color: #ef4444; font-size: 0.85rem; flex-grow: 1; }
    .spinner-sm { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; margin-right: 4px; }

    /* View Rx */
    .rx-details { display: flex; flex-direction: column; gap: 16px; }
    .rx-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .detail-row { display: flex; flex-direction: column; gap: 4px; }
    .detail-row span:first-child { font-size: 0.72rem; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.4px; }
    .rx-med-list h4 { font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 10px; }
    .rx-med-item { display: flex; gap: 10px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .rx-image-section h4 { font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 8px; }
    .rx-view-img { max-width: 100%; border-radius: 10px; border: 1px solid var(--glass-border); }
  `]
})
export class PrescriptionComponent implements OnInit {
  private apiService = inject(ApiService);

  prescriptions = signal<any[]>([]);
  loading = signal(false);
  saving = signal(false);
  viewingRx = signal<any>(null);

  showCreateModal = false;
  searchQuery = '';
  statusFilter = '';
  fromDate = '';
  toDate = '';
  saveError = '';
  imageFile: File | null = null;
  imagePreview: string | null = null;

  form: any = { patientName: '', patientAge: null, patientGender: '', doctorName: '', doctorRegistrationNo: '', clinicName: '', prescriptionDate: new Date().toISOString().split('T')[0], medicines: [{ name: '', dosage: '', duration: '' }], diagnosis: '', notes: '', customerPhone: '' };

  ngOnInit(): void { this.loadPrescriptions(); }

  loadPrescriptions(): void {
    this.loading.set(true);
    const filters: any = {};
    if (this.searchQuery) filters.search = this.searchQuery;
    if (this.statusFilter) filters.status = this.statusFilter;
    if (this.fromDate) filters.from = this.fromDate;
    if (this.toDate) filters.to = this.toDate;

    this.apiService.getPrescriptions(filters).subscribe({
      next: (d) => { this.prescriptions.set(d.prescriptions || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openCreateModal(): void {
    this.form = { patientName: '', patientAge: null, patientGender: '', doctorName: '', doctorRegistrationNo: '', clinicName: '', prescriptionDate: new Date().toISOString().split('T')[0], medicines: [{ name: '', dosage: '', duration: '' }], diagnosis: '', notes: '', customerPhone: '' };
    this.imageFile = null;
    this.imagePreview = null;
    this.saveError = '';
    this.showCreateModal = true;
  }

  closeModal(): void { this.showCreateModal = false; }

  addMedicineRow(): void { this.form.medicines.push({ name: '', dosage: '', duration: '' }); }

  removeMedicineRow(i: number): void { this.form.medicines.splice(i, 1); }

  onFileChange(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.imageFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => { this.imagePreview = e.target.result; };
      reader.readAsDataURL(file);
    }
  }

  savePrescription(): void {
    if (!this.form.patientName || !this.form.doctorName) {
      this.saveError = 'Patient name and Doctor name are required'; return;
    }
    this.saving.set(true);
    this.saveError = '';

    const fd = new FormData();
    Object.keys(this.form).forEach(k => {
      if (k === 'medicines') fd.append('medicines', JSON.stringify(this.form.medicines));
      else if (this.form[k] !== null && this.form[k] !== '') fd.append(k, this.form[k]);
    });
    if (this.imageFile) fd.append('prescriptionImage', this.imageFile);

    this.apiService.createPrescription(fd).subscribe({
      next: () => {
        this.saving.set(false);
        this.showCreateModal = false;
        this.loadPrescriptions();
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError = err.error?.message || 'Failed to save prescription';
      }
    });
  }

  viewRx(rx: any): void { this.viewingRx.set(rx); }

  markDispensed(rx: any): void {
    this.apiService.updatePrescription(rx._id, { status: 'Dispensed' }).subscribe({
      next: (updated) => {
        this.prescriptions.update(list => list.map(p => p._id === rx._id ? { ...p, status: 'Dispensed' } : p));
      }
    });
  }

  getStatusBadge(status: string): string {
    if (status === 'Dispensed') return 'badge-success';
    if (status === 'Pending') return 'badge-warning';
    if (status === 'Cancelled') return 'badge-danger';
    return 'badge-info';
  }
}
