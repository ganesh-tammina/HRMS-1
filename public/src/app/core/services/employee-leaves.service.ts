import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class EmployeeLeavesService {
  private env = environment;
  private readonly API_URL = `http://${this.env.apiURL}/api/leaves`;

  constructor(private http: HttpClient) {}

  getLeaveBalance(year: number, employeeId?: number): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${token}`,
    });
    let params = new HttpParams().set('leave_year', year.toString());
    if (employeeId) {
      params = params.set('employeeId', String(employeeId));
    }
    return this.http.get<any>(`${this.API_URL}/balance`, { headers, params });
  }

  initializeBalance(employeeId: number, leavePlanId: number, year: number): Observable<any> {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    const body = { leave_plan_id: leavePlanId, leave_year: year };
    return this.http.post<any>(`${this.API_URL}/initialize-balance/${employeeId}`, body, { headers });
  }
}
