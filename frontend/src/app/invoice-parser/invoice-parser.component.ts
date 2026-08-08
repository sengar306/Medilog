import { Component, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-invoice-parser',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="invoice-parser-container animate-fade-in">
      <div class="header-section">
        <div>
          <h1>AI Invoice Parsing Workbench</h1>
          <p>Upload a supplier invoice image or PDF. Gemini AI will scan it, extract structured details, match items to your database, and update inventory instantly upon review.</p>
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

      <!-- Upload Zone (Shown if not viewing/processing a result) -->
      @if (!jobId() && !processing() && !parsedResult()) {
        <div class="upload-zone glass-panel" 
             [class.drag-over]="dragOver()"
             (dragover)="onDragOver($event)"
             (dragleave)="onDragLeave($event)"
             (drop)="onDrop($event)"
             (click)="fileInput.click()">
          
          <input type="file" #fileInput (change)="onFileSelected($event)" style="display: none;" accept="image/*,application/pdf">
          
          <div class="upload-prompt">
            <i class="bi bi-cloud-arrow-up-fill upload-icon"></i>
            <h3>Drag & Drop Supplier Invoice</h3>
            <p>Supports JPEG, PNG images and PDF files</p>
            <button class="btn btn-primary mt-3">
              <i class="bi bi-folder2-open"></i> Browse Files
            </button>
          </div>
        </div>
      }

      <!-- Processing Status Screen -->
      @if (processing()) {
        <div class="glass-panel text-center py-5">
          <div class="spinner-container">
            <div class="scanner-laser"></div>
            <i class="bi bi-robot ai-logo-icon"></i>
          </div>
          <h2 class="mt-4 gradient-text">Gemini OCR Running</h2>
          <p class="text-secondary">Extracting supplier details, batch numbers, rates, and totals. Please wait...</p>
        </div>
      }

      <!-- Edit / Review Workbench (Shown when parse yields data successfully) -->
      @if (parsedResult() && !processing()) {
        <div class="workbench-layout">
          <!-- Sidebar: Invoice Details & Totals -->
          <div class="sidebar-column glass-panel">
            <div class="panel-header border-b">
              <h3>Invoice Details</h3>
              <button (click)="resetParser()" class="btn btn-glass btn-sm"><i class="bi bi-x-lg"></i> Cancel</button>
            </div>

            <!-- Warnings Alerts from Gemini -->
            @if (parsedResult().warnings && parsedResult().warnings.length > 0) {
              <div class="warning-box mt-3">
                <p class="warning-title"><i class="bi bi-exclamation-octagon-fill"></i> AI Notices</p>
                <ul>
                  @for (warn of parsedResult().warnings; track $index) {
                    <li>{{ warn }}</li>
                  }
                </ul>
              </div>
            }

            <form class="mt-3">
              <div class="form-group">
                <label class="form-label">Supplier Name</label>
                <input type="text" [(ngModel)]="parsedResult().supplier.name" name="supplierName" class="glass-input">
              </div>

              <div class="form-group">
                <label class="form-label">Supplier GSTIN</label>
                <input type="text" [(ngModel)]="parsedResult().supplier.gstNumber" name="supplierGst" class="glass-input">
              </div>

              <div class="row-flex">
                <div class="form-group w-50">
                  <label class="form-label">Invoice Number</label>
                  <input type="text" [(ngModel)]="parsedResult().invoice.invoiceNumber" name="invoiceNo" class="glass-input">
                </div>
                <div class="form-group w-50">
                  <label class="form-label">Invoice Date</label>
                  <input type="date" [(ngModel)]="parsedResult().invoice.invoiceDate" name="invoiceDate" class="glass-input">
                </div>
              </div>

              <div class="totals-section mt-4">
                <h4 class="border-b pb-2">Calculation Totals</h4>
                <div class="totals-row mt-2">
                  <span>Subtotal:</span>
                  <span>₹{{ parsedResult().totals.subTotal | number:'1.2-2' }}</span>
                </div>
                <div class="totals-row">
                  <span>GST Taxes:</span>
                  <span>₹{{ parsedResult().totals.gstTotal | number:'1.2-2' }}</span>
                </div>
                <div class="totals-row net-row mt-2">
                  <span>Net Payable:</span>
                  <span class="gradient-text">₹{{ parsedResult().totals.totalAmount | number:'1.2-2' }}</span>
                </div>
              </div>

              <div class="form-group mt-4">
                <label class="form-label">Remarks</label>
                <input type="text" [(ngModel)]="remarks" name="remarks" class="glass-input" placeholder="Import remarks...">
              </div>

              <button type="button" (click)="confirmImport()" class="btn btn-primary w-100 mt-4">
                <i class="bi bi-check-all"></i> Confirm & Import Stock
              </button>
            </form>
          </div>

          <!-- Main Area: Medicine Matching & Items Grid -->
          <div class="main-column glass-panel">
            <div class="panel-header">
              <h3>Scan Review & Medicine Database Matching</h3>
              <span class="badge badge-info">{{ parsedResult().items.length }} Scanned Items</span>
            </div>
            <p class="panel-subtitle mb-4">Validate extracted values. Match parsed names to existing Database Medicines to avoid duplicates.</p>

            <div class="glass-table-container">
              <table class="glass-table">
                <thead>
                  <tr>
                    <th style="width: 250px;">Scanned Item / Database Match</th>
                    <th>Batch</th>
                    <th>Expiry Date</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>MRP</th>
                    <th>GST %</th>
                    <th>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of parsedResult().items; track $index) {
                    <tr>
                      <!-- Matching dropdown cell -->
                      <td>
                        <div class="matching-cell">
                          <span class="scanned-name">Scanned: "{{ item.name }}"</span>
                          
                          <select [(ngModel)]="item.matchedMedicineId" 
                                  (change)="onMatchChanged(item)"
                                  class="glass-input glass-select select-match mt-1">
                            <option [value]="null">Register as [NEW MEDICINE]</option>
                            @for (med of dbMedicines(); track med._id) {
                              <option [value]="med._id">{{ med.name }} ({{ med.strength }})</option>
                            }
                          </select>
                          
                          @if (item.matchedMedicineId) {
                            <span class="badge badge-success text-xs mt-1"><i class="bi bi-link-45deg"></i> Database Matched</span>
                          } @else {
                            <span class="badge badge-warning text-xs mt-1"><i class="bi bi-plus-square"></i> Create New</span>
                          }
                        </div>
                      </td>

                      <td><input type="text" [(ngModel)]="item.batchNumber" class="table-input glass-input"></td>
                      <td><input type="date" [(ngModel)]="item.expiryDate" class="table-input glass-input" style="width: 120px;"></td>
                      <td><input type="number" [(ngModel)]="item.quantity" class="table-input glass-input" style="width: 70px;"></td>
                      <td><input type="number" [(ngModel)]="item.purchaseRate" class="table-input glass-input" style="width: 80px;"></td>
                      <td><input type="number" [(ngModel)]="item.mrp" class="table-input glass-input" style="width: 80px;"></td>
                      <td><input type="number" [(ngModel)]="item.gstPercent" class="table-input glass-input" style="width: 60px;"></td>
                      <td><strong>₹{{ (item.quantity * item.purchaseRate * (1 + item.gstPercent / 100)) | number:'1.2-2' }}</strong></td>
                    </tr>
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
    .invoice-parser-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .upload-zone {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 350px;
      border: 2px dashed var(--glass-border);
      cursor: pointer;
      text-align: center;
      transition: all 0.2s ease;
    }
    .upload-zone:hover, .upload-zone.drag-over {
      border-color: var(--primary);
      background: rgba(130, 87, 229, 0.05);
    }
    .upload-prompt {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .upload-icon {
      font-size: 4rem;
      color: var(--text-secondary);
      margin-bottom: 12px;
    }
    
    .spinner-container {
      position: relative;
      width: 80px;
      height: 80px;
      margin: 0 auto;
    }
    .ai-logo-icon {
      font-size: 4rem;
      color: var(--primary);
      display: block;
      animation: pulse 1.5s infinite ease-in-out;
    }
    .scanner-laser {
      position: absolute;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--primary);
      box-shadow: 0 0 12px var(--primary);
      animation: scan 2s infinite ease-in-out;
      z-index: 10;
    }
    @keyframes scan {
      0% { top: 0%; }
      50% { top: 100%; }
      100% { top: 0%; }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px var(--primary-glow)); }
      50% { transform: scale(1.1); filter: drop-shadow(0 0 20px var(--primary-glow)); }
    }
    
    .workbench-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 20px;
      align-items: start;
    }
    @media (max-width: 1100px) {
      .workbench-layout {
        grid-template-columns: 1fr;
      }
    }
    .border-b { border-bottom: 1px solid var(--glass-border); padding-bottom: 12px; }
    .pb-2 { padding-bottom: 8px; }
    .pb-4 { padding-bottom: 16px; }
    .mb-4 { margin-bottom: 16px; }
    
    .warning-box {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.15);
      border-radius: 8px;
      padding: 12px;
      font-size: 0.85rem;
      color: var(--warning);
    }
    .warning-title {
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .warning-box ul {
      padding-left: 18px;
    }
    
    .totals-section {
      background: rgba(0,0,0,0.15);
      border: 1px solid var(--glass-border);
      border-radius: 8px;
      padding: 16px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }
    .net-row {
      font-weight: 700;
      font-size: 1.1rem;
      color: var(--text-primary);
      border-top: 1px dashed var(--glass-border);
      padding-top: 8px;
    }
    
    .panel-subtitle {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    
    .matching-cell {
      display: flex;
      flex-direction: column;
    }
    .scanned-name {
      font-size: 0.8rem;
      color: var(--text-secondary);
      font-style: italic;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      max-width: 220px;
    }
    .select-match {
      font-size: 0.85rem;
      padding: 6px 12px;
    }
    .table-input {
      font-size: 0.85rem;
      padding: 6px 10px;
      text-align: center;
    }
    .text-xs { font-size: 0.65rem; }
    .w-50 { width: 50%; }
    .w-100 { width: 100%; }
    .row-flex { display: flex; gap: 10px; }
    .py-5 { padding-top: 3rem; padding-bottom: 3rem; }
    .mt-4 { margin-top: 16px; }
    .mt-3 { margin-top: 12px; }
    .mt-2 { margin-top: 8px; }
    .mt-1 { margin-top: 4px; }
    
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
export class InvoiceParserComponent implements OnDestroy {
  private apiService = inject(ApiService);
  private router = inject(Router);

  dragOver = signal(false);
  processing = signal(false);
  jobId = signal<string | null>(null);
  
  parsedResult = signal<any | null>(null);
  dbMedicines = signal<any[]>([]);
  
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  remarks = '';

  private pollInterval: any = null;

  ngOnDestroy(): void {
    this.clearPolling();
  }

  // --- Drag & Drop Handlers ---
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      this.uploadFile(e.dataTransfer.files[0]);
    }
  }

  onFileSelected(e: any): void {
    if (e.target.files && e.target.files.length > 0) {
      this.uploadFile(e.target.files[0]);
    }
  }

  // --- Upload & Polling Workflow ---
  uploadFile(file: File): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.processing.set(true);

    this.apiService.uploadInvoice(file).subscribe({
      next: (res) => {
        this.jobId.set(res.jobId);
        this.startPolling(res.jobId);
      },
      error: (err) => {
        this.processing.set(false);
        this.errorMessage.set(err.error?.message || 'Invoice upload failed.');
      }
    });
  }

  startPolling(jobId: string): void {
    this.clearPolling();
    
    // Load medicines in parallel so matching select is pre-populated
    this.apiService.getMedicines().subscribe({
      next: (data) => this.dbMedicines.set(data),
      error: (err) => console.error(err)
    });

    this.pollInterval = setInterval(() => {
      this.apiService.getParserResult(jobId).subscribe({
        next: (res) => {
          if (res.status === 'Success') {
            this.clearPolling();
            this.parsedResult.set(res.parsedData);
            this.processing.set(false);
            this.successMessage.set('AI scan completed successfully! Please review details below.');
          } else if (res.status === 'Failed') {
            this.clearPolling();
            this.processing.set(false);
            this.errorMessage.set(`Gemini scan failed: ${res.error || 'Parsing error'}`);
          }
        },
        error: (err) => {
          this.clearPolling();
          this.processing.set(false);
          this.errorMessage.set('Connection error polling scan status.');
        }
      });
    }, 1500);
  }

  clearPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // --- Matching Changes ---
  onMatchChanged(item: any): void {
    const match = this.dbMedicines().find(m => m._id === item.matchedMedicineId);
    if (match) {
      item.matchedMedicineName = match.name;
    } else {
      item.matchedMedicineName = null;
    }
  }

  resetParser(): void {
    this.jobId.set(null);
    this.parsedResult.set(null);
    this.processing.set(false);
    this.remarks = '';
    this.clearPolling();
  }

  // --- Confirm Import ---
  confirmImport(): void {
    if (!this.parsedResult()) return;
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = {
      supplier: this.parsedResult().supplier,
      invoice: this.parsedResult().invoice,
      items: this.parsedResult().items,
      remarks: this.remarks || 'Imported via AI OCR workbench'
    };

    this.apiService.confirmInvoiceImport(payload).subscribe({
      next: () => {
        this.successMessage.set('Inventory updated successfully from AI Scan!');
        setTimeout(() => {
          this.router.navigate(['/purchases']);
        }, 1500);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to import stock from invoice.');
      }
    });
  }
}
