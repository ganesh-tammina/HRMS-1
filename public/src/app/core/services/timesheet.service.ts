import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class TimesheetService {
  private env = environment;
  private baseUrl = `http://${this.env.apiURL}/api/timesheets`;

  constructor(private http: HttpClient) {}

  /* ================= SUBMIT TIMESHEET ================= */

  uploadClientTimesheet(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/client-timesheet/upload`, formData);
  }

  submitRegularTimesheet(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/regular/submit`, payload);
  }

  submitProjectTimesheet(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/project/submit`, payload);
  }

  /* ================= GET MY TIMESHEETS ================= */

  getMyRegularTimesheets(filters: {
    start_date?: string; end_date?: string; month?: number; year?: number;
  }): Observable<any> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params = params.set(key, value.toString());
    });
    return this.http.get(`${this.baseUrl}/regular/my-timesheets`, { params });
  }

  getMyProjectTimesheets(filters: {
    start_date?: string; end_date?: string; month?: number; year?: number; project_id?: number;
  }): Observable<any> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params = params.set(key, value.toString());
    });
    return this.http.get(`${this.baseUrl}/project/my-timesheets`, { params });
  }

  /* ================= ASSIGNMENT STATUS ================= */

  getAssignmentStatus(): Observable<{ has_project: boolean; timesheet_type: 'regular' | 'project'; }> {
    return this.http.get<{ has_project: boolean; timesheet_type: 'regular' | 'project'; }>(
      `${this.baseUrl}/assignment-status`
    );
  }

  /* ================= MANAGER: PENDING TIMESHEETS ================= */

  getManagerPendingTimesheets(filters?: {
    start_date?: string; end_date?: string; timesheet_type?: string;
  }): Observable<any[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params = params.set(key, value.toString());
      });
    }
    return this.http.get<any[]>(`${this.baseUrl}/manager/pending-timesheets`, { params });
  }

  /* ================= MANAGER: TEAM STATISTICS ================= */

  getManagerTeamStatistics(filters?: { start_date?: string; end_date?: string; }): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params = params.set(key, value.toString());
      });
    }
    return this.http.get<any>(`${this.baseUrl}/manager/team-statistics`, { params });
  }

  /* ================= MANAGER: APPROVE / REJECT ================= */

  approveTimesheet(timesheetId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/manager/approve/${timesheetId}`, {});
  }

  rejectTimesheet(timesheetId: number, rejectionReason: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/manager/reject/${timesheetId}`, { rejection_reason: rejectionReason });
  }

  /* ================= DOWNLOAD / REPORTS ================= */

  downloadTimesheetExcel(timesheetId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/regular/${timesheetId}/download`, { responseType: 'blob' });
  }

  getTeamTimesheetReport(startDate: string, endDate: string): Observable<any[]> {
    const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
    return this.http.get<any[]>(`${this.baseUrl}/team-report`, { params });
  }
}
