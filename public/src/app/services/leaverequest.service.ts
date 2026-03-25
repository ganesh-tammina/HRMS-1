import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface MyLeave {
  id: number;
  leave_type: string;
  from_date: string;
  to_date: string;
  days: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  applied_on: string;
  // Optional fields for backend compatibility
  type_name?: string;
  type_code?: string;
  start_date?: string;
  end_date?: string;
}

@Injectable({
  providedIn: 'root',
})
export class LeaverequestService {
  private env = environment;
  private readonly API_URL = `http://${this.env.apiURL}/api/leaves`;

  /** 🔹 STATE MANAGEMENT */
  private myLeavesSubject = new BehaviorSubject<MyLeave[]>([]);
  myLeaves$ = this.myLeavesSubject.asObservable();

  constructor(private http: HttpClient) { }

  /* ================= APPLY LEAVE ================= */
  applyLeave(payload: {
    leave_type_id: number;
    start_date: string;
    end_date: string;
    total_days: number;
    reason: string;
  }): Observable<any> {

    return this.http.post<any>(
      `${this.API_URL}/apply`,
      payload
    ).pipe(
      tap((res) => {
        // 🔹 Optimistic UI update
        const newLeave: MyLeave = {
          id: Date.now(), // temporary id
          leave_type: res.leave_type ?? 'Leave',
          from_date: payload.start_date,
          to_date: payload.end_date,
          days: payload.total_days,
          status: 'PENDING',
          applied_on: new Date().toISOString()
        };

        this.myLeavesSubject.next([
          newLeave,
          ...this.myLeavesSubject.value
        ]);
      })
    );
  }

  /* ================= GET MY LEAVES ================= */
  getMyLeaves(leaveYear: number): Observable<MyLeave[]> {
    const params = new HttpParams()
      .set('leave_year', leaveYear.toString());

    return this.http.get<MyLeave[]>(
      `${this.API_URL}/my-leaves`,
      { params }
    ).pipe(
      tap((leaves) => this.myLeavesSubject.next(leaves))
    );
  }

  /** 🔹 DIRECT ACCESS (optional) */
  getCurrentLeaves(): MyLeave[] {
    return this.myLeavesSubject.value;
  }

  private leaveRequestsSource = new BehaviorSubject<any[]>([]);
  leaveRequests$ = this.leaveRequestsSource.asObservable();

  setLeaveRequests(requests: any[]) {
    this.leaveRequestsSource.next(requests);
  }

  getLeaveRequests(): any[] {
    return this.leaveRequestsSource.value;
  }

  /* ================= APPROVE LEAVE ================= */
  approveLeave(leaveId: number, remarks: string): Observable<any> {
    return this.http.put(
      `${this.API_URL}/approve/${leaveId}`,
      { remarks }
    );
  }

  /* ================= REJECT LEAVE ================= */
  rejectLeave(leaveId: number, rejection_reason: string): Observable<any> {
    return this.http.put(
      `${this.API_URL}/reject/${leaveId}`,
      { rejection_reason }
    );
  }

  getPendingLeaveRequests(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.API_URL}/pending`
    ).pipe(
      tap((requests) => {
        // Optional: keep in shared state if needed
        this.leaveRequestsSource.next(requests);
      })
    );
  }

  getTeamLeaveReport(startDate: string, endDate: string): Observable<any[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<any[]>(
      `${this.API_URL}/team-report`,
      { params }
    );
  }

}
