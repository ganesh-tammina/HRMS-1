import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment'

@Injectable({
  providedIn: 'root',
})
export class TimesheetService {
  /**
   * Upload client timesheet (Excel/PDF/Image) for validation
   * @param formData FormData with file, month, year, project_id
   */
  uploadClientTimesheet(formData: FormData): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/client-timesheet/upload`,
      formData
    );
  }

  private env = environment;
  private baseUrl = `http://${this.env.apiURL}/api/timesheets`;

  constructor(private http: HttpClient) { }

  /* ================= SUBMIT TIMESHEET ================= */

  submitRegularTimesheet(payload: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/regular/submit`,
      payload
    );
  }

  /* ================= SUBMIT PROJECT TIMESHEET ================= */

  submitProjectTimesheet(payload: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/project/submit`,
      payload
    );
  }

  /* ================= GET MY TIMESHEETS ================= */

  getMyRegularTimesheets(filters: {
    start_date?: string;
    end_date?: string;
    month?: number;
    year?: number;
  }): Observable<any> {

    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get(
      `${this.baseUrl}/regular/my-timesheets`,
      { params }
    );
  }

  /* ================= DOWNLOAD EXCEL ================= */

  downloadTimesheetExcel(timesheetId: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/regular/${timesheetId}/download`,
      { responseType: 'blob' }
    );
  }

  /* ================= GET MY PROJECT TIMESHEETS ================= */

  getMyProjectTimesheets(filters: {
    start_date?: string;
    end_date?: string;
    month?: number;
    year?: number;
    project_id?: number;
  }): Observable<any> {

    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get(
      `${this.baseUrl}/project/my-timesheets`,
      { params }
    );
  }

  /* ================= ASSIGNMENT STATUS ================= */

  getAssignmentStatus(): Observable<{
    has_project: boolean;
    timesheet_type: 'regular' | 'project';
  }> {
    return this.http.get<{
      has_project: boolean;
      timesheet_type: 'regular' | 'project';
    }>(
      `${this.baseUrl}/assignment-status`
    );
  }

  /* ================= MANAGER: GET PENDING TIMESHEETS ================= */

  /**
   * Get pending timesheets for manager's team
   * @param filters Optional filters for date range and timesheet type
   */
  getManagerPendingTimesheets(filters?: {
    start_date?: string;
    end_date?: string;
    timesheet_type?: string;
  }): Observable<any[]> {

    let params = new HttpParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<any[]>(
      `${this.baseUrl}/manager/pending-timesheets`,
      { params }
    );
  }

  /* ================= MANAGER: GET TEAM STATISTICS ================= */

  /**
   * Get team statistics for manager (team size, submitted, not submitted)
   * @param filters Optional filters for date range
   */
  getManagerTeamStatistics(filters?: {
    start_date?: string;
    end_date?: string;
  }): Observable<any> {

    let params = new HttpParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<any>(
      `${this.baseUrl}/manager/team-statistics`,
      { params }
    );
  }

  /* ================= MANAGER: APPROVE TIMESHEET ================= */

  /**
   * Approve a timesheet
   * @param timesheetId ID of the timesheet to approve
   */
  approveTimesheet(timesheetId: number): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/manager/approve/${timesheetId}`,
      {}
    );
  }

  /* ================= MANAGER: REJECT TIMESHEET ================= */

  /**
   * Reject a timesheet with reason
   * @param timesheetId ID of the timesheet to reject
   * @param rejectionReason Reason for rejection
   */
  rejectTimesheet(timesheetId: number, rejectionReason: string): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/manager/reject/${timesheetId}`,
      { rejection_reason: rejectionReason }
    );
  }

  /**
   * Get team timesheet report for a date range
   * @param startDate YYYY-MM-DD
   * @param endDate YYYY-MM-DD
   */
  getTeamTimesheetReport(startDate: string, endDate: string): Observable<any[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<any[]>(
      `${this.baseUrl}/team-report`,
      { params }
    );
  }

  /**
   * Get aggregated client timesheet report for a month/year
   * @param month 1-12
   * @param year YYYY
   */
  getClientTimesheetReport(month: number, year: number): Observable<any[]> {
    const params = new HttpParams()
      .set('month', month.toString())
      .set('year', year.toString());

    return this.http.get<any[]>(
      `${this.baseUrl}/client-timesheet-report`,
      { params }
    );
  }
}