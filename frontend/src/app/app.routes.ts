import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './login/login.component';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MedicineComponent } from './medicine/medicine.component';
import { InventoryComponent } from './inventory/inventory.component';
import { SupplierComponent } from './supplier/supplier.component';
import { InvoiceParserComponent } from './invoice-parser/invoice-parser.component';
import { BillingComponent } from './billing/billing.component';
import { ReportsComponent } from './reports/reports.component';
import { CustomersComponent } from './customers/customers.component';
import { ExpiryAlertsComponent } from './expiry-alerts/expiry-alerts.component';
import { PrescriptionComponent } from './prescriptions/prescription.component';
import { PurchaseReturnComponent } from './supplier/purchase-return.component';
import { UsersComponent } from './users/users.component';
import { SettingsComponent } from './settings/settings.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'medicines', component: MedicineComponent },
      { path: 'inventory', component: InventoryComponent },
      { path: 'suppliers', component: SupplierComponent },
      { path: 'purchases', component: SupplierComponent }, // Reuse SupplierComponent, logic handles tab
      { path: 'purchase-returns', component: PurchaseReturnComponent },
      { path: 'invoice-parser', component: InvoiceParserComponent },
      { path: 'billing', component: BillingComponent },
      { path: 'prescriptions', component: PrescriptionComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'customers', component: CustomersComponent },
      { path: 'expiry-alerts', component: ExpiryAlertsComponent },
      { path: 'users', component: UsersComponent },
      { path: 'settings', component: SettingsComponent }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
