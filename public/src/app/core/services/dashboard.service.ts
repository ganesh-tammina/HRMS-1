import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private env = environment;
  private readonly API_URL = `http://${this.env.apiURL}/api/attendance`;
  
  private clockStateSubject = new BehaviorSubject<boolean>(false);
  clockState$ = this.clockStateSubject.asObservable();
  
  private monthlyReportSubject = new BehaviorSubject<any[]>([]);
  monthlyReport$ = this.monthlyReportSubject.asObservable();

  constructor(private http: HttpClient) {
    this.checkInitialClockState();
  }

  getClockState(): boolean {
    return this.clockStateSubject.value;
  }

  private checkInitialClockState() {
    const state = localStorage.getItem('isClockedIn') === 'true';
    this.clockStateSubject.next(state);
  }

  loadMonthlyReport(year: number, month: number): Observable<any[]> {
    const token = localStorage.getItem('token');
    return this.http.get<any[]>(`${this.API_URL}/report/monthly?year=${year}&month=${month}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(
      tap(report => this.monthlyReportSubject.next(report))
    );
  }

  punch(action: 'IN' | 'OUT'): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.post(`${this.API_URL}/punch`, { action }, {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(
      tap(() => {
        this.clockStateSubject.next(action === 'IN');
        localStorage.setItem('isClockedIn', (action === 'IN').toString());
      })
    );
  }
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private env = environment;
  private readonly API_URL = `http://${this.env.apiURL}/api/admin`;

  constructor(private http: HttpClient) {}

  getAnnouncements(): Observable<any[]> {
    const token = localStorage.getItem('token');
    return this.http.get<any[]>(`${this.API_URL}/announcements`, {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(shareReplay(1));
  }
}
