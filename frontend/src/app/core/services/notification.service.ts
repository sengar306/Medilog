import { Injectable, inject, signal, effect } from '@angular/core';
import { ApiService } from './api.service';

export interface AppNotification {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  expiryDate?: string;
  medicine?: any;
  batch?: any;
  currentStock?: number;
  minStock?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiService = inject(ApiService);

  notifications = signal<AppNotification[]>([]);
  counts = signal<{ expired: number; criticalExpiry: number; warningExpiry: number; lowStock: number }>({
    expired: 0, criticalExpiry: 0, warningExpiry: 0, lowStock: 0
  });
  totalCount = signal<number>(0);
  isLoading = signal<boolean>(false);

  private pollInterval: any = null;

  /**
   * Start polling for notifications. Call this from the layout component.
   */
  startPolling(intervalMs = 60000): void {
    this.fetchNotifications();
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => this.fetchNotifications(), intervalMs);
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  fetchNotifications(): void {
    if (!this.apiService.isAuthenticated()) return;

    this.isLoading.set(true);
    this.apiService.getActiveNotifications().subscribe({
      next: (data) => {
        const inventoryNotifs = data.notifications || [];
        
        // Also fetch stockist order notifications
        this.apiService.getStockistNotifications().subscribe({
          next: (stockistNotifs) => {
            const mappedStockistNotifs: AppNotification[] = (stockistNotifs || []).map((sn: any) => ({
              id: sn._id,
              type: sn.type || 'stockist_order',
              severity: sn.severity === 'critical' ? 'critical' : (sn.severity === 'warning' ? 'warning' : 'info'),
              title: sn.title,
              message: sn.message
            }));

            const combined = [...mappedStockistNotifs, ...inventoryNotifs];
            this.notifications.set(combined);
            this.counts.set(data.counts || { expired: 0, criticalExpiry: 0, warningExpiry: 0, lowStock: 0 });
            this.totalCount.set(combined.length);
            this.isLoading.set(false);
          },
          error: () => {
            this.notifications.set(inventoryNotifs);
            this.counts.set(data.counts || { expired: 0, criticalExpiry: 0, warningExpiry: 0, lowStock: 0 });
            this.totalCount.set(inventoryNotifs.length);
            this.isLoading.set(false);
          }
        });
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  dismiss(id: string): void {
    // Check if it's a stockist DB notification (MongoDB ObjectId hex string length 24)
    if (id.length === 24) {
      this.apiService.dismissStockistNotification(id).subscribe({
        next: () => {
          this.notifications.update(list => list.filter(n => n.id !== id));
          this.totalCount.update(c => Math.max(0, c - 1));
        }
      });
    } else {
      this.apiService.dismissNotification(id).subscribe({
        next: () => {
          this.notifications.update(list => list.filter(n => n.id !== id));
          this.totalCount.update(c => Math.max(0, c - 1));
        }
      });
    }
  }

  getSeverityColor(severity: string): string {
    if (severity === 'critical') return '#ef4444';
    if (severity === 'warning') return '#f59e0b';
    return '#3b82f6';
  }

  getSeverityIcon(type: string): string {
    if (type === 'expired') return 'bi-x-octagon-fill';
    if (type === 'near_expiry_critical') return 'bi-exclamation-diamond-fill';
    if (type === 'low_stock') return 'bi-archive-fill';
    if (type === 'stockist_order_created') return 'bi-box-seam-fill';
    if (type === 'stockist_order_updated') return 'bi-truck-front-fill';
    return 'bi-bell-fill';
  }
}
