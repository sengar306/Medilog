import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ReelScriptStep {
  time: string;
  visual: string;
  voiceover: string;
  caption: string;
}

@Component({
  selector: 'app-marketing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="marketing-container animate-fade-in">
      <div class="header-section">
        <div>
          <span class="badge badge-primary mb-2"><i class="bi bi-megaphone-fill me-1"></i> Marketing Suite & Product Studio</span>
          <h1>MediLog Marketing & Promotion Studio</h1>
          <p>Product analysis, high-conversion visual banners, Instagram Reel scripts, and WhatsApp promo templates for MediLog.</p>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="marketing-tabs">
        <button class="tab-btn" [class.active]="activeTab() === 'visuals'" (click)="activeTab.set('visuals')">
          <i class="bi bi-image-fill"></i> Promotional Banners & Reel Templates
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'reel-script'" (click)="activeTab.set('reel-script')">
          <i class="bi bi-camera-reels-fill"></i> Instagram Reel & Video Script
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'whatsapp-copy'" (click)="activeTab.set('whatsapp-copy')">
          <i class="bi bi-whatsapp"></i> WhatsApp & Social Copy Templates
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'analysis'" (click)="activeTab.set('analysis')">
          <i class="bi bi-pie-chart-fill"></i> Product & Value Proposition Analysis
        </button>
      </div>

      <!-- TAB 1: Promotional Visuals & Reel Templates -->
      @if (activeTab() === 'visuals') {
        <div class="visuals-grid">
          <!-- 16:9 Hero Banner Card -->
          <div class="visual-card glass-panel">
            <div class="card-header">
              <div>
                <span class="badge badge-info me-2">16:9 HD Desktop & Website Hero</span>
                <h3>MediLog Platform Hero Banner</h3>
                <p class="text-secondary">Ideal for website landing pages, LinkedIn posts & desktop banner ads.</p>
              </div>
              <a href="assets/marketing/banner.jpg" download="MediLog_Hero_Banner.jpg" class="btn btn-sm btn-primary-glass">
                <i class="bi bi-download me-1"></i> Download Banner
              </a>
            </div>
            <div class="image-preview-container">
              <img src="/assets/marketing/banner.jpg" alt="MediLog Hero Banner" class="marketing-img responsive-img">
            </div>
          </div>

          <div class="split-visuals-row">
            <!-- 9:16 Instagram Reel Cover -->
            <div class="visual-card glass-panel">
              <div class="card-header">
                <div>
                  <span class="badge badge-warning me-2">9:16 Story & Reel Template</span>
                  <h3>Instagram Reel & TikTok Cover</h3>
                  <p class="text-secondary">High-engagement mobile story frame.</p>
                </div>
                <a href="assets/marketing/reel.jpg" download="MediLog_Reel_Cover.jpg" class="btn btn-sm btn-primary-glass">
                  <i class="bi bi-download me-1"></i> Download Reel Cover
                </a>
              </div>
              <div class="image-preview-container portrait-frame">
                <img src="/assets/marketing/reel.jpg" alt="MediLog Reel Cover" class="marketing-img reel-img">
              </div>
            </div>

            <!-- 1:1 WhatsApp Promo Flyer -->
            <div class="visual-card glass-panel">
              <div class="card-header">
                <div>
                  <span class="badge badge-success me-2">1:1 Square Flyer</span>
                  <h3>WhatsApp & Social Media Flyer</h3>
                  <p class="text-secondary">Optimized for broadcast groups and Instagram grid posts.</p>
                </div>
                <a href="assets/marketing/flyer.jpg" download="MediLog_WhatsApp_Flyer.jpg" class="btn btn-sm btn-primary-glass">
                  <i class="bi bi-download me-1"></i> Download Flyer
                </a>
              </div>
              <div class="image-preview-container square-frame">
                <img src="/assets/marketing/flyer.jpg" alt="MediLog WhatsApp Promo Flyer" class="marketing-img flyer-img">
              </div>
            </div>
          </div>
        </div>
      }

      <!-- TAB 2: Instagram Reel Script & Storyboard -->
      @if (activeTab() === 'reel-script') {
        <div class="glass-panel">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2>Viral Instagram Reel / TikTok Script Template</h2>
              <p class="text-secondary">Duration: 20 Seconds | Concept: "Tired of manual paper invoices & expired stock losses?"</p>
            </div>
            <button class="btn btn-primary" (click)="copyReelScript()">
              <i class="bi bi-clipboard-check me-1"></i> Copy Complete Script
            </button>
          </div>

          <div class="reel-audio-bar p-3 glass-card mb-4" style="background: rgba(16, 185, 129, 0.08); border-left: 4px solid var(--accent-emerald);">
            <strong><i class="bi bi-music-note-beamed me-2 text-success"></i> Recommended Audio Mood:</strong> 
            <span>Energetic, upbeat tech-future synth beat with snappy camera shutter sound effects at each transition.</span>
          </div>

          <div class="timeline-storyboard">
            @for (step of reelScript; track step.time) {
              <div class="timeline-item glass-card mb-3 p-3">
                <div class="timeline-time-badge">
                  <i class="bi bi-clock-history me-1"></i> {{ step.time }}
                </div>
                <div class="timeline-content grid-3-col">
                  <div>
                    <label class="text-muted" style="font-size: 0.78rem;">CAMERA & VISUAL SHOT</label>
                    <div style="font-weight: 600; color: var(--text-primary);">{{ step.visual }}</div>
                  </div>
                  <div>
                    <label class="text-muted" style="font-size: 0.78rem;">VOICEOVER / AUDIO HOOK</label>
                    <div style="color: var(--accent-emerald); font-style: italic;">"{{ step.voiceover }}"</div>
                  </div>
                  <div>
                    <label class="text-muted" style="font-size: 0.78rem;">ON-SCREEN TEXT OVERLAY</label>
                    <div class="badge badge-info" style="font-size: 0.85rem;">{{ step.caption }}</div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- TAB 3: WhatsApp Copy Templates -->
      @if (activeTab() === 'whatsapp-copy') {
        <div class="copy-templates-grid">
          <div class="glass-panel">
            <h3><i class="bi bi-whatsapp text-success me-2"></i> WhatsApp Broadcast for Pharmacy Owners</h3>
            <p class="text-secondary">Send this campaign text to retail chemist WhatsApp broadcast lists.</p>
            <div class="code-box p-3 rounded mt-3">
              <pre>{{ whatsappChemistCopy }}</pre>
            </div>
            <button class="btn btn-glass mt-3" (click)="copyToClipboard(whatsappChemistCopy)">
              <i class="bi bi-clipboard me-1"></i> Copy WhatsApp Message
            </button>
          </div>

          <div class="glass-panel">
            <h3><i class="bi bi-building text-primary me-2"></i> B2B Stockist & Wholesale Distributor Copy</h3>
            <p class="text-secondary">Pitching stockist portal to pharmaceutical wholesalers & distributors.</p>
            <div class="code-box p-3 rounded mt-3">
              <pre>{{ whatsappStockistCopy }}</pre>
            </div>
            <button class="btn btn-glass mt-3" (click)="copyToClipboard(whatsappStockistCopy)">
              <i class="bi bi-clipboard me-1"></i> Copy Stockist Pitch
            </button>
          </div>
        </div>
      }

      <!-- TAB 4: Product Analysis -->
      @if (activeTab() === 'analysis') {
        <div class="glass-panel">
          <h2>MediLog Product Analysis & Core USPs</h2>
          <p class="text-secondary">Strategic breakdown of key features to highlight in marketing campaigns.</p>

          <div class="analysis-grid mt-4">
            <div class="analysis-card glass-card p-3">
              <div class="analysis-icon bg-primary-soft"><i class="bi bi-magic text-primary"></i></div>
              <h4>1. AI Invoice Parser</h4>
              <p class="text-muted" style="font-size: 0.9rem;">
                Scan paper bills from distributors using smartphone or PDF upload. OCR automatically populates medicine names, batch numbers, expiry dates, MRP, and PTR into inventory.
              </p>
            </div>

            <div class="analysis-card glass-card p-3">
              <div class="analysis-icon bg-success-soft"><i class="bi bi-receipt text-success"></i></div>
              <h4>2. WhatsApp POS Billing</h4>
              <p class="text-muted" style="font-size: 0.9rem;">
                Generate GST bills in under 5 seconds with barcode scanning. Send digital invoice PDF directly to patient's WhatsApp number, saving paper costs & building loyalty.
              </p>
            </div>

            <div class="analysis-card glass-card p-3">
              <div class="analysis-icon bg-warning-soft"><i class="bi bi-hourglass-split text-warning"></i></div>
              <h4>3. Automated Expiry Management</h4>
              <p class="text-muted" style="font-size: 0.9rem;">
                Color-coded alerts for medicines near expiry (30/60/90 days). One-click Purchase Returns to stockists ensures 0% financial loss due to expired stock.
              </p>
            </div>

            <div class="analysis-card glass-card p-3">
              <div class="analysis-icon bg-info-soft"><i class="bi bi-shop text-info"></i></div>
              <h4>4. B2B Chemist Marketplace</h4>
              <p class="text-muted" style="font-size: 0.9rem;">
                Connects retail pharmacies directly with regional stockists. Chemists can check real-time stockist catalogs and order short-supply medicines instantly.
              </p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .marketing-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .marketing-tabs {
      display: flex;
      gap: 10px;
      border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.1));
      padding-bottom: 12px;
      flex-wrap: wrap;
    }
    .tab-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-secondary);
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tab-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
    }
    .tab-btn.active {
      background: var(--accent-emerald, #10b981);
      color: #000000;
      font-weight: 700;
      border-color: var(--accent-emerald, #10b981);
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
    }
    .visuals-grid {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .visual-card {
      padding: 20px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .split-visuals-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    @media (max-width: 992px) {
      .split-visuals-row {
        grid-template-columns: 1fr;
      }
    }
    .image-preview-container {
      border-radius: 12px;
      overflow: hidden;
      background: #000;
      border: 1px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .marketing-img {
      width: 100%;
      height: auto;
      object-fit: cover;
      display: block;
      transition: transform 0.3s ease;
    }
    .marketing-img:hover {
      transform: scale(1.01);
    }
    .portrait-frame {
      max-height: 520px;
    }
    .portrait-frame img {
      max-height: 520px;
      object-fit: contain;
    }
    .square-frame {
      max-height: 520px;
    }
    .square-frame img {
      max-height: 520px;
      object-fit: contain;
    }
    .grid-3-col {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 768px) {
      .grid-3-col {
        grid-template-columns: 1fr;
      }
    }
    .timeline-time-badge {
      font-weight: 700;
      color: var(--accent-emerald, #10b981);
      margin-bottom: 8px;
    }
    .copy-templates-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    @media (max-width: 992px) {
      .copy-templates-grid {
        grid-template-columns: 1fr;
      }
    }
    .code-box pre {
      white-space: pre-wrap;
      word-break: break-word;
      font-family: inherit;
      margin: 0;
      color: #e2e8f0;
      font-size: 0.9rem;
    }
    .analysis-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }
    .analysis-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      margin-bottom: 12px;
    }
  `]
})
export class MarketingComponent {
  activeTab = signal<'visuals' | 'reel-script' | 'whatsapp-copy' | 'analysis'>('visuals');

  reelScript: ReelScriptStep[] = [
    {
      time: '0:00 - 0:03',
      visual: 'Pharmacist sitting frustrated surrounded by stacks of paper distributor invoices and expired medicine boxes.',
      voiceover: 'Still typing paper distributor bills manually line-by-line into your pharmacy system?',
      caption: '🛑 Stop Wasting 3 Hours Daily!'
    },
    {
      time: '0:03 - 0:08',
      visual: 'Smartphone snaps a quick photo of paper bill -> MediLog AI scanner instantly extracts batch #, expiry & MRP in seconds.',
      voiceover: 'Meet MediLog AI! Snap any paper invoice and watch AI extract stock, batches, and expiries instantly.',
      caption: '✨ AI Invoice Scanning in 3 Secs'
    },
    {
      time: '0:08 - 0:14',
      visual: 'Fast barcode scan at POS counter -> Patient receives beautiful GST invoice directly on WhatsApp with loyalty points!',
      voiceover: 'Create bills in 5 seconds and send digital WhatsApp receipts directly to patients.',
      caption: '📲 WhatsApp Billing & Loyalty'
    },
    {
      time: '0:14 - 0:20',
      visual: 'Dashboard showing green revenue growth charts, expiry alerts screen, and B2B wholesale stockist ordering catalog.',
      voiceover: 'Zero expired stock losses and order wholesale stock at best rates. Upgrade your pharmacy with MediLog today!',
      caption: '🚀 Try MediLog Free Today!'
    }
  ];

  whatsappChemistCopy = `🏥 *Transform Your Pharmacy with MediLog AI Platform!*

Tired of spending hours typing paper distributor invoices and losing money on expired medicines?

✨ *Key Features for Retail Pharmacies:*
⚡ *AI Invoice Scanner:* Upload paper bills -> AI adds batch, expiry & stock instantly!
📊 *Fast POS & WhatsApp Bills:* Send digital receipts & loyalty points to patients.
⚠️ *Smart Expiry Alerts:* Zero stock losses with automated return notifications.
🛒 *B2B Stockist Marketplace:* Order short-supply medicines directly from wholesale distributors.

👉 *Start your free demo today:* https://medilog.pharmacy
📞 *Call/WhatsApp Us:* +91 98765 43210`;

  whatsappStockistCopy = `🏬 *Expand Your Medical Wholesale Distribution with MediLog Stockist Portal!*

Connect directly with thousands of retail chemists & pharmacy stores in your region.

✅ *Upload your Medicine Catalog & Real-time Prices*
✅ *Receive Instant B2B Orders from Chemist Shops*
✅ *Automate Order Fulfillment & GST Invoices*

📈 *Increase your wholesale sales by 40%!*
👉 *Register your Stockist Account:* https://medilog.pharmacy/stockist`;

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copied template copy to clipboard!');
  }

  copyReelScript() {
    const fullText = this.reelScript.map(s => `[${s.time}] Visual: ${s.visual}\nVoiceover: "${s.voiceover}"\nCaption: ${s.caption}\n`).join('\n---\n\n');
    navigator.clipboard.writeText(fullText);
    alert('Copied Instagram Reel Script & Storyboard to clipboard!');
  }
}
