import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface LeavePlan {
  id: number;
  name: string;
  description?: string;
  leave_year_start_month: number;
  leave_year_start_day: number;
  is_active: number;
  employees_count?: number;
  allocations?: any[];
}

@Injectable({ providedIn: 'root' })
export class LeavePlanService {
  private env = environment;
  private baseUrl = `http://${this.env.apiURL}/api`;

  constructor(private http: HttpClient) { }

  getLeavePlans(): Observable<LeavePlan[]> {
    return this.http.get<LeavePlan[]>(`${this.baseUrl}/leaves/plans`);
  }

  getLeavePlanById(id: number): Observable<LeavePlan> {
    return this.http.get<LeavePlan>(`${this.baseUrl}/leaves/plans/${id}`);
  }

  createLeavePlan(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/leaves/plans`, payload);
  }

  updateLeavePlan(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/leaves/plans/${id}`, payload);
  }

  deleteLeavePlan(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/leave-plans/${id}`);
  }
}
