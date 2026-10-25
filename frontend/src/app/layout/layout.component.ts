import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ApiService } from '../core/services/api.service';
import { NotificationService } from '../core/services/notification.service';
import { LoadingService } from '../core/services/loading.service';
import { ThemeService } from '../core/services/theme.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout-wrapper">
      <!-- Full Screen Loading Overlay -->
      @if (loadingSvc.isLoading()) {
        <div class="global-blur-overlay">
          <div class="global-loader-card">
            <div class="loader-spinner-ring"></div>
            <p class="loader-text">Processing Request...</p>
          </div>
        </div>
      }

      <!-- Mobile Sidebar Backdrop Overlay -->
      @if (mobileSidebarOpen) {
        <div class="sidebar-backdrop" (click)="closeMobileSidebar()"></div>
      }

      <!-- Sidebar -->
      <aside class="sidebar" [class.mobile-open]="mobileSidebarOpen">
        <div class="sidebar-logo">
          <div style="display: flex; align-items: center; gap: 6px;">
            <img src="assets/logo-icon.svg" alt="M+" (error)="$any($event.target).src = '/logo-icon.svg'" style="height: 36px; width: 36px; object-fit: contain; filter: drop-shadow(0 2px 8px rgba(139, 92, 246, 0.35));">
            <span class="logo-text" style="color: var(--text-primary); font-weight: 800; font-size: 1.35rem; letter-spacing: -0.6px; line-height: 1;">ediLog</span>
          </div>
          <button class="btn-close-sidebar" (click)="closeMobileSidebar()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section-label">Main</div>
          <a routerLink="/dashboard" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-grid-1x2"></i>
            <span>Dashboard</span>
          </a>

          <a routerLink="/medicines" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-capsule"></i>
            <span>Medicines</span>
          </a>

          <a routerLink="/inventory" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-archive"></i>
            <span>Inventory</span>
            @if (notifSvc.counts().lowStock > 0) {
              <span class="nav-badge danger">{{ notifSvc.counts().lowStock }}</span>
            }
          </a>

          <div class="nav-section-label">Operations</div>

          <a routerLink="/purchases" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-cart-check"></i>
            <span>Purchase</span>
          </a>

          <a routerLink="/purchase-returns" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-arrow-return-left"></i>
            <span>Returns</span>
          </a>

          <a routerLink="/invoice-parser" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-robot"></i>
            <span>AI Invoice OCR</span>
            <span class="nav-ai-badge">AI</span>
          </a>

          <a routerLink="/billing" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-receipt"></i>
            <span>Billing (POS)</span>
          </a>

          <a routerLink="/prescriptions" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-file-earmark-medical"></i>
            <span>Prescriptions</span>
          </a>

          <div class="nav-section-label">Directory</div>

          <a routerLink="/customers" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-people"></i>
            <span>Customers</span>
          </a>

          <a routerLink="/suppliers" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-truck"></i>
            <span>Suppliers</span>
          </a>

          <div class="nav-section-label">Analytics</div>

          <a routerLink="/reports" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-bar-chart-line"></i>
            <span>Reports</span>
          </a>

          <a routerLink="/expiry-alerts" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-calendar-event"></i>
            <span>Expiry Alerts</span>
            @if (notifSvc.counts().criticalExpiry > 0 || notifSvc.counts().expired > 0) {
              <span class="nav-badge danger">{{ notifSvc.counts().criticalExpiry + notifSvc.counts().expired }}</span>
            }
          </a>

          <a routerLink="/marketing" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-megaphone"></i>
            <span>Marketing Studio</span>
            <span class="nav-ai-badge">NEW</span>
          </a>

          <div class="nav-section-label">Wholesale</div>

          @if (isStockistRole()) {
            <a routerLink="/stockist-catalog" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
              <i class="bi bi-box-seam"></i>
              <span>Wholesale Catalog</span>
            </a>

            <a routerLink="/stockist-orders" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
              <i class="bi bi-truck-front"></i>
              <span>Incoming Orders</span>
            </a>
          } @else {
            <a routerLink="/stockist-marketplace" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
              <i class="bi bi-shop-window"></i>
              <span>Stockist Market</span>
            </a>

            <a routerLink="/my-b2b-orders" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
              <i class="bi bi-bag-check"></i>
              <span>My B2B Orders</span>
            </a>
          }

          @if (isAdminRole()) {
            <div class="nav-section-label">Admin</div>
            <a routerLink="/users" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
              <i class="bi bi-shield-lock"></i>
              <span>Users</span>
            </a>
          }

          <a routerLink="/settings" (click)="closeMobileSidebar()" routerLinkActive="active-tab" class="nav-item">
            <i class="bi bi-gear"></i>
            <span>Settings</span>
          </a>
        </nav>

        <!-- Sidebar Footer -->
        <div class="sidebar-footer">
          <div class="user-badge">
            <div class="user-avatar">
              {{ username().charAt(0).toUpperCase() }}
            </div>
            <div class="user-details">
              <p class="user-name">{{ username() }}</p>
              <span class="user-role" [ngClass]="getRoleClass()">{{ role() }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Layout Right Column -->
      <div class="main-column">
        <!-- Top Bar Header -->
        <header class="header-bar">
          <div class="header-left">
            <button class="btn-hamburger" (click)="toggleMobileSidebar()">
              <i class="bi bi-list"></i>
            </button>
            <div class="header-breadcrumb">
              <h2>{{ getPageTitle() }}</h2>
            </div>
          </div>
          <div class="header-right">
            <!-- Theme Switcher Segmented Control -->
            <div class="theme-segmented-control">
              <button type="button" 
                      class="theme-segment-btn" 
                      [class.active]="themeSvc.themeMode() === 'light'" 
                      (click)="themeSvc.setThemeMode('light')" 
                      title="Light Theme">
                <i class="bi bi-sun-fill"></i>
                <span>Light</span>
              </button>
              <button type="button" 
                      class="theme-segment-btn" 
                      [class.active]="themeSvc.themeMode() === 'dark'" 
                      (click)="themeSvc.setThemeMode('dark')" 
                      title="Dark Theme">
                <i class="bi bi-moon-stars-fill"></i>
                <span>Dark</span>
              </button>
              <button type="button" 
                      class="theme-segment-btn" 
                      [class.active]="themeSvc.themeMode() === 'system'" 
                      (click)="themeSvc.setThemeMode('system')" 
                      title="System Preference">
                <i class="bi bi-gear-fill"></i>
                <span>System</span>
              </button>
            </div>

            <div class="time-widget">
              <i class="bi bi-clock"></i>
              <span>{{ localTime }}</span>
            </div>

            <!-- Notification Bell -->
            <div class="notif-wrapper" (click)="toggleNotifPanel()">
              <button class="btn-notif" [class.has-alerts]="notifSvc.totalCount() > 0">
                <i class="bi bi-bell"></i>
                @if (notifSvc.totalCount() > 0) {
                  <span class="notif-badge">{{ notifSvc.totalCount() > 9 ? '9+' : notifSvc.totalCount() }}</span>
                }
              </button>

              <!-- Notification Dropdown Panel -->
              @if (showNotifPanel) {
                <div class="notif-panel" (click)="$event.stopPropagation()">
                  <div class="notif-header">
                    <h4><i class="bi bi-bell"></i> Alerts ({{ notifSvc.totalCount() }})</h4>
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
                        <i class="bi bi-check-circle"></i>
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
    /* ============================
       Layout Shell
       ============================ */
    .layout-wrapper {
      display: flex;
      min-height: 100vh;
      width: 100vw;
      background: var(--bg-main);
    }

    /* ============================
       Sidebar
       ============================ */
    .sidebar {
      width: 260px;
      display: flex;
      flex-direction: column;
      height: 100vh;
      position: sticky;
      top: 0;
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border);
      padding: 0;
      flex-shrink: 0;
      overflow: hidden;
      box-shadow: none;
      border-radius: 0;
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 20px 16px;
      border-bottom: 1px solid var(--border);
    }

    .logo-mark {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: var(--primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .logo-text-group {
      display: flex;
      flex-direction: column;
    }

    .logo-text {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-primary);
      letter-spacing: -0.03em;
      line-height: 1.2;
    }

    .logo-subtitle {
      font-size: 0.65rem;
      color: var(--text-muted);
      font-weight: 500;
      letter-spacing: 0.02em;
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex-grow: 1;
      overflow-y: auto;
      padding: 12px 12px;
    }

    .nav-section-label {
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 16px 12px 6px;
    }

    .nav-section-label:first-child {
      padding-top: 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      color: var(--text-secondary);
      text-decoration: none;
      border-radius: var(--radius-md);
      font-weight: 500;
      font-size: 0.87rem;
      transition: all 200ms ease;
      position: relative;
      border: 1px solid transparent;
    }

    .nav-item i {
      font-size: 1.05rem;
      width: 20px;
      text-align: center;
    }

    .nav-item:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .active-tab {
      background: rgba(15, 118, 110, 0.08) !important;
      color: var(--primary) !important;
      font-weight: 600;
      border-color: transparent;
    }

    .active-tab::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 20px;
      background: var(--primary);
      border-radius: 0 3px 3px 0;
    }

    .active-tab i {
      color: var(--primary);
    }

    .nav-badge {
      margin-left: auto;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
    }
    .nav-badge.danger {
      background: rgba(220, 38, 38, 0.1);
      color: var(--danger);
    }

    .nav-ai-badge {
      margin-left: auto;
      font-size: 0.55rem;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--primary-glow);
      color: var(--primary);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    /* Sidebar Footer */
    .sidebar-footer {
      border-top: 1px solid var(--border);
      padding: 16px 20px;
    }
    .user-badge {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--primary-glow);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      font-weight: 700;
      flex-shrink: 0;
    }
    .user-details {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .user-name {
      font-weight: 600;
      font-size: 0.87rem;
      color: var(--text-primary);
      margin: 0;
    }
    .user-role {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
      display: inline-block;
      width: fit-content;
    }

    /* ============================
       Main Content Area
       ============================ */
    .main-column {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      height: 100vh;
      min-width: 0;
      background: var(--bg-main);
    }

    .header-bar {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      flex-shrink: 0;
      position: relative;
      z-index: 1100;
      background: var(--bg-header);
      border-bottom: 1px solid var(--border);
      border-radius: 0;
      box-shadow: none;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-breadcrumb h2 {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* ============================
       Theme Switcher Segmented Control
       ============================ */
    .theme-segmented-control {
      display: flex;
      align-items: center;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 3px;
      gap: 2px;
    }
    .theme-segment-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      font-size: 0.78rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
      border: none;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 150ms ease;
      white-space: nowrap;
    }
    .theme-segment-btn:hover {
      color: var(--text-primary);
      background: var(--bg-hover);
    }
    .theme-segment-btn.active {
      background: var(--primary);
      color: #FFFFFF !important;
      box-shadow: 0 1px 3px var(--primary-glow);
    }

    .time-widget {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      font-size: 0.8rem;
      color: var(--text-secondary);
      background: var(--bg-card);
    }

    .btn-logout {
      padding: 6px 14px;
      font-size: 0.82rem;
      height: 34px;
    }

    .content-area {
      flex-grow: 1;
      overflow-y: auto;
      min-height: 0;
      padding: 24px;
    }

    /* ============================
       Notification Bell
       ============================ */
    .notif-wrapper {
      position: relative;
      cursor: pointer;
    }
    .btn-notif {
      position: relative;
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text-secondary);
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 200ms ease;
    }
    .btn-notif:hover {
      border-color: var(--primary);
      color: var(--primary);
      background: var(--bg-active);
    }
    .btn-notif.has-alerts {
      border-color: var(--danger);
      color: var(--danger);
      background: rgba(220, 38, 38, 0.05);
    }
    .notif-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      background: var(--danger);
      color: white;
      font-size: 0.55rem;
      font-weight: 700;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--bg-header);
    }

    /* Notification Panel */
    .notif-panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 380px;
      max-width: calc(100vw - 32px);
      z-index: 99999 !important;
      padding: 0;
      overflow: hidden;
      background: var(--bg-card) !important;
      border: 1px solid var(--border) !important;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      animation: slideDown 0.15s ease;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .notif-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 12px;
      background: var(--bg-muted);
      border-bottom: 1px solid var(--border);
    }
    .notif-header h4 {
      font-size: 0.9rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-primary);
      margin: 0;
    }
    .btn-icon {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      font-size: 0.9rem;
      transition: color 150ms;
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
      transition: color 150ms;
    }
    .btn-icon-sm:hover { color: var(--danger); }
    .notif-list {
      max-height: 360px;
      overflow-y: auto;
      padding: 4px 0;
    }
    .notif-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border-light);
      transition: background 150ms;
    }
    .notif-item:hover { background: var(--bg-hover); }
    .notif-item:last-child { border-bottom: none; }
    .notif-item.critical { border-left: 3px solid var(--danger); }
    .notif-item.warning { border-left: 3px solid var(--warning); }
    .notif-icon {
      font-size: 1rem;
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
      color: var(--success);
      font-size: 0.85rem;
    }
    .notif-empty i { font-size: 1.6rem; }
    .notif-footer {
      padding: 10px 16px;
      border-top: 1px solid var(--border);
      text-align: center;
    }
    .notif-see-all {
      color: var(--primary);
      font-size: 0.82rem;
      text-decoration: none;
      font-weight: 500;
    }
    .notif-see-all:hover { text-decoration: underline; }

    /* ============================
       Responsive
       ============================ */
    .btn-close-sidebar {
      display: none;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.1rem;
      cursor: pointer;
      margin-left: auto;
      padding: 4px;
    }
    .btn-hamburger {
      display: none;
      background: var(--bg-card);
      border: 1px solid var(--border);
      color: var(--text-primary);
      font-size: 1.2rem;
      border-radius: var(--radius-md);
      width: 36px;
      height: 36px;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 200ms;
    }
    .btn-hamburger:hover {
      background: var(--bg-active);
      color: var(--primary);
      border-color: var(--primary);
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
        border-radius: 0 !important;
        background: var(--bg-sidebar) !important;
        transform: translateX(-100%);
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.1);
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
        background: rgba(15, 23, 42, 0.4);
        backdrop-filter: blur(2px);
        z-index: 9990;
        animation: fadeIn 0.2s ease;
      }
      .btn-hamburger, .btn-close-sidebar {
        display: flex !important;
      }
      .content-area {
        padding: 16px;
      }
    }

    @media (max-width: 768px) {
      .header-bar {
        padding: 0 16px;
      }
      .content-area {
        padding: 12px;
      }
    }

    /* ============================
       Global Loader
       ============================ */
    .global-blur-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(248, 250, 252, 0.85);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.15s ease-in-out;
    }
    .global-loader-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 36px 52px;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-xl);
      background: var(--bg-card);
    }
    .loader-spinner-ring {
      width: 44px;
      height: 44px;
      border: 3px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    .loader-text {
      margin-top: 16px;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--primary);
      margin-bottom: 0;
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
  themeSvc = inject(ThemeService);
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

  isStockistRole(): boolean {
    const r = this.role();
    return r === 'Stockist';
  }

  getRoleClass(): string {
    const role = this.role();
    if (role === 'Admin' || role === 'Super Admin') return 'badge-danger';
    if (role === 'Pharmacist' || role === 'Chemist') return 'badge-success';
    if (role === 'Stockist') return 'badge-warning';
    return 'badge-info';
  }

  getPageTitle(): string {
    const url = this.router.url;
    if (url.includes('dashboard')) return 'Dashboard';
    if (url.includes('medicines')) return 'Medicines';
    if (url.includes('inventory')) return 'Inventory';
    if (url.includes('purchase-returns')) return 'Purchase Returns';
    if (url.includes('purchases')) return 'Purchase';
    if (url.includes('invoice-parser')) return 'AI Invoice OCR';
    if (url.includes('billing')) return 'Billing (POS)';
    if (url.includes('prescriptions')) return 'Prescriptions';
    if (url.includes('customers')) return 'Customers';
    if (url.includes('suppliers')) return 'Suppliers';
    if (url.includes('reports')) return 'Reports';
    if (url.includes('expiry-alerts')) return 'Expiry Alerts';
    if (url.includes('stockist-catalog')) return 'Wholesale Catalog';
    if (url.includes('stockist-orders')) return 'Incoming Orders';
    if (url.includes('stockist-marketplace')) return 'Stockist Marketplace';
    if (url.includes('b2b-orders')) return 'B2B Orders';
    if (url.includes('users')) return 'User Management';
    if (url.includes('settings')) return 'Settings';
    return 'Pharmacy Hub';
  }

  handleLogout(): void {
    this.apiService.logout();
  }
}
