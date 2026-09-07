import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ApiService } from '../core/services/api.service';
import { NotificationService } from '../core/services/notification.service';
import { LoadingService } from '../core/services/loading.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout-wrapper">
      <!-- Full Screen Blur Backdrop Overlay when any API loader shows -->
      @if (loadingSvc.isLoading()) {
        <div class="global-blur-overlay">
          <div class="global-loader-card glass-panel">
            <div class="loader-spinner-ring"></div>
            <p class="loader-text gradient-text">Processing Request...</p>
          </div>
        </div>
      }

      <!-- Mobile Sidebar Backdrop Overlay -->
      @if (mobileSidebarOpen) {
        <div class="sidebar-backdrop" (click)="closeMobileSidebar()"></div>
      }

      <!-- Sidebar -->
      <aside class="sidebar glass-panel" [class.mobile-open]="mobileSidebarOpen">
        <div class="sidebar-logo">
          <i class="bi bi-heart-pulse-fill logo-icon"></i>
          <span class="logo-text gradient-text">MediLog</span>
          <button class="btn-close-sidebar" (click)="closeMobileSidebar()">✕</button>
        </div>
        
        <nav class="sidebar-nav">
          <a routerLink="/dashboard" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-grid-1x2-fill"></i>
            <span>Dashboard</span>
          </a>
          
          <a routerLink="/medicines" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-capsule"></i>
            <span>Medicine</span>
          </a>

          <a routerLink="/inventory" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-archive-fill"></i>
            <span>Inventory</span>
            @if (notifSvc.counts().lowStock > 0) {
              <span class="nav-badge danger">{{ notifSvc.counts().lowStock }}</span>
            }
          </a>

          <a routerLink="/purchases" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-cart-check-fill"></i>
            <span>Purchase</span>
          </a>

          <a routerLink="/purchase-returns" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-arrow-return-left"></i>
            <span>Returns</span>
          </a>

          <a routerLink="/invoice-parser" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-robot"></i>
            <span>AI Invoice OCR</span>
            <span class="badge badge-info text-xs ml-auto">Gemini</span>
          </a>

          <a routerLink="/billing" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-receipt"></i>
            <span>Billing (POS)</span>
          </a>

          <a routerLink="/prescriptions" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-file-earmark-medical-fill"></i>
            <span>Prescriptions</span>
          </a>

          <a routerLink="/customers" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-people-fill"></i>
            <span>Customers</span>
          </a>

          <a routerLink="/suppliers" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-truck"></i>
            <span>Suppliers</span>
          </a>

          <a routerLink="/reports" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-bar-chart-line-fill"></i>
            <span>Reports</span>
          </a>

          <a routerLink="/expiry-alerts" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-calendar-event"></i>
            <span>Expiry Alerts</span>
            @if (notifSvc.counts().criticalExpiry > 0 || notifSvc.counts().expired > 0) {
              <span class="nav-badge danger">{{ notifSvc.counts().criticalExpiry + notifSvc.counts().expired }}</span>
            }
          </a>

          @if (isAdminRole()) {
            <a routerLink="/users" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
              <i class="bi bi-people-fill"></i>
              <span>Users</span>
            </a>
          }

          <a routerLink="/settings" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-gear-fill"></i>
            <span>Settings</span>
          </a>
        </nav>

        <!-- Sidebar Footer -->
        <div class="sidebar-footer">
          <div class="user-badge">
            <div class="user-avatar">
              <i class="bi bi-person-fill"></i>
            </div>
            <div class="user-details">
              <p class="user-name">{{ username() }}</p>
              <span class="user-role badge" [ngClass]="getRoleClass()">{{ role() }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Layout Right Column -->
      <div class="main-column">
        <!-- Top Bar Header -->
        <header class="header-bar glass-panel">
          <div class="header-left" style="display: flex; align-items: center; gap: 12px;">
            <button class="btn-hamburger" (click)="toggleMobileSidebar()">
              <i class="bi bi-list"></i>
            </button>
            <h2>Pharmacy Hub</h2>
          </div>
          <div class="header-right">
            <div class="time-widget">
              <i class="bi bi-clock-fill"></i>
              <span>{{ localTime }}</span>
            </div>

            <!-- Notification Bell -->
            <div class="notif-wrapper" (click)="toggleNotifPanel()">
              <button class="btn-notif" [class.has-alerts]="notifSvc.totalCount() > 0">
                <i class="bi bi-bell-fill"></i>
                @if (notifSvc.totalCount() > 0) {
                  <span class="notif-badge">{{ notifSvc.totalCount() > 9 ? '9+' : notifSvc.totalCount() }}</span>
                }
              </button>

              <!-- Notification Dropdown Panel -->
              @if (showNotifPanel) {
                <div class="notif-panel" (click)="$event.stopPropagation()">
                  <div class="notif-header">
                    <h4><i class="bi bi-bell-fill"></i> Alerts ({{ notifSvc.totalCount() }})</h4>
                    <button class="btn-icon" (click)="showNotifPanel = false">
                      <i class="bi bi-x-lg"></i>
                    </button>
                  </div>
                  <div class="notif-list">
                    @for (notif of notifSvc.notifications().slice(0, 8); track notif.id) {
                      <div class="notif-item" [class.critical]="notif.severity === 'critical'" [class.warning]="notif.severity === 'warning'">
                        <div class="notif-icon" [style.color]="notifSvc.getSeverityColor(notif.severity)">
                          <i [class]="'bi ' + notifSvc.getSeverityIcon(notif.type)"></i>
                        </div>
                        <div class="notif-body">
                          <p class="notif-title">{{ notif.title }}</p>
                          <p class="notif-msg">{{ notif.message }}</p>
                        </div>
                        <button class="btn-icon-sm" (click)="dismissNotif(notif.id)" title="Dismiss">
                          <i class="bi bi-x"></i>
                        </button>
                      </div>
                    } @empty {
                      <div class="notif-empty">
                        <i class="bi bi-check-circle-fill"></i>
                        <p>All clear! No active alerts.</p>
                      </div>
                    }
                  </div>
                  @if (notifSvc.totalCount() > 8) {
                    <div class="notif-footer">
                      <a routerLink="/expiry-alerts" (click)="showNotifPanel = false" class="notif-see-all">
                        See all {{ notifSvc.totalCount() }} alerts →
                      </a>
                    </div>
                  }
                </div>
              }
            </div>

            <button (click)="handleLogout()" class="btn btn-glass btn-logout">
              <i class="bi bi-box-arrow-left"></i> Logout
            </button>
          </div>
        </header>

        <!-- Dynamic Content Router Outlet -->
        <main class="content-area">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .layout-wrapper {
      display: flex;
      min-height: 100vh;
      width: 100vw;
      background: var(--bg-main);
      padding: 16px;
      gap: 16px;
    }
    .sidebar {
      width: 280px;
      display: flex;
      flex-direction: column;
      height: calc(100vh - 32px);
      padding: 24px 16px;
      flex-shrink: 0;
    }
    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 32px;
      padding-left: 8px;
    }
    .logo-icon {
      font-size: 1.8rem;
      color: #a855f7;
    }
    .logo-text {
      font-size: 1.6rem;
      font-weight: 800;
    }
    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex-grow: 1;
      overflow-y: auto;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      color: var(--text-secondary);
      text-decoration: none;
      border-radius: 10px;
      font-weight: 500;
      transition: all 0.2s ease;
      position: relative;
    }
    .nav-item:hover {
      background: rgba(255, 255, 255, 0.02);
      color: var(--text-primary);
    }
    .active-tab {
      background: rgba(130, 87, 229, 0.15) !important;
      border: 1px solid rgba(130, 87, 229, 0.25);
      color: var(--text-primary) !important;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(130, 87, 229, 0.1);
    }
    .text-xs { font-size: 0.65rem; }
    .ml-auto { margin-left: auto; }
    .nav-badge {
      margin-left: auto;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
    }
    .nav-badge.danger {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    
    .sidebar-footer {
      border-top: 1px solid var(--glass-border);
      padding-top: 16px;
      margin-top: 16px;
    }
    .user-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
    }
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--glass-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      color: var(--text-secondary);
    }
    .user-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .user-name {
      font-weight: 600;
      font-size: 0.95rem;
    }
    
    .main-column {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      height: calc(100vh - 32px);
      gap: 16px;
      min-width: 0;
    }
    .header-bar {
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      flex-shrink: 0;
      position: relative;
      z-index: 1100;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .time-widget {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 0, 0, 0.15);
      padding: 6px 12px;
      border-radius: 20px;
      border: 1px solid var(--glass-border);
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .btn-logout {
      padding: 6px 14px;
      font-size: 0.85rem;
    }
    .content-area {
      flex-grow: 1;
      overflow-y: auto;
      min-height: 0;
    }

    /* Notification Bell */
    .notif-wrapper {
      position: relative;
      cursor: pointer;
    }
    .btn-notif {
      position: relative;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid var(--glass-border);
      background: rgba(255,255,255,0.04);
      color: var(--text-secondary);
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .btn-notif:hover, .btn-notif.has-alerts {
      border-color: rgba(239, 68, 68, 0.5);
      color: #ef4444;
      background: rgba(239, 68, 68, 0.08);
    }
    .notif-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: white;
      font-size: 0.6rem;
      font-weight: 700;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--bg-main);
    }
    .notif-panel {
      position: absolute;
      top: calc(100% + 12px);
      right: 0;
      width: 380px;
      max-width: calc(100vw - 32px);
      z-index: 99999 !important;
      padding: 0;
      overflow: hidden;
      background: #0f172a !important;
      border: 1px solid rgba(255, 255, 255, 0.18) !important;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.05);
      animation: slideDown 0.2s ease;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .notif-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px 12px;
      background: #1e293b;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .notif-header h4 {
      font-size: 0.95rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-primary);
    }
    .btn-icon {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      font-size: 0.9rem;
      transition: color 0.15s;
    }
    .btn-icon:hover { color: var(--text-primary); }
    .btn-icon-sm {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 2px 4px;
      font-size: 0.8rem;
      border-radius: 4px;
      flex-shrink: 0;
      transition: color 0.15s;
    }
    .btn-icon-sm:hover { color: #ef4444; }
    .notif-list {
      max-height: 360px;
      overflow-y: auto;
      padding: 4px 0;
      background: #0f172a;
    }
    .notif-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 20px;
      background: #0f172a;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      transition: background 0.15s;
    }
    .notif-item:hover { background: #1e293b; }
    .notif-item.critical { border-left: 4px solid #ef4444; }
    .notif-item.warning { border-left: 4px solid #f59e0b; }
    .notif-icon {
      font-size: 1.1rem;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .notif-body { flex-grow: 1; }
    .notif-title {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 2px;
    }
    .notif-msg {
      font-size: 0.75rem;
      color: var(--text-secondary);
      line-height: 1.35;
    }
    .notif-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 32px 20px;
      color: #10b981;
      font-size: 0.9rem;
      background: #0f172a;
    }
    .notif-empty i { font-size: 1.8rem; }
    .notif-footer {
      padding: 12px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      background: #1e293b;
      text-align: center;
    }
    .notif-see-all {
      color: var(--primary);
      font-size: 0.85rem;
      text-decoration: none;
      font-weight: 500;
    }
    .notif-see-all:hover { text-decoration: underline; }

    /* Responsive Drawer Styles */
    .btn-close-sidebar {
      display: none;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.2rem;
      cursor: pointer;
      margin-left: auto;
    }
    .btn-hamburger {
      display: none;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--glass-border);
      color: var(--text-primary);
      font-size: 1.3rem;
      border-radius: 8px;
      width: 38px;
      height: 38px;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-hamburger:hover {
      background: rgba(37, 99, 235, 0.2);
      color: #38bdf8;
    }

    @media (max-width: 1024px) {
      .sidebar {
        position: fixed !important;
        top: 0;
        left: 0;
        bottom: 0;
        z-index: 99999 !important;
        width: 280px;
        height: 100vh !important;
        border-radius: 0 16px 16px 0 !important;
        background: rgba(13, 19, 34, 0.98) !important;
        backdrop-filter: blur(20px) !important;
        transform: translateX(-100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 10px 0 40px rgba(0, 0, 0, 0.9);
      }
      .sidebar.mobile-open {
        transform: translateX(0) !important;
      }
      .sidebar-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(4px);
        z-index: 9990;
        animation: fadeIn 0.2s ease;
      }
      .btn-hamburger, .btn-close-sidebar {
        display: flex !important;
      }
    }

    .global-blur-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease-in-out;
    }
    .global-loader-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 36px 52px;
      border-radius: 20px;
      border: 1px solid var(--glass-border);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
      background: rgba(15, 23, 42, 0.85);
    }
    .loader-spinner-ring {
      width: 52px;
      height: 52px;
      border: 4px solid rgba(168, 85, 247, 0.2);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .loader-text {
      margin-top: 18px;
      font-size: 1.05rem;
      font-weight: 700;
      margin-bottom: 0;
      letter-spacing: 0.5px;
    }
    .spin {
      display: inline-block;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  notifSvc = inject(NotificationService);
  loadingSvc = inject(LoadingService);
  private router = inject(Router);

  localTime = new Date().toLocaleTimeString();
  showNotifPanel = false;
  mobileSidebarOpen = false;

  private clockInterval: any;

  constructor() {
    this.clockInterval = setInterval(() => {
      this.localTime = new Date().toLocaleTimeString();
    }, 1000);
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen = false;
  }

  ngOnInit(): void {
    this.notifSvc.startPolling(60000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.notifSvc.stopPolling();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notif-wrapper')) {
      this.showNotifPanel = false;
    }
  }

  toggleNotifPanel(): void {
    this.showNotifPanel = !this.showNotifPanel;
  }

  dismissNotif(id: string): void {
    this.notifSvc.dismiss(id);
  }

  username() {
    const user = this.apiService.currentUser();
    return user ? user.username : 'Guest';
  }

  role() {
    const user = this.apiService.currentUser();
    if (!user) return 'Guest';
    return typeof user.role === 'string' ? user.role : (user.role?.name || 'User');
  }

  isAdminRole(): boolean {
    const r = this.role();
    return r === 'Admin' || r === 'Super Admin';
  }

  getRoleClass(): string {
    const role = this.role();
    if (role === 'Admin' || role === 'Super Admin') return 'badge-danger';
    if (role === 'Pharmacist' || role === 'Chemist') return 'badge-success';
    return 'badge-info';
  }

  handleLogout(): void {
    this.apiService.logout();
  }
}
