import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="users-container animate-fade-in">
      <div class="page-header">
        <div>
          <h1 class="gradient-text">👥 User Management</h1>
          <p class="sub-title">Create and manage chemist system administrators, pharmacists and cashiers</p>
        </div>
        <button class="btn btn-primary-glass" (click)="openCreateModal()" id="btn-new-user">
          <i class="bi bi-person-plus-fill"></i> Add New User
        </button>
      </div>

      <!-- Users Grid/Table -->
      <div class="glass-panel mt-4">
        <div class="panel-header">
          <h3><i class="bi bi-people-fill"></i> System Users ({{ users().length }})</h3>
          <div class="search-bar">
            <i class="bi bi-search search-icon"></i>
            <input type="text" [(ngModel)]="searchQuery" (input)="filterUsers()" placeholder="Search username or email..." class="glass-input search-input">
          </div>
        </div>

        @if (loading()) {
          <div class="loading-state"><div class="spinner"></div><p>Loading system users...</p></div>
        } @else {
          <div class="glass-table-container">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email Address</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th style="text-align: center;">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (user of filteredUsers(); track user._id) {
                  <tr [class.deactivated-row]="!user.isActive">
                    <td>
                      <div class="user-info-cell">
                        <div class="avatar-sm">
                          <i class="bi bi-person-circle"></i>
                        </div>
                        <strong>{{ user.username }}</strong>
                      </div>
                    </td>
                    <td>{{ user.email }}</td>
                    <td>
                      <span class="role-badge" [class.badge-admin]="user.role?.name === 'Admin'" [class.badge-user]="user.role?.name === 'User'">
                        {{ user.role?.name || 'User' }}
                      </span>
                    </td>
                    <td>
                      <div class="form-check form-switch d-inline-block">
                        <input class="form-check-input status-toggle" type="checkbox" [checked]="user.isActive" (change)="toggleUserStatus(user)">
                        <label class="form-check-label">{{ user.isActive ? 'Active' : 'Deactivated' }}</label>
                      </div>
                    </td>
                    <td>{{ user.createdAt | date:'mediumDate' }}</td>
                    <td>
                      <div class="action-buttons">
                        <button class="btn btn-action edit" (click)="openEditModal(user)" title="Edit User">
                          <i class="bi bi-pencil-fill"></i>
                        </button>
                        <button class="btn btn-action password" (click)="openPasswordModal(user)" title="Reset Password">
                          <i class="bi bi-key-fill"></i>
                        </button>
                        <button class="btn btn-action delete" (click)="deleteUser(user)" title="Delete User">
                          <i class="bi bi-trash-fill"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- CREATE / EDIT MODAL -->
      @if (showModal()) {
        <div class="modal-backdrop animate-fade-in" (click)="closeModal()">
          <div class="modal-card glass-panel" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ isEditMode() ? '✏️ Edit User Details' : '👤 Add New System User' }}</h3>
              <button class="btn-close-modal" (click)="closeModal()">✕</button>
            </div>
            <form (submit)="saveUser()">
              <div class="modal-body">
                @if (errorMsg()) {
                  <div class="alert alert-danger">{{ errorMsg() }}</div>
                }

                <div class="form-group">
                  <label class="form-label">Username *</label>
                  <input type="text" [(ngModel)]="userForm.username" name="username" class="glass-input" required [disabled]="isEditMode()">
                </div>

                <div class="form-group mt-3">
                  <label class="form-label">Email Address *</label>
                  <input type="email" [(ngModel)]="userForm.email" name="email" class="glass-input" required>
                </div>

                @if (!isEditMode()) {
                  <div class="form-group mt-3">
                    <label class="form-label">Temporary Password *</label>
                    <input type="password" [(ngModel)]="userForm.password" name="password" class="glass-input" required minlength="4">
                  </div>
                }

                <div class="form-group mt-3">
                  <label class="form-label">Account Role *</label>
                  <select [(ngModel)]="userForm.roleName" name="roleName" class="glass-input glass-select" required>
                    <option value="User">User (Standard Access)</option>
                    <option value="Admin">Admin (Full Administrative Access)</option>
                  </select>
                </div>

                @if (isEditMode()) {
                  <div class="form-group mt-3">
                    <div class="form-check form-switch">
                      <input class="form-check-input" type="checkbox" [(ngModel)]="userForm.isActive" name="isActive" id="modal-status">
                      <label class="form-check-label" for="modal-status">Account Active Status</label>
                    </div>
                  </div>
                }
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary-glass" (click)="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary-glass">
                  {{ isEditMode() ? 'Save Changes' : 'Create User Account' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- RESET PASSWORD MODAL -->
      @if (showPasswordModal()) {
        <div class="modal-backdrop animate-fade-in" (click)="closePasswordModal()">
          <div class="modal-card glass-panel" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>🔑 Reset User Password</h3>
              <button class="btn-close-modal" (click)="closePasswordModal()">✕</button>
            </div>
            <form (submit)="resetPasswordSubmit()">
              <div class="modal-body">
                @if (errorMsg()) {
                  <div class="alert alert-danger">{{ errorMsg() }}</div>
                }
                <p style="font-size: 13px; color: #ddd;">
                  You are resetting the password for user: <strong>{{ selectedUser().username }}</strong>.
                </p>
                <div class="form-group mt-3">
                  <label class="form-label">New Password *</label>
                  <input type="password" [(ngModel)]="newPassword" name="newPassword" class="glass-input" required minlength="4" placeholder="Enter new password...">
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary-glass" (click)="closePasswordModal()">Cancel</button>
                <button type="submit" class="btn btn-primary-glass">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- TOAST MESSAGES -->
      @if (toastMessage()) {
        <div class="toast-notification animate-slide-up">
          <i class="bi bi-info-circle-fill"></i> {{ toastMessage() }}
        </div>
      }
    </div>
  `,
  styles: [`
    .users-container {
      padding: 10px;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .sub-title {
      font-size: 0.9rem;
      color: var(--text-muted);
      margin: 4px 0 0 0;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 15px;
      margin-bottom: 20px;
    }
    .panel-header h3 {
      font-size: 1.1rem;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .search-bar {
      position: relative;
      width: 250px;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
    }
    .search-input {
      padding-left: 36px;
      font-size: 13px;
    }
    .user-info-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .avatar-sm {
      font-size: 1.5rem;
      color: #38bdf8;
      display: flex;
      align-items: center;
    }
    .deactivated-row {
      opacity: 0.65;
      background: rgba(0,0,0,0.15);
    }
    .role-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-admin {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid #ef4444;
      color: #fca5a5;
    }
    .badge-user {
      background: rgba(56, 189, 248, 0.2);
      border: 1px solid #0284c7;
      color: #bae6fd;
    }
    .action-buttons {
      display: flex;
      justify-content: center;
      gap: 8px;
    }
    .btn-action {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      width: 32px;
      height: 32px;
      border-radius: 8px;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-action:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
    }
    .btn-action.edit:hover {
      color: #38bdf8;
      border-color: #38bdf8;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
    }
    .btn-action.password:hover {
      color: #fbbf24;
      border-color: #fbbf24;
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
    }
    .btn-action.delete:hover {
      color: #f87171;
      border-color: #f87171;
      box-shadow: 0 0 10px rgba(248, 113, 113, 0.3);
    }
    .deactivated-row td strong {
      text-decoration: line-through;
      color: var(--text-muted);
    }
    
    /* Swtich styling */
    .form-switch .form-check-input {
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='rgba(255, 255, 255, 0.25)'/%3e%3c/svg%3e");
      border-color: rgba(255, 255, 255, 0.2);
      cursor: pointer;
    }
    .form-switch .form-check-input:checked {
      background-color: #10b981;
      border-color: #10b981;
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='%23fff'/%3e%3c/svg%3e");
    }

    /* Modal Backdrop */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 20px;
    }
    .modal-card {
      width: 100%;
      max-width: 480px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      animation: zoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes zoomIn {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-header {
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .modal-header h3 {
      font-size: 1.1rem;
      margin: 0;
      color: #fff;
    }
    .btn-close-modal {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 16px;
    }
    .btn-close-modal:hover {
      color: #fff;
    }
    .modal-body {
      padding: 24px;
    }
    .modal-footer {
      padding: 16px 24px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(0, 0, 0, 0.15);
    }
    .toast-notification {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #bae6fd;
      padding: 14px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
      backdrop-filter: blur(10px);
      z-index: 2000;
      font-size: 13.5px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
  `]
})
export class UsersComponent implements OnInit {
  private apiService = inject(ApiService);

  users = signal<any[]>([]);
  filteredUsers = signal<any[]>([]);
  loading = signal<boolean>(false);
  
  showModal = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  showPasswordModal = signal<boolean>(false);
  selectedUser = signal<any>(null);

  searchQuery: string = '';
  errorMsg = signal<string | null>(null);
  toastMessage = signal<string | null>(null);

  // Form binds
  userForm = {
    _id: '',
    username: '',
    email: '',
    password: '',
    roleName: 'User',
    isActive: true
  };
  newPassword = '';

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.apiService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.filterUsers();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load users', err);
        this.loading.set(false);
      }
    });
  }

  filterUsers(): void {
    if (!this.searchQuery.trim()) {
      this.filteredUsers.set(this.users());
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredUsers.set(
      this.users().filter(u => 
        u.username.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query)
      )
    );
  }

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.errorMsg.set(null);
    this.userForm = {
      _id: '',
      username: '',
      email: '',
      password: '',
      roleName: 'User',
      isActive: true
    };
    this.showModal.set(true);
  }

  openEditModal(user: any): void {
    this.isEditMode.set(true);
    this.errorMsg.set(null);
    this.userForm = {
      _id: user._id,
      username: user.username,
      email: user.email,
      password: '',
      roleName: user.role?.name || 'User',
      isActive: user.isActive
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  openPasswordModal(user: any): void {
    this.selectedUser.set(user);
    this.newPassword = '';
    this.errorMsg.set(null);
    this.showPasswordModal.set(true);
  }

  closePasswordModal(): void {
    this.showPasswordModal.set(false);
    this.selectedUser.set(null);
  }

  saveUser(): void {
    this.errorMsg.set(null);
    if (this.isEditMode()) {
      // Edit mode
      const payload = {
        email: this.userForm.email,
        roleName: this.userForm.roleName,
        isActive: this.userForm.isActive
      };
      this.apiService.updateUser(this.userForm._id, payload).subscribe({
        next: () => {
          this.triggerToast(`User account '${this.userForm.username}' updated successfully.`);
          this.showModal.set(false);
          this.loadUsers();
        },
        error: (err) => {
          this.errorMsg.set(err.error?.message || 'Failed to update user.');
        }
      });
    } else {
      // Create mode
      const payload = {
        username: this.userForm.username,
        email: this.userForm.email,
        password: this.userForm.password,
        roleName: this.userForm.roleName
      };
      this.apiService.createUser(payload).subscribe({
        next: () => {
          this.triggerToast(`User account '${this.userForm.username}' created successfully.`);
          this.showModal.set(false);
          this.loadUsers();
        },
        error: (err) => {
          this.errorMsg.set(err.error?.message || 'Failed to create user.');
        }
      });
    }
  }

  resetPasswordSubmit(): void {
    this.errorMsg.set(null);
    if (!this.newPassword || this.newPassword.trim().length < 4) {
      this.errorMsg.set('Password must be at least 4 characters long.');
      return;
    }

    const payload = { newPassword: this.newPassword };
    const user = this.selectedUser();
    this.apiService.resetUserPassword(user._id, payload).subscribe({
      next: () => {
        this.triggerToast(`Password reset successfully for ${user.username}.`);
        this.showPasswordModal.set(false);
      },
      error: (err) => {
        this.errorMsg.set(err.error?.message || 'Failed to reset password.');
      }
    });
  }

  toggleUserStatus(user: any): void {
    const nextStatus = !user.isActive;
    this.apiService.updateUser(user._id, { isActive: nextStatus }).subscribe({
      next: () => {
        this.triggerToast(`Account status for '${user.username}' changed to ${nextStatus ? 'Active' : 'Inactive'}.`);
        this.loadUsers();
      },
      error: (err) => {
        this.triggerToast(err.error?.message || 'Failed to toggle account status.');
        this.loadUsers();
      }
    });
  }

  deleteUser(user: any): void {
    if (confirm(`Are you sure you want to permanently delete user account '${user.username}'?`)) {
      this.apiService.deleteUser(user._id).subscribe({
        next: () => {
          this.triggerToast(`User account '${user.username}' deleted.`);
          this.loadUsers();
        },
        error: (err) => {
          this.triggerToast(err.error?.message || 'Failed to delete user.');
        }
      });
    }
  }

  private triggerToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 4000);
  }
}
