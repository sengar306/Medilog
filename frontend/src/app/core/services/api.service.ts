import { Injectable, inject, signal, isDevMode } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Uses Render backend in production, localhost in development
  private apiUrl = isDevMode()
    ? 'http://localhost:5000'
    : 'https://medilog-dza5.onrender.com';

  get baseUrl(): string {
    return this.apiUrl;
  }

  // User State
  currentUser = signal<any>(this.getUserFromLocalStorage());
  token = signal<string | null>(localStorage.getItem('token'));

  // Get HTTP headers with Authorization token
  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    const token = this.token();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private getUserFromLocalStorage(): any {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // --- Auth API ---
  login(credentials: { username: string; password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(res => {
        if (res && res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res));
          this.token.set(res.token);
          this.currentUser.set(res);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!this.token();
  }

  hasRole(roles: string[]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    const rName = typeof user.role === 'string' ? user.role : (user.role?.name || 'User');
    if (rName === 'Admin' || rName === 'Super Admin') return true;
    if (roles.includes(rName)) return true;
    if (roles.includes('User') && (rName === 'Chemist' || rName === 'User')) return true;
    if (roles.includes('Chemist') && (rName === 'Chemist' || rName === 'User')) return true;
    return false;
  }

  // --- Medicines & Racks API ---
  getMedicines(userId?: string): Observable<any[]> {
    let url = `${this.apiUrl}/medicines`;
    if (userId) url += `?userId=${userId}`;
    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }

  createMedicine(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/medicines`, data, { headers: this.getHeaders() });
  }

  updateMedicine(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/medicines/${id}`, data, { headers: this.getHeaders() });
  }

  deleteMedicine(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/medicines/${id}`, { headers: this.getHeaders() });
  }

  getRacks(userId?: string): Observable<any[]> {
    let url = `${this.apiUrl}/medicines/racks`;
    if (userId) url += `?userId=${userId}`;
    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }

  createRack(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/medicines/racks`, data, { headers: this.getHeaders() });
  }

  // --- Suppliers API ---
  getSuppliers(userId?: string): Observable<any[]> {
    let url = `${this.apiUrl}/suppliers`;
    if (userId) url += `?userId=${userId}`;
    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }

  createSupplier(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/suppliers`, data, { headers: this.getHeaders() });
  }

  // --- Inventory API ---
  getInventory(status?: string, medicineId?: string, search?: string, userId?: string): Observable<any[]> {
    let url = `${this.apiUrl}/inventory`;
    const params: string[] = [];
    if (status) params.push(`status=${status}`);
    if (medicineId) params.push(`medicineId=${medicineId}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (userId) params.push(`userId=${userId}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    
    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }

  getLowStock(userId?: string): Observable<any[]> {
    let url = `${this.apiUrl}/inventory/low-stock`;
    if (userId) url += `?userId=${userId}`;
    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }

  getStockLedger(medicineId?: string, userId?: string): Observable<any[]> {
    let url = `${this.apiUrl}/inventory/ledger`;
    const params: string[] = [];
    if (medicineId) params.push(`medicineId=${medicineId}`);
    if (userId) params.push(`userId=${userId}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }

  // --- Purchases API ---
  getPurchases(userId?: string): Observable<any[]> {
    let url = `${this.apiUrl}/purchase/list`;
    if (userId) url += `?userId=${userId}`;
    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }

  getPurchaseDetails(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/purchase/${id}`, { headers: this.getHeaders() });
  }

  createPurchase(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/purchase`, data, { headers: this.getHeaders() });
  }

  // --- Sales API ---
  getSales(userId?: string): Observable<any[]> {
    let url = `${this.apiUrl}/sales/list`;
    if (userId) url += `?userId=${userId}`;
    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }

  getSaleDetails(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/sales/${id}`, { headers: this.getHeaders() });
  }

  createSale(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/sales`, data, { headers: this.getHeaders() });
  }

  // --- Invoice Parser API ---
  uploadInvoice(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('invoice', file);
    
    let headers = new HttpHeaders();
    const token = this.token();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return this.http.post<any>(`${this.apiUrl}/invoice/upload`, formData, { headers });
  }

  getParserResult(jobId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/invoice/result/${jobId}`, { headers: this.getHeaders() });
  }

  confirmInvoiceImport(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/invoice/confirm`, data, { headers: this.getHeaders() });
  }

  // --- Reports API ---
  getDashboardMetrics(userId?: string): Observable<any> {
    let url = `${this.apiUrl}/reports/dashboard`;
    if (userId) url += `?userId=${userId}`;
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }

  getAuditLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/reports/audit-logs`, { headers: this.getHeaders() });
  }

  // --- Customers API ---
  getCustomers(userId?: string): Observable<any[]> {
    let url = `${this.apiUrl}/customers`;
    if (userId) url += `?userId=${userId}`;
    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }

  createCustomer(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/customers`, data, { headers: this.getHeaders() });
  }

  // --- WhatsApp API ---
  getWhatsAppConfig(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/whatsapp/config`, { headers: this.getHeaders() });
  }

  saveWhatsAppConfig(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/whatsapp/config`, data, { headers: this.getHeaders() });
  }

  getWhatsAppQR(chemistPhone?: string, businessName?: string): Observable<any> {
    const params = chemistPhone ? `?chemistPhone=${chemistPhone}&businessName=${encodeURIComponent(businessName || '')}` : '';
    return this.http.get<any>(`${this.apiUrl}/whatsapp/qr${params}`, { headers: this.getHeaders() });
  }

  confirmWhatsAppAuth(chemistPhone: string, businessName: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/whatsapp/confirm-auth`, { chemistPhone, businessName }, { headers: this.getHeaders() });
  }

  logoutWhatsApp(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/whatsapp/logout`, {}, { headers: this.getHeaders() });
  }

  sendWhatsAppInvoice(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/whatsapp/send-invoice`, payload, { headers: this.getHeaders() });
  }

  sendExistingBillWhatsApp(saleId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/whatsapp/send-existing-bill`, { saleId }, { headers: this.getHeaders() });
  }

  // --- Advanced Reports API ---
  getSalesSummary(from?: string, to?: string, userId?: string): Observable<any> {
    const params: string[] = [];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    if (userId) params.push(`userId=${userId}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<any>(`${this.apiUrl}/reports/sales-summary${qs}`, { headers: this.getHeaders() });
  }

  getTopMedicines(limit = 10, from?: string, to?: string, userId?: string): Observable<any> {
    const params: string[] = [`limit=${limit}`];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    if (userId) params.push(`userId=${userId}`);
    return this.http.get<any>(`${this.apiUrl}/reports/top-medicines?${params.join('&')}`, { headers: this.getHeaders() });
  }

  getProfitAnalysis(from?: string, to?: string, userId?: string): Observable<any> {
    const params: string[] = [];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    if (userId) params.push(`userId=${userId}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<any>(`${this.apiUrl}/reports/profit-analysis${qs}`, { headers: this.getHeaders() });
  }

  getGstSummary(from?: string, to?: string, userId?: string): Observable<any> {
    const params: string[] = [];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    if (userId) params.push(`userId=${userId}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<any>(`${this.apiUrl}/reports/gst-summary${qs}`, { headers: this.getHeaders() });
  }

  getCustomerHistory(customerId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reports/customer-history/${customerId}`, { headers: this.getHeaders() });
  }

  // --- Prescriptions API ---
  getPrescriptions(filters?: any): Observable<any> {
    const params: string[] = [];
    if (filters?.customerId) params.push(`customerId=${filters.customerId}`);
    if (filters?.status) params.push(`status=${filters.status}`);
    if (filters?.from) params.push(`from=${filters.from}`);
    if (filters?.to) params.push(`to=${filters.to}`);
    if (filters?.search) params.push(`search=${encodeURIComponent(filters.search)}`);
    if (filters?.userId) params.push(`userId=${filters.userId}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<any>(`${this.apiUrl}/prescriptions${qs}`, { headers: this.getHeaders() });
  }

  getPrescription(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/prescriptions/${id}`, { headers: this.getHeaders() });
  }

  createPrescription(formData: FormData): Observable<any> {
    let headers = new HttpHeaders();
    const token = this.token();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return this.http.post<any>(`${this.apiUrl}/prescriptions`, formData, { headers });
  }

  updatePrescription(id: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/prescriptions/${id}`, data, { headers: this.getHeaders() });
  }

  deletePrescription(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/prescriptions/${id}`, { headers: this.getHeaders() });
  }

  // --- Notifications API ---
  getActiveNotifications(userId?: string): Observable<any> {
    let url = `${this.apiUrl}/notifications/active`;
    if (userId) url += `?userId=${userId}`;
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }

  dismissNotification(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/notifications/dismiss/${encodeURIComponent(id)}`, {}, { headers: this.getHeaders() });
  }

  // --- Loyalty API ---
  getLoyaltyProfile(customerId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/loyalty/${customerId}`, { headers: this.getHeaders() });
  }

  getLoyaltyLeaderboard(userId?: string): Observable<any> {
    let url = `${this.apiUrl}/loyalty/top/leaderboard`;
    if (userId) url += `?userId=${userId}`;
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }

  adjustLoyaltyPoints(customerId: string, points: number, reason: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/loyalty/${customerId}/adjust`, { points, reason }, { headers: this.getHeaders() });
  }

  // --- Purchase Returns API ---
  getPurchaseReturns(userId?: string): Observable<any> {
    let url = `${this.apiUrl}/purchase-returns`;
    if (userId) url += `?userId=${userId}`;
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }

  getPurchaseReturn(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/purchase-returns/${id}`, { headers: this.getHeaders() });
  }

  createPurchaseReturn(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/purchase-returns`, data, { headers: this.getHeaders() });
  }

  updatePurchaseReturnStatus(id: string, status: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/purchase-returns/${id}/status`, { status }, { headers: this.getHeaders() });
  }

  // --- Medicine Transfers API ---
  getTransfers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/transfers`, { headers: this.getHeaders() });
  }

  createTransfer(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/transfers`, data, { headers: this.getHeaders() });
  }

  acceptTransfer(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/transfers/${id}/accept`, {}, { headers: this.getHeaders() });
  }

  rejectTransfer(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/transfers/${id}/reject`, {}, { headers: this.getHeaders() });
  }

  cancelTransfer(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/transfers/${id}/cancel`, {}, { headers: this.getHeaders() });
  }

  // --- Users API ---
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`, { headers: this.getHeaders() });
  }

  createUser(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users`, data, { headers: this.getHeaders() });
  }

  updateUser(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/users/${id}`, data, { headers: this.getHeaders() });
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() });
  }

  resetUserPassword(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/users/${id}/reset-password`, data, { headers: this.getHeaders() });
  }

  // --- POS Bill & Chemist Profile API ---
  uploadLogo(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('logo', file);
    let headers = new HttpHeaders();
    const token = this.token();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return this.http.post<any>(`${this.apiUrl}/whatsapp/logo`, formData, { headers });
  }

  getSalePdfUrl(saleId: string): string {
    const t = this.token();
    const tokenQs = t ? `?token=${encodeURIComponent(t)}` : '';
    return `${this.apiUrl}/sales/${saleId}/pdf${tokenQs}`;
  }

  downloadSalePdf(saleId: string): Observable<Blob> {
    let headers = new HttpHeaders();
    const token = this.token();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return this.http.get(`${this.apiUrl}/sales/${saleId}/download`, {
      headers,
      responseType: 'blob'
    });
  }

  getSalePdfBlob(saleId: string): Observable<Blob> {
    let headers = new HttpHeaders();
    const token = this.token();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return this.http.get(`${this.apiUrl}/sales/${saleId}/pdf`, {
      headers,
      responseType: 'blob'
    });
  }
}
