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
          <h1 class="gradient-text">⚙️ Settings</h1>
          <p class="sub-title">Configure your pharmacy details and WhatsApp Cloud API credentials for automated billing messaging</p>
        </div>
      </div>

      <div class="glass-panel mt-4" style="max-width: 650px;">
        <div class="panel-header">
          <h3><i class="bi bi-whatsapp"></i> WhatsApp Cloud API Configuration</h3>
        </div>

        @if (loading()) {
          <div class="loading-state"><div class="spinner"></div><p>Loading configuration...</p></div>
        } @else {
          <form (submit)="saveSettings()">
            @if (errorMsg()) {
              <div class="alert alert-danger">{{ errorMsg() }}</div>
            }
            @if (successMsg()) {
              <div class="alert alert-success">{{ successMsg() }}</div>
            }

            <div class="form-group mt-3">
              <label class="form-label">META CLOUD ACCESS TOKEN *</label>
              <input type="password" [(ngModel)]="waConfig.metaAccessToken" name="metaAccessToken" class="glass-input" placeholder="EAAG..." required>
              <small class="form-text text-muted">A permanent system user access token generated in Meta Developer Console.</small>
            </div>

            <div class="form-group mt-3">
              <label class="form-label">META PHONE NUMBER ID *</label>
              <input type="text" [(ngModel)]="waConfig.metaPhoneNumberId" name="metaPhoneNumberId" class="glass-input" placeholder="e.g. 1029384..." required>
              <small class="form-text text-muted">The ID associated with the sending phone number in your Meta developer dashboard.</small>
            </div>

            <div class="form-group mt-3">
              <label class="form-label">WHATSAPP BUSINESS ACCOUNT ID *</label>
              <input type="text" [(ngModel)]="waConfig.metaBusinessId" name="metaBusinessId" class="glass-input" placeholder="e.g. 2279329..." required>
              <small class="form-text text-muted">The business account ID managing the app connection.</small>
            </div>

            <div class="form-group mt-3">
              <label class="form-label">PHARMACY / BUSINESS NAME</label>
              <input type="text" [(ngModel)]="waConfig.businessName" name="businessName" class="glass-input" placeholder="e.g. Assandh Road Pharmacy">
              <small class="form-text text-muted">The name of your business used as the sender name in system logs.</small>
            </div>

            <div class="form-group mt-3 font-semibold">
              <label class="form-label">SENDER PHONE NUMBER</label>
              <input type="text" [(ngModel)]="waConfig.senderNumber" name="senderNumber" class="glass-input" placeholder="e.g. 916398974633">
              <small class="form-text text-muted">The verified sending phone number linked to Meta WhatsApp Cloud API.</small>
            </div>

            <div class="mt-4 d-flex gap-3">
              <button type="submit" class="btn btn-primary-glass" style="background: #16a34a; font-weight: bold; border-radius: 8px; border: none; color: white; padding: 10px 24px;">
                Save Configuration Settings
              </button>
              @if (waConfig.isConfigured) {
                <button type="button" (click)="clearSettings()" class="btn btn-danger-glass" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5; font-weight: bold; border-radius: 8px; padding: 10px 24px;">
                  Clear Credentials
                </button>
              }
            </div>
          </form>
        }
      </div>
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
    .panel-header h3 {
      font-size: 1.1rem;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .form-group label {
      font-size: 11px;
      color: #aaa;
      display: block;
      margin-bottom: 6px;
      letter-spacing: 0.05em;
    }
    .form-text {
      display: block;
      font-size: 11px;
      margin-top: 4px;
      color: var(--text-muted);
    }
    .d-flex {
      display: flex;
    }
    .gap-3 {
      gap: 16px;
    }
    .btn-danger-glass {
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-danger-glass:hover {
      background: #dc2626 !important;
      color: #fff !important;
    }
  `]
})
export class SettingsComponent implements OnInit {
  private apiService = inject(ApiService);

  loading = signal<boolean>(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  waConfig = {
    metaAccessToken: '',
    metaPhoneNumberId: '',
    metaBusinessId: '',
    businessName: '',
    senderNumber: '',
    isConfigured: false
  };

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading.set(true);
    this.apiService.getWhatsAppConfig().subscribe({
      next: (res) => {
        if (res && res.data) {
          this.waConfig = {
            metaAccessToken: res.data.metaAccessToken || '',
            metaPhoneNumberId: res.data.metaPhoneNumberId || '',
            metaBusinessId: res.data.metaBusinessId || '',
            businessName: res.data.businessName || '',
            senderNumber: res.data.senderNumber || '',
            isConfigured: res.data.isConfigured || false
          };
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

    this.apiService.saveWhatsAppConfig(this.waConfig).subscribe({
      next: () => {
        this.successMsg.set('🎉 Configuration settings saved successfully!');
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
        metaAccessToken: '',
        metaPhoneNumberId: '',
        metaBusinessId: '',
        businessName: '',
        senderNumber: ''
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
