import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, tap, shareReplay, map, catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  /**
   * Send a birthday wish to an employee
   */
  sendBirthdayWish(employeeId: number, message: string): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const url = `http://${this.env.apiURL}/api/birthdays/wishes`;
    return this.http.post(url, {
      birthday_employee_id: employeeId,
      message
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        accept: 'application/json'
      }
    });
  }

  /**
   * Get wishes for an employee
   */
  getBirthdayWishes(employeeId: number): Observable<any[]> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const url = `http://${this.env.apiURL}/api/birthdays/wishes/${employeeId}`;
    return this.http.get<any[]>(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
  /**
   * Get birthdays list from /api/birthdays
   */
  getBirthdays(): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const url = `http://${this.env.apiURL}/api/birthdays`;
    return this.http.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
  /**
   * Update logged-in employee profile via /profile/me endpoint
   * @param updateData Fields to update
   */
  updateMyProfile(updateData: any): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return this.http.put(
      this.profileEndpoint,
      updateData,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
  }
  private env = environment;
  private readonly API_URL = `http://${this.env.apiURL}/api/employees`;
  //  private readonly API_URL = 'http://localhost:3000/api/employees';
  private readonly profileEndpoint = `${this.API_URL}/profile/me`;
  /* ✅ NEW ENDPOINT */
  private readonly reportingEndpoint = `${this.API_URL}/reporting`;
  private readonly uploadProfileImageUrl = `${this.API_URL}/profile/image`;

  private readonly myTeamEndpoint = `${this.API_URL}/my-team/list`;
  private readonly ATTENDANCE_API_URL = `http://${this.env.apiURL}/api/attendance`;

  private currentEmployee: any | null = null;

  private currentEmployeeSubject = new BehaviorSubject<any>(null);
  currentEmployee$ = this.currentEmployeeSubject.asObservable();

  // Profile image update subject
  private profileImageUpdateSubject = new BehaviorSubject<string | null>(null);
  profileImageUpdate$ = this.profileImageUpdateSubject.asObservable();

  constructor(private http: HttpClient) { }

  /**
   * Update employee profile fields (HR only)
   * @param employeeId The employee's ID
   * @param updateData The fields to update
   */
  updateEmployeeProfile(
    employeeId: number,
    updateData: {
      reporting_manager_id?: number;
      leave_plan_id?: number;
      shift_policy_id?: number;
      attendance_policy_id?: number;
      PayGradeId?: number | null;
      DepartmentId?: number | null;
      lpa?: number;
    }
  ): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return this.http.put(
      `${this.API_URL}/${employeeId}`,
      updateData,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
  }

  /* ================= EXISTING CODE (UNCHANGED) ================= */

  private profile$?: Observable<any>;
  private profileInitialized = false;

  getMyProfile(force = false): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (!token) {
      return of(null);
    }

    // Return cached observable if already exists and not forced
    if (!force && this.profile$) {
      return this.profile$;
    }

    // Refresh the profile observable
    this.profile$ = this.http.get<any>(this.profileEndpoint, {
      headers: { Authorization: `Bearer ${token}` },
    }).pipe(
      tap((emp) => {
        this.currentEmployee = emp;
        this.profileInitialized = true;
        // Broadcast profile data via subject for reactive updates
        this.currentEmployeeSubject.next(emp);
      }),
      shareReplay(1), // Cache the result for subsequent subscribers
      catchError((err) => {
        this.profile$ = undefined; // Clear cache on error
        return throwError(() => err);
      })
    );

    return this.profile$;
  }

  // Add shareReplay to imports if needed, but it should be available via rxjs
  // Actually I need to make sure shareReplay is imported if not already.


  /* ================= UPLOAD PROFILE IMAGE ================= */
  uploadProfileImage(file: File): Observable<any> {
    const token = localStorage.getItem('token');

    const formData = new FormData();
    formData.append('image', file); // ⚠️ key must match backend (usually "image" or "file")

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      // ❌ DO NOT set Content-Type for FormData
    });

    return this.http.post(this.uploadProfileImageUrl, formData, { headers }).pipe(
      tap((res: any) => {
        // Broadcast the new profile image URL
        if (res.imagePath) {
          const imagePathWithCache = `${res.imagePath}?t=${Date.now()}`;
          if (this.currentEmployee) {
            this.currentEmployee.profile_image = imagePathWithCache;
          }
          this.profileImageUpdateSubject.next(imagePathWithCache);
          console.log('📸 Profile image updated and broadcasted:', imagePathWithCache);
        }
      })
    );
  }

  getCurrentEmployee() {
    return this.currentEmployee;
  }

    getEmployeeById(id: number): Observable<any> {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        return this.http.get<any>(`${this.API_URL}/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    }

    searchEmployees(keyword: string, page: number = 1, limit: number = 20): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const params = new HttpParams()
      .set('q', keyword)
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<any>(this.API_URL, {
      params,
      headers: { Authorization: `Bearer ${token}` }
    });
  }


  getAllEmployees(page: number = 1, limit: number = 20, search: string = ''): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search && search.trim()) {
      params = params.set('q', search.trim());
    }

    return this.http.get<any>(this.API_URL, {
      params,
      headers: { Authorization: `Bearer ${token}` }
    });
  }


  clearEmployee(): void {
    this.currentEmployee = null;
    this.profileInitialized = false;
    this.profile$ = undefined;
    
    // Explicitly push nulls to ensure components receive the empty state
    this.currentEmployeeSubject.next(null);
    this.profileImageUpdateSubject.next(null);
    this.employeeIdSubject.next(null);
    
    // Clear local storage entries specific to employees
    localStorage.removeItem('activeEmployeeId');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('loggedInEmployee_') || key.startsWith('loggedInCandidate_'))) {
        localStorage.removeItem(key);
      }
    }
    
    console.log('🧹 EmployeeService: All employee state cleared');
  }

  /* ================= ✅ NEW METHOD ================= */

  /**
   * Get reporting employees under a manager
   * @param employeeId Manager / Reporting ID
   */
  getReportingEmployees(employeeId: number): Observable<any[]> {
    const token = localStorage.getItem('token');

    return this.http.get<any[]>(
      `${this.reportingEndpoint}/${employeeId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }

  /* ================= ✅ NEW METHOD: MY TEAM LIST ================= */

    /**
     * Get logged-in employee's team members
     */
    getMyTeamList(): Observable<any[]> {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        return this.http.get<any[]>(this.myTeamEndpoint, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    /**
     * Get logged-in employee's co-team members
     */
    getMyCoTeam(): Observable<any> {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        return this.http.get<any>(`${this.API_URL}/my-team/co-team`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    /**
     * Get logged-in employee's reporting team
     */
    getMyReportingTeam(): Observable<any> {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        return this.http.get<any>(`${this.API_URL}/my-team/reporting`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    /**
     * Get co-team for a specific employee
     */
    getCoTeamByEmployeeId(employeeId: number): Observable<any> {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        return this.http.get<any>(`${this.API_URL}/my-team/co-team/${employeeId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    /**
     * Get reporting team for a specific employee
     */
    getReportingTeamByEmployeeId(employeeId: number): Observable<any> {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        return this.http.get<any>(`${this.API_URL}/my-team/reporting/${employeeId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

  private employeeIdSubject = new BehaviorSubject<number | null>(null);
  employeeId$ = this.employeeIdSubject.asObservable();

  setEmployeeId(id: number) {
    this.employeeIdSubject.next(id);
  }
  setCurrentEmployeeId(id: number) {
    this.currentEmployeeSubject.next(id);
  }

  getEmployeeId(): number | null {
    return this.employeeIdSubject.value;
  }
  getCurrentEmployeeId(): number | null {
    return this.currentEmployeeSubject.value;
  }

  /* ================= ✅ TEAM ATTENDANCE REPORT ================= */

  /**
   * Get team attendance report for a specific date
   * @param date Date in YYYY-MM-DD format (optional, defaults to today)
   */
  getTeamAttendanceReport(date?: string): Observable<any> {
    const token = localStorage.getItem('token');
    let params = new HttpParams();

    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<any>(
      `${this.ATTENDANCE_API_URL}/report/team`,
      {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }

  /**
   * Get team attendance report for a date range
   * @param startDate YYYY-MM-DD
   * @param endDate YYYY-MM-DD
   */
  getTeamAttendanceReportByRange(startDate: string, endDate: string): Observable<any[]> {
    const token = localStorage.getItem('token');
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<any[]>(
      `${this.ATTENDANCE_API_URL}/report/team-enhanced`,
      {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }
}
