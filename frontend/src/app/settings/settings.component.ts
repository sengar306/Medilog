import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-container animate-fade-in">
      <div class="page-header">
        <div>
          <h1 class="gradient-text">⚙️ Store & Invoice Settings</h1>
          <p class="sub-title">Configure your pharmacy profile, custom logo, dynamic POS tax invoice header, and WhatsApp messaging integration.</p>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state"><div class="spinner"></div><p>Loading configuration settings...</p></div>
      } @else {
        <div class="settings-grid">
          <!-- Card 1: Chemist Store Branding & Logo Upload -->
          <div class="glass-panel">
            <div class="panel-header">
              <h3><i class="bi bi-shop-window"></i> Pharmacy Store Branding</h3>
            </div>
            <p class="panel-subtitle">Upload your official store logo and set your pharmacy store display name.</p>

            <div class="form-group mt-3">
              <label class="form-label">PHARMACY / STORE NAME *</label>
              <input type="text" [(ngModel)]="chemistName" name="chemistName" class="glass-input" placeholder="e.g. Medilog Care Pharmacy">
              <small class="form-text text-muted">Legal pharmacy name displayed on invoice headers, receipts, and WhatsApp bills.</small>
            </div>

            <div class="logo-upload-container mt-4">
              <label class="form-label">PHARMACY STORE LOGO</label>
              <div class="logo-preview-box">
                @if (logoPreviewUrl || logoUrl) {
                  <img [src]="logoPreviewUrl || getFullLogoUrl(logoUrl)" alt="Chemist Logo" class="logo-preview-img">
                } @else {
                  <div class="logo-placeholder">
                    <i class="bi bi-image" style="font-size: 2rem; color: #8257e5;"></i>
                    <p style="margin-top: 6px; font-size: 0.8rem; color: var(--text-muted);">No logo uploaded yet</p>
                  </div>
                }
              </div>

              <div class="logo-actions mt-3">
                <label class="btn-file-select">
                  <i class="bi bi-cloud-upload"></i> Select New Logo Image
                  <input type="file" (change)="onLogoFileSelected($event)" accept="image/*" style="display: none;">
                </label>
                @if (selectedLogoFile) {
                  <button type="button" (click)="uploadLogo()" [disabled]="uploadingLogo()" class="btn-upload-logo">
                    @if (uploadingLogo()) { Uploading... } @else { Save & Apply Logo }
                  </button>
                }
              </div>
              <small class="form-text text-muted mt-2">Recommended: PNG or JPG image, square resolution (e.g. 200x200px).</small>
            </div>
          </div>

          <!-- Card 2: WhatsApp Integration -->
          <div class="glass-panel">
            <div class="panel-header">
              <h3><i class="bi bi-whatsapp"></i> WhatsApp Cloud API Config</h3>
            </div>
            <p class="panel-subtitle">Credentials to upload invoice PDFs and auto-dispatch them to customer phone numbers.</p>

            <div class="form-group mt-3">
              <label class="form-label">META CLOUD ACCESS TOKEN</label>
              <input type="password" [(ngModel)]="waConfig.metaAccessToken" name="metaAccessToken" class="glass-input" placeholder="EAAG...">
              <small class="form-text text-muted">Permanent system user access token generated in Meta Console.</small>
            </div>

            <div class="form-group mt-3">
              <label class="form-label">META PHONE NUMBER ID</label>
              <input type="text" [(ngModel)]="waConfig.metaPhoneNumberId" name="metaPhoneNumberId" class="glass-input" placeholder="e.g. 1029384...">
              <small class="form-text text-muted">Sending Phone Number ID in your Meta developer dashboard.</small>
            </div>

            <div class="form-group mt-3">
              <label class="form-label">WHATSAPP BUSINESS ACCOUNT ID</label>
              <input type="text" [(ngModel)]="waConfig.metaBusinessId" name="metaBusinessId" class="glass-input" placeholder="e.g. 2279329...">
              <small class="form-text text-muted">Business account ID managing the API integration application.</small>
            </div>

            <div class="form-group mt-3">
              <label class="form-label">SENDER PHONE NUMBER</label>
              <input type="text" [(ngModel)]="waConfig.senderNumber" name="senderNumber" class="glass-input" placeholder="e.g. 919876543210">
              <small class="form-text text-muted">Verified sender phone number registered with WhatsApp Cloud API.</small>
            </div>
          </div>
        </div>

        <!-- Card 3: POS Tax Invoice Details & Terms (Full Width) -->
        <div class="glass-panel mt-4">
          <div class="panel-header">
            <h3><i class="bi bi-file-earmark-pdf-fill"></i> POS Bill & Tax Invoice Configuration</h3>
          </div>
          <p class="panel-subtitle">Customize legal headers, licensing info, GSTIN, and custom terms & conditions printed on all POS receipts and downloadable PDFs.</p>

          <div class="form-grid-3 mt-3">
            <div class="form-group">
              <label class="form-label">GST REGISTRATION NUMBER (GSTIN)</label>
              <input type="text" [(ngModel)]="pdfConfig.gstNumber" name="gstNumber" class="glass-input" placeholder="e.g. 06AAAAA1111A1Z1">
            </div>

            <div class="form-group">
              <label class="form-label">DRUG LICENSE NUMBER (D.L. NO)</label>
              <input type="text" [(ngModel)]="pdfConfig.drugLicenseNumber" name="drugLicenseNumber" class="glass-input" placeholder="e.g. DL-2026/PHARM/101">
            </div>

            <div class="form-group">
              <label class="form-label">STORE CONTACT PHONE</label>
              <input type="text" [(ngModel)]="pdfConfig.phone" name="phone" class="glass-input" placeholder="e.g. +91 98765 43210">
            </div>
          </div>

          <div class="form-grid-3 mt-2">
            <div class="form-group">
              <label class="form-label">STORE EMAIL ADDRESS</label>
              <input type="email" [(ngModel)]="pdfConfig.email" name="email" class="glass-input" placeholder="e.g. billing@medilogpharmacy.com">
            </div>

            <div class="form-group">
              <label class="form-label">STATE NAME</label>
              <input type="text" [(ngModel)]="pdfConfig.stateName" name="stateName" class="glass-input" placeholder="e.g. Haryana">
            </div>

            <div class="form-group">
              <label class="form-label">STATE CODE</label>
              <input type="text" [(ngModel)]="pdfConfig.stateCode" name="stateCode" class="glass-input" placeholder="e.g. 06">
            </div>
          </div>

          <div class="form-group mt-2">
            <label class="form-label">PHARMACY ADDRESS</label>
            <input type="text" [(ngModel)]="pdfConfig.address" name="address" class="glass-input" placeholder="e.g. 124, Central Market, Medical Square, City">
          </div>

          <div class="form-grid-2 mt-2">
            <div class="form-group">
              <label class="form-label">INVOICE FOOTER NOTE</label>
              <input type="text" [(ngModel)]="pdfConfig.invoiceFooter" name="invoiceFooter" class="glass-input" placeholder="e.g. Thank you for visiting! Get well soon.">
              <small class="form-text text-muted">Closing remark printed at the bottom of every POS invoice.</small>
            </div>

            <div class="form-group">
              <label class="form-label">TERMS & CONDITIONS</label>
              <textarea [(ngModel)]="pdfConfig.termsAndConditions" name="termsAndConditions" class="glass-input" rows="2" placeholder="e.g. 1. Goods once sold will not be taken back without original bill. 2. Prescribed medicines dispensed strictly as directed."></textarea>
              <small class="form-text text-muted">Legal terms printed at the footer of invoices.</small>
            </div>
          </div>
        </div>

        @if (errorMsg()) {
          <div class="alert alert-danger mt-3">{{ errorMsg() }}</div>
        }
        @if (successMsg()) {
          <div class="alert alert-success mt-3">{{ successMsg() }}</div>
        }

        <!-- Bottom Save Actions -->
        <div class="actions-footer mt-4">
          <button type="button" (click)="saveSettings()" class="btn-save">
            💾 Save All Chemist & Invoice Settings
          </button>
          @if (waConfig.isConfigured) {
            <button type="button" (click)="clearSettings()" class="btn-clear">
              Clear API Credentials
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .settings-container {
      padding: 10px;
    }
    .page-header {
      margin-bottom: 20px;
    }
    .sub-title {
      font-size: 0.9rem;
      color: var(--text-muted);
      margin: 4px 0 0 0;
    }
    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 20px;
    }
    @media (max-width: 900px) {
      .settings-grid, .form-grid-3, .form-grid-2 {
        grid-template-columns: 1fr !important;
      }
    }
    .form-grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 14px;
    }
    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .panel-header h3 {
      font-size: 1.1rem;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--primary);
    }
    .panel-subtitle {
      font-size: 0.82rem;
      color: var(--text-secondary);
      margin-top: 4px;
      margin-bottom: 12px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      margin-bottom: 14px;
    }
    .form-group label {
      font-size: 10px;
      color: var(--text-secondary);
      display: block;
      margin-bottom: 6px;
      letter-spacing: 0.05em;
      font-weight: 600;
    }
    .form-text {
      display: block;
      font-size: 10px;
      margin-top: 4px;
      color: var(--text-muted);
    }
    .logo-preview-box {
      width: 120px;
      height: 120px;
      border: 2px dashed rgba(130, 87, 229, 0.4);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(130, 87, 229, 0.05);
      overflow: hidden;
    }
    .logo-preview-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .logo-placeholder {
      text-align: center;
    }
    .logo-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn-file-select {
      background: rgba(130, 87, 229, 0.15);
      border: 1px solid var(--primary);
      color: var(--primary-light);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .btn-file-select:hover {
      background: var(--primary);
      color: white;
    }
    .btn-upload-logo {
      background: #10b981;
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }
    .actions-footer {
      display: flex;
      gap: 16px;
      justify-content: flex-start;
      margin-top: 24px;
      border-top: 1px solid var(--glass-border);
      padding-top: 20px;
    }
    .btn-save {
      background: #10b981;
      font-weight: bold;
      border-radius: 8px;
      border: none;
      color: white;
      padding: 12px 28px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-save:hover {
      background: #059669;
      transform: translateY(-1px);
    }
    .btn-clear {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #fca5a5;
      font-weight: bold;
      border-radius: 8px;
      padding: 12px 28px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-clear:hover {
      background: #ef4444 !important;
      color: #fff !important;
    }
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 40px;
      color: var(--text-secondary);
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(130,87,229,0.15);
      border-top-color: #8257e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class SettingsComponent implements OnInit {
  private apiService = inject(ApiService);

  loading = signal<boolean>(false);
  uploadingLogo = signal<boolean>(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  chemistName = '';
  logoUrl = '';
  selectedLogoFile: File | null = null;
  logoPreviewUrl: string | null = null;

  waConfig = {
    metaAccessToken: '',
    metaPhoneNumberId: '',
    metaBusinessId: '',
    businessName: '',
    senderNumber: '',
    isConfigured: false
  };

  pdfConfig = {
    gstNumber: '',
    address: '',
    email: '',
    phone: '',
    stateName: '',
    stateCode: '',
    drugLicenseNumber: '',
    invoiceFooter: '',
    termsAndConditions: ''
  };

  ngOnInit(): void {
    this.loadSettings();
  }

  getFullLogoUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const baseUrl = 'http://localhost:5000';
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  onLogoFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedLogoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoPreviewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadLogo(): void {
    if (!this.selectedLogoFile) return;
    this.uploadingLogo.set(true);
    this.errorMsg.set(null);

    this.apiService.uploadLogo(this.selectedLogoFile).subscribe({
      next: (res) => {
        this.uploadingLogo.set(false);
        if (res && res.logoUrl) {
          this.logoUrl = res.logoUrl;
          this.selectedLogoFile = null;
          this.successMsg.set('🖼️ Store logo uploaded and updated successfully!');
          setTimeout(() => this.successMsg.set(null), 4000);
        }
      },
      error: (err) => {
        this.uploadingLogo.set(false);
        this.errorMsg.set(err.error?.message || 'Failed to upload store logo.');
      }
    });
  }

  loadSettings(): void {
    this.loading.set(true);
    this.apiService.getWhatsAppConfig().subscribe({
      next: (res) => {
        if (res && res.data) {
          this.chemistName = res.data.chemistName || '';
          this.logoUrl = res.data.logoUrl || '';
          this.waConfig = {
            metaAccessToken: res.data.whatsappConfig?.metaAccessToken || '',
            metaPhoneNumberId: res.data.whatsappConfig?.metaPhoneNumberId || '',
            metaBusinessId: res.data.whatsappConfig?.metaBusinessId || '',
            businessName: res.data.whatsappConfig?.businessName || '',
            senderNumber: res.data.whatsappConfig?.senderNumber || '',
            isConfigured: res.data.whatsappConfig?.isConfigured || false
          };
          if (res.data.pdfConfig) {
            this.pdfConfig = {
              gstNumber: res.data.pdfConfig.gstNumber || '',
              address: res.data.pdfConfig.address || '',
              email: res.data.pdfConfig.email || '',
              phone: res.data.pdfConfig.phone || '',
              stateName: res.data.pdfConfig.stateName || '',
              stateCode: res.data.pdfConfig.stateCode || '',
              drugLicenseNumber: res.data.pdfConfig.drugLicenseNumber || '',
              invoiceFooter: res.data.pdfConfig.invoiceFooter || '',
              termsAndConditions: res.data.pdfConfig.termsAndConditions || ''
            };
          }
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load settings', err);
        this.loading.set(false);
      }
    });
  }

  saveSettings(): void {
    this.errorMsg.set(null);
    this.successMsg.set(null);

    const payload = {
      chemistName: this.chemistName,
      ...this.waConfig,
      pdfConfig: this.pdfConfig
    };

    this.apiService.saveWhatsAppConfig(payload).subscribe({
      next: () => {
        this.successMsg.set('🎉 Pharmacy & Invoice configuration settings saved successfully!');
        this.loadSettings();
        setTimeout(() => this.successMsg.set(null), 4000);
      },
      error: (err) => {
        this.errorMsg.set(err.error?.message || 'Failed to save settings.');
      }
    });
  }

  clearSettings(): void {
    if (confirm('Are you sure you want to clear your WhatsApp configurations?')) {
      this.errorMsg.set(null);
      this.successMsg.set(null);

      const emptyConfig = {
        chemistName: this.chemistName,
        metaAccessToken: '',
        metaPhoneNumberId: '',
        metaBusinessId: '',
        businessName: '',
        senderNumber: '',
        pdfConfig: this.pdfConfig
      };

      this.apiService.saveWhatsAppConfig(emptyConfig).subscribe({
        next: () => {
          this.successMsg.set('WhatsApp credentials cleared successfully.');
          this.loadSettings();
          setTimeout(() => this.successMsg.set(null), 4000);
        },
        error: (err) => {
          this.errorMsg.set('Failed to clear credentials.');
        }
      });
    }
  }
}
