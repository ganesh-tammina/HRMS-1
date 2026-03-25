import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, shareReplay, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AttendanceApiService {
  private env = environment;
  private readonly BASE_URL = `http://${this.env.apiURL}/api/attendance`;

  // Shared clock state - broadcasts to all clock button instances
  private clockStateSubject = new BehaviorSubject<boolean>(false);
  clockState$ = this.clockStateSubject.asObservable();

  // Observable for refreshing shared reports (e.g. on Home page)
  private punchRefreshSubject = new Subject<void>();
  punchRefresh$ = this.punchRefreshSubject.asObservable();

  constructor(private http: HttpClient) { }

  // Update clock state (called from anywhere)
  setClockState(isClockedIn: boolean): void {
    this.clockStateSubject.next(isClockedIn);
    console.log('🔔 Clock state updated globally:', isClockedIn ? 'Clocked In' : 'Clocked Out');
  }

  /**
   * MANAGER: Get all pending remote clock-in requests for their team
   */
  getPendingRemoteClockinRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/remote-requests/pending`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * MANAGER: Approve or reject a remote clock-in request
   * @param id Request ID
   * @param decision 'approved' | 'rejected'
   * @param rejected_reason Reason for rejection (optional)
   */
  decideRemoteClockinRequest(id: number, decision: 'approved' | 'rejected', rejected_reason?: string): Observable<any> {
    return this.http.post(
      `${this.BASE_URL}/remote-request/${id}/decision`,
      { decision, rejected_reason },
      { headers: this.getHeaders() }
    );
  }

  // ...existing code...

  // Get current clock state
  getClockState(): boolean {
    return this.clockStateSubject.value;
  }

  /** ✅ PUNCH IN */
  apiPunchIn(payload: {
    work_mode: string;
    location: string;
    notes?: string;
  }): Observable<any> {
    return this.http.post(
      `${this.BASE_URL}/punch-in`,
      payload,
      { headers: this.getHeaders() }
    ).pipe(
      tap((res: any) => {
        if (res?.success) {
          this.clearCaches();
          this.setClockState(true); // Broadcast clock in state
          this.punchRefreshSubject.next(); // Trigger UI refreshes
        }
      })
    );
  }

  /** ✅ PUNCH OUT */
  apiPunchOut(payload: {
    notes?: string;
  }): Observable<any> {
    return this.http.post(
      `${this.BASE_URL}/punch-out`,
      payload,
      { headers: this.getHeaders() }
    ).pipe(
      tap((res: any) => {
        if (res?.success) {
          this.clearCaches();
          this.setClockState(false); // Broadcast clock out state
          this.punchRefreshSubject.next(); // Trigger UI refreshes
        }
      })
    );
  }

  /* ======================
 * 📊 MONTHLY REPORT
 * ====================== */
  getMonthlyReport(params: {
    startDate: string; // format: YYYY-MM-D
    endDate: string;   // format: YYYY-MM-DD
    month: number;     // 1-12
    year: number;      // YYYY
  }): Observable<any> {

    const httpParams = new HttpParams()
      .set('startDate', params.startDate)
      .set('endDate', params.endDate)
      .set('month', params.month.toString())
      .set('year', params.year.toString());

    return this.http.get(
      `${this.BASE_URL}/my-report`,
      {
        headers: this.getHeaders(),
        params: httpParams,
      }
    );
  }

  /** ✅ GET MONTHLY ATTENDANCE SUMMARY */
  getMonthlyAttendanceSummary(month?: number, year?: number): Observable<any> {
    const d = new Date();
    const m = month || (d.getMonth() + 1);
    const y = year || d.getFullYear();

    const httpParams = new HttpParams()
      .set('month', m.toString())
      .set('year', y.toString());

    return this.http.get(
      `${this.BASE_URL}/my-report`,
      {
        headers: this.getHeaders(),
        params: httpParams,
      }
    );
  }
  private todayAttendance$: Observable<any> | null = null;

  /** 📅 TODAY ATTENDANCE */
  getTodayAttendance(force = false): Observable<any> {
    if (!force && this.todayAttendance$) {
      return this.todayAttendance$;
    }

    this.todayAttendance$ = this.http.get(
      `${this.BASE_URL}/today`,
      { headers: this.getHeaders() }
    ).pipe(
      tap((res: any) => {
        const punches = res?.punches || [];
        if (punches.length > 0) {
          const lastPunch = punches[punches.length - 1];
          this.setClockState(lastPunch.punch_type === 'in');
        } else {
          this.setClockState(false);
        }
      }),
      shareReplay(1)
    );

    return this.todayAttendance$;
  }

  // Clear cache after punch
  private clearCaches() {
    this.todayAttendance$ = null;
  }

  getAttendanceDetailsByDate(date: string): Observable<any> {
    return this.http.get(
      `${this.BASE_URL}/details/${date}`,
      { headers: this.getHeaders() }
    );
  }

  /** 🏠 WORK FROM HOME – CHECK TODAY */
  checkTodayWFH(): Observable<any> {
    return this.http.get(
      `http://${this.env.apiURL}/api/leaves/wfh-check-today`,
      { headers: this.getHeaders() }
    );
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';

    return new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }
}
