import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// Interface for Leave Plan with member and leave type counts
export interface LeavePlan {
  id: number;
  name: string;
  description?: string;
  leave_year_start_month: number;
  leave_year_start_day: number;
  is_active: number;
  employees_count?: number;
  leave_types_count?: number;
  total_days?: number;
  allocations?: any[];
}

@Injectable({
  providedIn: 'root',
})
export class LeavePlanService {

  private env = environment;
  private readonly ENHANCED_API_URL = `http://${this.env.apiURL}/api/leaves/plans`;
  private readonly MASTER_API_URL = `http://${this.env.apiURL}/api/leave-plans`;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  /* CREATE */
  createLeavePlan(payload: any): Observable<any> {
    return this.http.post(this.ENHANCED_API_URL, payload, { headers: this.getHeaders() });
  }

  /* GET ALL - Now includes employees_count and leave_types_count */
  getLeavePlans(): Observable<LeavePlan[]> {
    return this.http.get<LeavePlan[]>(this.ENHANCED_API_URL, { headers: this.getHeaders() });
  }

  /* GET BY ID (AS PER CURL) */
  getLeavePlanById(planId: number): Observable<LeavePlan> {
    return this.http.get<LeavePlan>(`${this.ENHANCED_API_URL}/${planId}`, {
      headers: this.getHeaders(),
    });
  }

  /* UPDATE */
  updateLeavePlan(planId: number, payload: any): Observable<any> {
    return this.http.put(`${this.ENHANCED_API_URL}/${planId}`, payload, {
      headers: this.getHeaders(),
    });
  }

  /* DELETE */
  deleteLeavePlan(planId: number): Observable<any> {
    return this.http.delete(`${this.MASTER_API_URL}/${planId}`, {
      headers: this.getHeaders(),
    });
  }
}
