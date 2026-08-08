import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="customers-container animate-fade-in">
      <div class="header-section">
        <div>
          <h1>Customer Accounts Directory</h1>
          <p>Register new patients and manage client contact histories for POS invoicing.</p>
        </div>
      </div>

      <!-- Messages -->
      @if (successMessage()) {
        <div class="alert alert-success">
          <i class="bi bi-check-circle-fill"></i>
          <span>{{ successMessage() }}</span>
        </div>
      }
      @if (errorMessage()) {
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle-fill"></i>
          <span>{{ errorMessage() }}</span>
        </div>
      }

      <div class="split-view">
        <!-- List Column -->
        <div class="list-column glass-panel">
          <div class="list-header">
            <h3>Registered Customers</h3>
            <span class="badge badge-info">{{ customers().length }} Total</span>
          </div>

          <div class="glass-table-container">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone Number</th>
                  <th>Email Address</th>
                  <th>Home Address</th>
                  <th>Registered On</th>
                </tr>
              </thead>
              <tbody>
                @for (cust of customers(); track cust._id) {
                  <tr>
                    <td><strong>{{ cust.name }}</strong></td>
                    <td><code>{{ cust.phone || 'N/A' }}</code></td>
                    <td>{{ cust.email || 'N/A' }}</td>
                    <td><small>{{ cust.address || 'Walk-in client' }}</small></td>
                    <td>{{ cust.createdAt | date:'mediumDate' }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="text-center text-muted">No customers registered yet.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Add Customer Form Column -->
        <div class="form-column glass-panel">
          <h3>Register New Customer</h3>
          
          <form (ngSubmit)="handleAddCustomer()" class="mt-3">
            <div class="form-group">
              <label class="form-label">Full Name *</label>
              <input type="text" [(ngModel)]="customerForm.name" name="name" class="glass-input" placeholder="e.g. John Doe" required>
            </div>

            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="text" [(ngModel)]="customerForm.phone" name="phone" class="glass-input" placeholder="e.g. 9876543210">
            </div>

            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" [(ngModel)]="customerForm.email" name="email" class="glass-input" placeholder="e.g. john@email.com">
            </div>

            <div class="form-group">
              <label class="form-label">Postal Address</label>
              <input type="text" [(ngModel)]="customerForm.address" name="address" class="glass-input" placeholder="City, Street, H.No...">
            </div>

            <button type="submit" class="btn btn-primary w-100 mt-2">
              <i class="bi bi-person-plus-fill"></i> Save Customer
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .customers-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    .split-view {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
    }
    @media (max-width: 992px) {
      .split-view {
        grid-template-columns: 1fr;
      }
    }
    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .w-100 { width: 100%; }
    .mt-3 { margin-top: 16px; }
    .mt-2 { margin-top: 8px; }
    
    .alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      border-radius: 8px;
      font-size: 0.9rem;
    }
    .alert-success {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #34d399;
    }
    .alert-danger {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
  `]
})
export class CustomersComponent implements OnInit {
  private apiService = inject(ApiService);

  customers = signal<any[]>([]);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  customerForm = {
    name: '',
    phone: '',
    email: '',
    address: ''
  };

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.apiService.getCustomers().subscribe({
      next: (data) => this.customers.set(data),
      error: (err) => console.error(err)
    });
  }

  clearAlerts(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  handleAddCustomer(): void {
    this.clearAlerts();

    this.apiService.createCustomer(this.customerForm).subscribe({
      next: (res) => {
        this.successMessage.set(`Customer '${res.name}' registered successfully!`);
        this.loadCustomers();
        this.customerForm = {
          name: '',
          phone: '',
          email: '',
          address: ''
        };
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to register customer');
      }
    });
  }
}
