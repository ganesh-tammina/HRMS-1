import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, tap, shareReplay, catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private env = environment;
  private readonly API_URL = `http://${this.env.apiURL}/api/employees`;
  private readonly profileEndpoint = `${this.API_URL}/profile/me`;
  private readonly reportingEndpoint = `${this.API_URL}/reporting`;
  private readonly uploadProfileImageUrl = `${this.API_URL}/profile/image`;
  private readonly myTeamEndpoint = `${this.API_URL}/my-team/list`;
  private readonly ATTENDANCE_API_URL = `http://${this.env.apiURL}/api/attendance`;

  private currentEmployee: any | null = null;
  private currentEmployeeSubject = new BehaviorSubject<any>(null);
  currentEmployee$ = this.currentEmployeeSubject.asObservable();

  private profileImageUpdateSubject = new BehaviorSubject<string | null>(null);
  profileImageUpdate$ = this.profileImageUpdateSubject.asObservable();

  private employeeIdSubject = new BehaviorSubject<number | null>(null);
  employeeId$ = this.employeeIdSubject.asObservable();

  private profile$?: Observable<any>;
  private profileInitialized = false;

  constructor(private http: HttpClient) {}

  getMyProfile(force = false): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (!token) return of(null);
    if (!force && this.profile$) return this.profile$;

    this.profile$ = this.http.get<any>(this.profileEndpoint, {
      headers: { Authorization: `Bearer ${token}` },
    }).pipe(
      tap(emp => {
        this.currentEmployee = emp;
        this.profileInitialized = true;
        this.currentEmployeeSubject.next(emp);
      }),
      shareReplay(1),
      catchError(err => {
        this.profile$ = undefined;
        return throwError(() => err);
      })
    );
    return this.profile$;
  }

  updateMyProfile(updateData: any): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return this.http.put(this.profileEndpoint, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  uploadProfileImage(file: File): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('image', file);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post(this.uploadProfileImageUrl, formData, { headers }).pipe(
      tap((res: any) => {
        if (res.imagePath) {
          const imagePathWithCache = `${res.imagePath}?t=${Date.now()}`;
          if (this.currentEmployee) this.currentEmployee.profile_image = imagePathWithCache;
          this.profileImageUpdateSubject.next(imagePathWithCache);
        }
      })
    );
  }

  getCurrentEmployee() { return this.currentEmployee; }

  getEmployeeById(id: number): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return this.http.get<any>(`${this.API_URL}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  }

  getAllEmployees(page = 1, limit = 20, search = ''): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    if (search?.trim()) params = params.set('q', search.trim());
    return this.http.get<any>(this.API_URL, { params, headers: { Authorization: `Bearer ${token}` } });
  }

  searchEmployees(keyword: string, page = 1, limit = 20): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const params = new HttpParams().set('q', keyword).set('page', page.toString()).set('limit', limit.toString());
    return this.http.get<any>(this.API_URL + '/search/query', { params, headers: { Authorization: `Bearer ${token}` } });
  }

  updateEmployeeProfile(employeeId: number, updateData: any): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return this.http.put(`${this.API_URL}/${employeeId}`, updateData, { headers: { Authorization: `Bearer ${token}` } });
  }

  clearEmployee(): void {
    this.currentEmployee = null;
    this.profileInitialized = false;
    this.profile$ = undefined;
    this.currentEmployeeSubject.next(null);
    this.profileImageUpdateSubject.next(null);
    this.employeeIdSubject.next(null);
    localStorage.removeItem('activeEmployeeId');
  }

  getReportingEmployees(employeeId: number): Observable<any[]> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return this.http.get<any[]>(`${this.reportingEndpoint}/${employeeId}`, { headers: { Authorization: `Bearer ${token}` } });
  }

  getMyTeamList(): Observable<any[]> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return this.http.get<any[]>(this.myTeamEndpoint, { headers: { Authorization: `Bearer ${token}` } });
  }

  getMyCoTeam(): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return this.http.get<any>(`${this.API_URL}/my-team/co-team`, { headers: { Authorization: `Bearer ${token}` } });
  }

  getMyReportingTeam(): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return this.http.get<any>(`${this.API_URL}/my-team/reporting`, { headers: { Authorization: `Bearer ${token}` } });
  }

  getBirthdays(): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return this.http.get(`http://${this.env.apiURL}/api/birthdays`, { headers: { Authorization: `Bearer ${token}` } });
  }

  sendBirthdayWish(employeeId: number, message: string): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return this.http.post(`http://${this.env.apiURL}/api/birthdays/wishes`, {
      birthday_employee_id: employeeId, message
    }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  }

  getBirthdayWishes(employeeId: number): Observable<any[]> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return this.http.get<any[]>(`http://${this.env.apiURL}/api/birthdays/wishes/${employeeId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  getTeamAttendanceReport(date?: string): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<any>(`${this.ATTENDANCE_API_URL}/report/team`, { params, headers: { Authorization: `Bearer ${token}` } });
  }

  setEmployeeId(id: number) { this.employeeIdSubject.next(id); }
  getEmployeeId(): number | null { return this.employeeIdSubject.value; }
}
