import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FinanceServiceService {

  private baseUrl = `http://${environment.apiURL}/api/payroll/salary/structure`;
  private employeeBaseUrl = `http://${environment.apiURL}/api/employees`;

  constructor(private http: HttpClient) { }

  /** GET Salary Structure by Employee ID */
  getSalaryStructure(employeeId: number): Observable<any> {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');

    const headers = new HttpHeaders({
      accept: '*/*',
      Authorization: `Bearer ${token}`
    });

    return this.http.get(`${this.baseUrl}/${employeeId}`, { headers });
  }

  /** ✅ NEW: GET Employee Details */
  getEmployeeDetails(employeeId: number): Observable<any> {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');

    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${token}`
    });

    return this.http.get(
      `${this.employeeBaseUrl}/${employeeId}/details`,
      { headers }
    );
  }
}
