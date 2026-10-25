import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card animate-fade-in">
        <div class="logo-area" style="text-align: center; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px;">
            <img src="assets/logo-icon.svg" alt="M+" (error)="$any($event.target).src = '/logo-icon.svg'" style="height: 52px; width: 52px; object-fit: contain; filter: drop-shadow(0 4px 14px rgba(139, 92, 246, 0.45));">
            <h1 style="margin: 0; font-size: 2.6rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.6px; line-height: 1;">ediLog</h1>
          </div>
          <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">Pharmacy Inventory & Billing Platform</p>
        </div>

        @if (errorMessage()) {
          <div class="error-alert">
            <i class="bi bi-exclamation-triangle"></i>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form (ngSubmit)="handleLogin()">
          <div class="form-group">
            <label class="form-label" for="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              [(ngModel)]="username"
              class="glass-input"
              placeholder="Enter your username"
              required>
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              [(ngModel)]="password"
              class="glass-input"
              placeholder="Enter your password"
              required>
          </div>

          <button type="submit" class="btn btn-primary w-100 mt-2" [disabled]="loading()">
            @if (loading()) {
              <span class="spinner"></span> Signing in...
            } @else {
              <i class="bi bi-arrow-right"></i> Sign In
            }
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
      background: linear-gradient(135deg, #F0FDFA 0%, #F8FAFC 50%, #EFF6FF 100%);
    }
    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 40px 32px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
    }
    .logo-area {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo-mark {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-lg);
      background: var(--primary);
      color: white;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .logo-area h1 {
      font-size: 1.8rem;
      font-weight: 800;
      color: var(--text-primary);
      margin-bottom: 4px;
      letter-spacing: -0.03em;
    }
    .logo-area p {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin: 0;
    }
    .error-alert {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(220, 38, 38, 0.06);
      border: 1px solid rgba(220, 38, 38, 0.2);
      color: #B91C1C;
      padding: 12px 14px;
      border-radius: var(--radius-md);
      margin-bottom: 20px;
      font-size: 0.87rem;
    }
    .w-100 { width: 100%; }
    .mt-2 { margin-top: 8px; }
    .spinner {
      display: inline-block;
      width: 1rem;
      height: 1rem;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class LoginComponent {
  private apiService = inject(ApiService);
  private router = inject(Router);

  username = '';
  password = '';
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  handleLogin(): void {
    if (!this.username || !this.password) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.apiService.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Login failed. Please check connection.');
      }
    });
  }

  autofill(user: string, pass: string): void {
    this.username = user;
    this.password = pass;
    this.handleLogin();
  }
}
