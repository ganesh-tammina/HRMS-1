import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, tap, shareReplay } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AttendanceApiService {
  private env = environment;
  private readonly BASE_URL = `http://${this.env.apiURL}/api/attendance`;

  private clockStateSubject = new BehaviorSubject<boolean>(false);
  clockState$ = this.clockStateSubject.asObservable();

  private punchRefreshSubject = new Subject<void>();
  punchRefresh$ = this.punchRefreshSubject.asObservable();

  constructor(private http: HttpClient) {}

  setClockState(isClockedIn: boolean): void {
    this.clockStateSubject.next(isClockedIn);
  }

  getClockState(): boolean {
    return this.clockStateSubject.value;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  apiPunchIn(payload: { work_mode: string; location: string; notes?: string }): Observable<any> {
    return this.http.post(`${this.BASE_URL}/punch-in`, payload, { headers: this.getHeaders() }).pipe(
      tap((res: any) => {
        if (res?.success) {
          this.clearCaches();
          this.setClockState(true);
          this.punchRefreshSubject.next();
        }
      })
    );
  }

  apiPunchOut(payload: { notes?: string }): Observable<any> {
    return this.http.post(`${this.BASE_URL}/punch-out`, payload, { headers: this.getHeaders() }).pipe(
      tap((res: any) => {
        if (res?.success) {
          this.clearCaches();
          this.setClockState(false);
          this.punchRefreshSubject.next();
        }
      })
    );
  }

  private todayAttendance$: Observable<any> | null = null;

  getTodayAttendance(force = false): Observable<any> {
    if (!force && this.todayAttendance$) return this.todayAttendance$;
    this.todayAttendance$ = this.http.get(`${this.BASE_URL}/today`, { headers: this.getHeaders() }).pipe(
      tap((res: any) => {
        const punches = res?.punches || [];
        if (punches.length > 0) {
          this.setClockState(punches[punches.length - 1].punch_type === 'in');
        } else {
          this.setClockState(false);
        }
      }),
      shareReplay(1)
    );
    return this.todayAttendance$;
  }

  getMonthlyReport(params: { startDate: string; endDate: string; month: number; year: number }): Observable<any> {
    const httpParams = new HttpParams()
      .set('startDate', params.startDate)
      .set('endDate', params.endDate)
      .set('month', params.month.toString())
      .set('year', params.year.toString());
    return this.http.get(`${this.BASE_URL}/my-report`, { headers: this.getHeaders(), params: httpParams });
  }

  getEmployeeReport(employeeId: number, params: { startDate: string; endDate: string; month: number; year: number }): Observable<any> {
    const httpParams = new HttpParams()
      .set('startDate', params.startDate)
      .set('endDate', params.endDate)
      .set('month', params.month.toString())
      .set('year', params.year.toString());
    return this.http.get<any>(`${this.BASE_URL}/report/employee/${employeeId}`, { headers: this.getHeaders(), params: httpParams });
  }

  getAttendanceDetailsByDate(date: string): Observable<any> {
    return this.http.get(`${this.BASE_URL}/details/${date}`, { headers: this.getHeaders() });
  }

  getMonthlyAttendanceSummary(): Observable<any> {
    return this.http.get(`${this.BASE_URL}/monthly-summary`, { headers: this.getHeaders() });
  }

  checkTodayWFH(): Observable<any> {
    return this.http.get(`${this.BASE_URL}/check-wfh-today`, { headers: this.getHeaders() });
  }

  /* ================= BULK STATUS (My Team real-time) ================= */

  bulkStatusCheck(employeeIds: number[]): Observable<any> {
    return this.http.post(`${this.BASE_URL}/bulk-status`, { employee_ids: employeeIds }, { headers: this.getHeaders() });
  }

  /* ================= REMOTE CLOCK-IN REQUESTS (Manager) ================= */

  getPendingRemoteClockinRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/remote-clockin/pending`, { headers: this.getHeaders() });
  }

  decideRemoteClockinRequest(id: number, decision: 'approved' | 'rejected', rejected_reason?: string): Observable<any> {
    return this.http.put(`${this.BASE_URL}/remote-clockin/${id}/decide`, { decision, rejected_reason }, { headers: this.getHeaders() });
  }

  private clearCaches() {
    this.todayAttendance$ = null;
  }
}
