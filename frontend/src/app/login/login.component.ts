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
      <div class="glass-panel animate-fade-in login-card">
        <div class="logo-area">
          <i class="bi bi-heart-pulse-fill logo-icon"></i>
          <h1 class="gradient-text">MediLog</h1>
          <p>Pharmacy Management System</p>
        </div>

        @if (errorMessage()) {
          <div class="error-alert">
            <i class="bi bi-exclamation-triangle-fill"></i>
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
              placeholder="Enter username"
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
              placeholder="Enter password"
              required>
          </div>

          <button type="submit" class="btn btn-primary w-100 mt-2" [disabled]="loading()">
            @if (loading()) {
              <span class="spinner"></span> Logging in...
            } @else {
              <i class="bi bi-box-arrow-in-right"></i> Sign In
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
    }
    .login-card {
      width: 100%;
      max-width: 440px;
      padding: 40px 32px;
    }
    .logo-area {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo-icon {
      font-size: 3rem;
      color: #a855f7;
      display: inline-block;
      margin-bottom: 10px;
      filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.4));
    }
    .logo-area h1 {
      font-size: 2.2rem;
      margin-bottom: 4px;
    }
    .logo-area p {
      color: var(--text-secondary);
      font-size: 0.95rem;
    }
    .error-alert {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #f87171;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 0.9rem;
    }
    .w-100 { width: 100%; }
    .mt-2 { margin-top: 8px; }
    .mt-4 { margin-top: 24px; }
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
    .demo-accounts {
      border-top: 1px solid var(--glass-border);
      padding-top: 20px;
    }
    .demo-title {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
      margin-bottom: 10px;
      font-weight: 600;
    }
    .demo-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .btn-demo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--glass-border);
      border-radius: 6px;
      padding: 8px 12px;
      color: var(--text-primary);
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s ease;
      text-align: left;
    }
    .btn-demo:hover {
      background: var(--glass-hover);
      border-color: var(--primary);
    }
    .btn-demo span {
      font-weight: 500;
    }
    .btn-demo code {
      font-family: monospace;
      color: var(--text-secondary);
      background: rgba(0, 0, 0, 0.2);
      padding: 2px 6px;
      border-radius: 4px;
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
