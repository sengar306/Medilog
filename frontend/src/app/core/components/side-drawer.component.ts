import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-side-drawer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Semi-transparent Backdrop -->
    @if (open) {
      <div 
        class="drawer-backdrop" 
        [class.open]="open"
        (click)="handleBackdropClick()">
      </div>

      <!-- Slide-in Drawer Container -->
      <div 
        class="drawer-container" 
        [class.open]="open"
        [style.maxWidth]="width">
        
        <!-- Sticky Header -->
        <div class="drawer-header">
          <div class="header-title-group">
            <h3 class="drawer-title">{{ title }}</h3>
            @if (subtitle) {
              <p class="drawer-subtitle">{{ subtitle }}</p>
            }
          </div>
          <div class="header-actions">
            <ng-content select="[drawer-header-actions]"></ng-content>
            <button type="button" class="btn-drawer-close" (click)="requestClose()" title="Close">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        <!-- Independently Scrollable Body -->
        <div class="drawer-body">
          <ng-content></ng-content>
        </div>

        <!-- Sticky Footer -->
        @if (showFooter) {
          <div class="drawer-footer">
            <ng-content select="[drawer-footer-start]"></ng-content>
            
            <div class="footer-custom-actions">
              <ng-content select="[drawer-footer-actions]"></ng-content>
            </div>

            <div class="footer-buttons" *ngIf="showDefaultButtons">
              <button 
                type="button" 
                class="btn btn-glass" 
                (click)="requestClose()">
                {{ secondaryButtonText }}
              </button>

              <button 
                type="button" 
                class="btn btn-primary" 
                [disabled]="submitDisabled || submitLoading"
                (click)="handleSubmit()">
                @if (submitLoading) {
                  <span class="spinner-border spinner-border-sm me-1"></span>
                }
                {{ primaryButtonText }}
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Unsaved Changes Confirmation Modal (Small Centered Dialog) -->
      @if (showConfirmDiscard) {
        <div class="confirm-dialog-backdrop" (click)="showConfirmDiscard = false">
          <div class="confirm-dialog-card" (click)="$event.stopPropagation()">
            <div class="confirm-icon danger">
              <i class="bi bi-exclamation-triangle"></i>
            </div>
            <h4>Discard Changes?</h4>
            <p>You have unsaved changes. Are you sure you want to discard them?</p>
            <div class="confirm-actions">
              <button type="button" class="btn btn-glass" (click)="showConfirmDiscard = false">
                Keep Editing
              </button>
              <button type="button" class="btn btn-danger" (click)="confirmDiscard()">
                Discard
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    /* ============================================
       Side Drawer Backdrop & Container
       ============================================ */
    .drawer-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: var(--modal-backdrop, rgba(15, 23, 42, 0.55));
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 99998;
      opacity: 0;
      pointer-events: none;
      transition: opacity 280ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .drawer-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }

    .drawer-container {
      position: fixed;
      top: 0;
      right: 0;
      width: 100%;
      height: 100vh;
      background: var(--bg-card);
      border-left: 1px solid var(--border);
      box-shadow: var(--shadow-xl);
      z-index: 99999;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 280ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .drawer-container.open {
      transform: translateX(0);
    }

    /* ============================================
       Drawer Header
       ============================================ */
    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-card);
      position: sticky;
      top: 0;
      z-index: 10;
      flex-shrink: 0;
    }
    .header-title-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .drawer-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
      line-height: 1.2;
    }
    .drawer-subtitle {
      font-size: 0.82rem;
      color: var(--text-secondary);
      margin: 0;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-drawer-close {
      background: var(--bg-muted);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md, 8px);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.95rem;
      transition: all 150ms ease;
    }
    .btn-drawer-close:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
      border-color: var(--border-focus);
    }

    /* ============================================
       Drawer Body (Scrollable)
       ============================================ */
    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    /* ============================================
       Drawer Footer (Sticky)
       ============================================ */
    .drawer-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-top: 1px solid var(--border);
      background: var(--bg-card);
      position: sticky;
      bottom: 0;
      z-index: 10;
      flex-shrink: 0;
      gap: 12px;
    }
    .footer-custom-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .footer-buttons {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-left: auto;
    }

    /* ============================================
       Unsaved Confirm Dialog
       ============================================ */
    .confirm-dialog-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .confirm-dialog-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg, 12px);
      padding: 24px;
      width: 100%;
      max-width: 400px;
      box-shadow: var(--shadow-xl);
      text-align: center;
    }
    .confirm-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      font-size: 1.4rem;
    }
    .confirm-icon.danger {
      background: var(--danger-glow, rgba(239, 68, 68, 0.2));
      color: var(--danger, #EF4444);
    }
    .confirm-dialog-card h4 {
      font-size: 1.1rem;
      margin-bottom: 8px;
      color: var(--text-primary);
    }
    .confirm-dialog-card p {
      font-size: 0.88rem;
      color: var(--text-secondary);
      margin-bottom: 20px;
    }
    .confirm-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
    }

    /* ============================================
       Mobile Full Screen Adaptability
       ============================================ */
    @media (max-width: 768px) {
      .drawer-container {
        max-width: 100% !important;
        width: 100% !important;
      }
      .drawer-header { padding: 16px; }
      .drawer-body { padding: 16px; }
      .drawer-footer { padding: 14px 16px; }
    }
  `]
})
export class SideDrawerComponent {
  @Input() open: boolean = false;
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() width: string = '520px';
  @Input() isDirty: boolean = false;
  @Input() primaryButtonText: string = 'Save';
  @Input() secondaryButtonText: string = 'Cancel';
  @Input() showFooter: boolean = true;
  @Input() showDefaultButtons: boolean = true;
  @Input() submitDisabled: boolean = false;
  @Input() submitLoading: boolean = false;

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();

  showConfirmDiscard: boolean = false;

  handleBackdropClick(): void {
    this.requestClose();
  }

  requestClose(): void {
    if (this.isDirty) {
      this.showConfirmDiscard = true;
    } else {
      this.close();
    }
  }

  confirmDiscard(): void {
    this.showConfirmDiscard = false;
    this.close();
  }

  close(): void {
    this.closed.emit();
  }

  handleSubmit(): void {
    this.submitted.emit();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.open && !this.showConfirmDiscard) {
      this.requestClose();
    }
  }
}

