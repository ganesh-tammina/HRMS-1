import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface EmployeeInfo {
  id: number;
  name: string;
  email: string;
  department: string;
  designation: string;
  salary: number;
  joinDate: string;
  status: string;
}

export interface DashboardStats {
  totalWorkingEmployees: number;
  activePayrollStructures: number;
  pendingPayrolls: number;
  totalPayrollValue: number;
}

@Injectable({
  providedIn: 'root'
})
export class FinanceAdminService {
  private env = environment;
  private baseUrl = `http://${this.env.apiURL}/api`;

  private workingEmployeesSubject = new BehaviorSubject<EmployeeInfo[]>([]);
  public workingEmployees$ = this.workingEmployeesSubject.asObservable();

  private dashboardStatsSubject = new BehaviorSubject<DashboardStats | null>(null);
  public dashboardStats$ = this.dashboardStatsSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return new HttpHeaders({
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Get all working employees
   * @param page Page number (1-indexed)
   * @param pageSize Number of records per page
   * @param search Search term for name/email
   */
  getWorkingEmployees(page: number = 1, pageSize: number = 20, search: string = ''): Observable<any> {
    let url = `${this.baseUrl}/employees`;
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', pageSize.toString());
    if (search) {
      params.append('search', search);
    }
    params.append('status', 'Working'); // Only get working employees

    return this.http.get<any>(`${url}?${params.toString()}`, { headers: this.getHeaders() });
  }

  /**
   * Get count of working employees
   */
  getWorkingEmployeesCount(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/employees/count?status=Working`, { headers: this.getHeaders() });
  }

  /**
   * Get dashboard summary for finance admin
   */
  getDashboardSummary(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.baseUrl}/finance-admin/dashboard`, { headers: this.getHeaders() });
  }

  /**
   * Get employee payroll details
   * @param employeeId Employee ID
   */
  getEmployeePayrollDetails(employeeId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/payroll/employee/${employeeId}`, { headers: this.getHeaders() });
  }

  /**
   * Update working employees in memory
   */
  updateWorkingEmployees(employees: EmployeeInfo[]): void {
    this.workingEmployeesSubject.next(employees);
  }

  /**
   * Update dashboard stats in memory
   */
  updateDashboardStats(stats: DashboardStats): void {
    this.dashboardStatsSubject.next(stats);
  }
}
