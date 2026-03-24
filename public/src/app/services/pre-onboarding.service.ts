import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, map, switchMap } from 'rxjs/operators';

import { RouteGuardService } from './route-guard/route-service/route-guard.service';
import { refresh } from 'ionicons/icons';
import { environment } from 'src/environments/environment';
import { EmployeeService } from './employee.service';

export interface Candidate {
  id: number;
  personalDetails: {
    FirstName: string;
    LastName: string;
    PhoneNumber: string;
    email: string;
    gender: string;
    profileImage?: string;
  };
  jobDetailsForm: {
    JobTitle: string;
    Department: string;
    JobLocation: string;
    WorkType: string;
    BusinessUnit: string;
  };
  employeeCredentials?: {
    companyEmail: string;
    password: string;
  };
  offerDetails?: {
    id?: number;
    DOJ?: string;
    offerValidity?: number;
    JoiningDate?: string;
  };
  packageDetails?: {
    annualSalary: number;
    basic?: number;
    hra?: number;
    medical?: number;
    transport?: number;
    special?: number;
    subtotal?: number;
    pfEmployer?: number;
    pfEmployee?: number;
    total?: number;
  };
  isAvailable?: boolean;
}
export interface CandidateSearchResult {
  employee_id: number;
  employee_number: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  full_name: string | null;
  work_email: string | null;
}
export interface Employee {
  employee_id: number;
  employee_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string;
  work_email: string;
  gender: string;
  marital_status: string | null;
  blood_group: string | null;
  physically_handicapped: string | null;
  nationality: string | null;
  created_at: string;
  updated_at: string;
  attendance_number: string | null;
  location: string | null;
  location_country: string | null;
  legal_entity: string | null;
  business_unit: string | null;
  department: string | null;
  sub_department: string | null;
  job_title: string | null;
  secondary_job_title: string | null;
  reporting_to: string | null;
  reporting_manager_employee_number: string | null;
  dotted_line_manager: string | null;
  date_joined: string | null;
  leave_plan: string | null;
  band: string | null;
  pay_grade: string | null;
  time_type: string | null;
  worker_type: string | null;
  shift_policy_name: string | null;
  weekly_off_policy_name: string | null;
  attendance_time_tracking_policy: string | null;
  attendance_capture_scheme: string | null;
  holiday_list_name: string | null;
  expense_policy_name: string | null;
  notice_period: string | null;
  cost_center: string | null;

  // Address fields
  current_address_line1: string | null;
  current_address_line2: string | null;
  current_city: string | null;
  current_state: string | null;
  current_zip: string | null;
  current_country: string | null;
  permanent_address_line1: string | null;
  permanent_address_line2: string | null;
  permanent_city: string | null;
  permanent_state: string | null;
  permanent_zip: string | null;
  permanent_country: string | null;

  // Family details
  father_name: string | null;
  mother_name: string | null;
  spouse_name: string | null;
  children_names: string | null;

  // IDs and employment info
  pan_number: string | null;
  aadhaar_number: string | null;
  pf_number: string | null;
  uan_number: string | null;
  employment_status: string | null;
  exit_date: string | null;
  comments: string | null;
  exit_status: string | null;
  termination_type: string | null;
  termination_reason: string | null;
  resignation_note: string | null;
  image: string | null;
}

// Response structure
export interface EmployeeResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: Employee[][];
}

export interface Shifts {
  shift_name: string;
  check_in: string;
  check_out: string;
}

export interface leaveRequests {
  employee_id: number;
  action: string;
}

export interface weekOff {
  week_off_policy_name: string;
  week_off_days: string;
}

@Injectable({
  providedIn: 'root',
})
export class CandidateService {
  private currentLoggedEmployeeId: number | null = null;
  private env = environment;
  private getEmployees = `http://${this.env.apiURL}/api/employees`;

  private candidatesSubject = new BehaviorSubject<Candidate[]>([]);
  candidates$ = this.candidatesSubject.asObservable();

  private currentCandidateSubject = new BehaviorSubject<Candidate | null>(
    this.getStoredCandidate()
  );
  currentCandidate$ = this.currentCandidateSubject.asObservable();

  private EmployeeSubject = new BehaviorSubject<Employee[]>([]);
  Employee$ = this.EmployeeSubject.asObservable();

  private currentEmployeeSubject = new BehaviorSubject<Employee | null>(
    this.getStoredEmployee()
  );
  currentEmployee$ = this.currentEmployeeSubject.asObservable();

  private profileImageSubject = new BehaviorSubject<string | null>(null);
  profileImage$ = this.profileImageSubject.asObservable();

  constructor(
    private http: HttpClient,
    private routeGuardService: RouteGuardService,
    private employeeService: EmployeeService
  ) { }
  private getStoredEmployee(): Employee | null {
    const activeId = localStorage.getItem('activeEmployeeId');
    if (!activeId) return null;

    const stored = localStorage.getItem(`loggedInEmployee_${activeId}`);
    return stored ? JSON.parse(stored) : null;
  }
  private getStoredCandidate(): Candidate | null {
    const activeId = localStorage.getItem('activeUserId');
    if (!activeId) return null;

    const stored = localStorage.getItem(`loggedInCandidate_${activeId}`);
    return stored ? JSON.parse(stored) : null;
  }

  getAllEmployeeDeatils(): Observable<any[]> {
    return this.http.get<any[]>(`${this.getEmployees}`);
  }
  // loadCandidates(): void {
  //   this.http.get<any>(this.getapiUrl).subscribe({
  //     next: (data: any) => {
  //       const candidates = this.normalizeCandidates(data);
  //       this.candidatesSubject.next(candidates);
  //     },
  //     error: (err: any) => console.error('Error loading candidates:', err),
  //   });
  // }

  // getCandidateById(id: string): Observable<any> {
  //   return this.http.get<any>(`${this.getapiUrl}/${id}`);
  // }

  getEmployeeById(id: string): Observable<any> {
    return this.http.get<any>(`${this.getEmployees}/${id}/details`);
  }

  // getAdminById(id: string): Observable<any> {
  //   return this.http.get<any>(`${this.adminUrl}`);
  // }

  // getHolidaysList(id: string): Observable<any> {
  //   return this.http.get<any>(`${this.holidaysApiUrl}`);
  // }
  // getofferStatus(): Observable<any> {
  //   return this.http.get<any>(this.offerStatusapi);
  // }
  // getImages(): Observable<any> {
  //   return this.http.get<any>(this.imagesUrl);
  // }

  // getEmpDet(): Observable<EmployeeResponse> {
  //   const body = {
  //     access_token: this.routeGuardService.token,
  //     refresh_token: this.routeGuardService.refreshToken,
  //   };
  //   return this.http.post<any>(this.empUrl, body, { withCredentials: true });
  // }

  setLoggedEmployeeId(id: number) {
    this.currentLoggedEmployeeId = id;
  }

  getLoggedEmployeeId(): number | null {
    return this.currentLoggedEmployeeId;
  }
  /*getShifts(shifts: Shifts): Observable<Shifts> {
    return this.http.post<Shifts>(this.shiftsUrl, shifts);
  }*/
  // getReportingTeam(employeeId: number): Observable<any> {
  //   return this.http.get(`${this.api}employees/under-manager/${employeeId}`);
  // }

  // getpayslips(employeeId: any): Observable<any> {
  //   console.log(employeeId);
  //   return this.http.get(`${this.getPayslips}/${employeeId}`);
  // }

  // getempslips(): Observable<any> {
  //   return this.http.get<any>(this.empUrl);
  // }

  // getLeaveRequests(leaveRequest: leaveRequests): Observable<leaveRequests> {
  //   return this.http.post<leaveRequests>(this.leaverequesrUrl, leaveRequest);
  // }

  // getLeaveRequests(payload: any) {
  //   return this.http.post(`${this.leaverequesrUrl}`, payload);
  // }

  // getLeaveAction(payload: any) {
  //   return this.http.post(`${this.leaveactionUrl}`, payload);
  // }

  /*************  ✨ Windsurf Command ⭐  *************/
  /**
   * Returns an observable of shifts from the server.
   * The observable emits a Shifts object which contains an array of shifts.
   * The shifts are retrieved from the server based on the token and refresh token stored in local storage.
   * The API call is a POST request to the shifts URL.
   * @returns {Observable<Shifts>} an observable of shifts.
   */
  /*******  46bc3667-f1a3-45b9-808e-0006236ca4d7  *******/
  getShifts(shifts: any): Observable<any> {
    return this.http.get<any>(`http://${this.env.apiURL}/api/shift-policy`, shifts);
  }

  // getWeekOffPolicies(weekoff: weekOff): Observable<weekOff> {
  //   return this.http.post<weekOff>(this.weekoffsUrl, weekoff, {
  //     withCredentials: true,
  //   });
  // }

  // getAllWeeklyOffPolicies(): Observable<any> {
  //   return this.http.get<any>(`${this.weekoffsUrl}`, {
  //     withCredentials: true
  //   });
  // }

  // getShiftByName(shift_policy_name: string): Observable<any> {
  //   return this.http.post<any>(
  //     `${this.shiftsUrl}get-shift-policy`,
  //     { shift_policy_name },
  //     {
  //       withCredentials: true,
  //     }
  //   );
  // }

  // getAllEmployees(): Observable<EmployeeResponse> {
  //   return this.http.get<EmployeeResponse>(this.empUrl).pipe();
  // }

  private normalizeCandidates(data: any): Candidate[] {
    if (Array.isArray(data)) return data;
    if (data && data.candidates && Array.isArray(data.candidates))
      return data.candidates;
    if (data) return [data];
    return [];
  }

  // createCandidate(candidateData: Candidate): Observable<Candidate> {
  //   return this.http.post<Candidate>(this.apiUrl, candidateData).pipe(
  //     tap((newCandidate) => {
  //       const current = this.candidatesSubject.value;
  //       this.candidatesSubject.next([...current, newCandidate]);
  //     })
  //   );
  // }

  // getotp(email: string): Observable<any> {
  //   return this.http.post(this.forgotpwd, { email });
  // }

  // newpasswordCreation(email: string): Observable<any> {
  //   return this.http.post(this.newpassword, { email });
  // }

  // changeoldEmpPassword(
  //   email: string,
  //   otp: string,
  //   newPassword: string
  // ): Observable<any> {
  //   const body = {
  //     email: email,
  //     otp: otp,
  //     newPassword: newPassword,
  //   };
  //   console.log(body);
  //   return this.http.post(this.changeoldEmpwd, body);
  // }

  // updateCandidate(candidate: Candidate): Observable<Candidate> {
  //   if (!candidate.offerDetails) {
  //     return throwError(
  //       () => new Error('offerDetails is missing in candidate')
  //     );
  //   }
  //   if (!candidate.offerDetails.DOJ) {
  //     return throwError(() => new Error('DOJ is missing in offerDetails'));
  //   }

  //   // Helper to parse DD/MM/YYYY → YYYY-MM-DD for MySQL DATE
  //   const formatDate = (dateStr: string | undefined): string | null => {
  //     if (!dateStr) return null;

  //     // If already in YYYY-MM-DD, return as is
  //     if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  //     // Parse DD/MM/YYYY
  //     const parts = dateStr.split('/');
  //     if (parts.length !== 3) return null;

  //     const [day, month, year] = parts;
  //     return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  //   };

  //   const formattedDOJ = formatDate(candidate.offerDetails.DOJ)!;
  //   const formattedJoiningDate = formatDate(candidate.offerDetails.JoiningDate);

  //   const offerPayload = {
  //     DOJ: formattedDOJ,
  //     offerValidity: candidate.offerDetails.offerValidity,
  //     JoiningDate: formattedJoiningDate,
  //   };

  //   // 🔹 FIRST TIME (no offerDetails.id) → POST
  //   if (!candidate.offerDetails.id) {
  //     const postBody = {
  //       candidateId: candidate.id,
  //       offerDetails: offerPayload,
  //     };

  //     return this.http.post<Candidate>(this.offerUrl, postBody).pipe(
  //       tap((created) => {
  //         // Ensure offerDetails exists
  //         if (!candidate.offerDetails) candidate.offerDetails = {};
  //         // Store backend id for future PUT
  //         if (created.offerDetails?.id)
  //           candidate.offerDetails.id = created.offerDetails.id;

  //         this.updateLocalCache(created);
  //       })
  //     );
  //   }

  //   // 🔹 NEXT TIME (already has id) → PUT
  //   const putBody = {
  //     id: candidate.id,
  //     ...offerPayload,
  //   };

  //   return this.http
  //     .put<Candidate>(`${this.offerUrl}/${candidate.id}`, putBody)
  //     .pipe(tap((updated) => this.updateLocalCache(updated)));
  // }

  private updateLocalCache(candidate: Candidate) {
    const updatedList = this.candidatesSubject.value.map((c) =>
      c.id === candidate.id ? candidate : c
    );
    this.candidatesSubject.next(updatedList);

    if (this.currentCandidateSubject.value?.id === candidate.id) {
      this.currentCandidateSubject.next(candidate);
      localStorage.setItem(
        `loggedInCandidate_${candidate.id}`,
        JSON.stringify(candidate)
      );
    }
  }

  // ✅ New method for saving package details
  // addPackageDetails(candidate: any): Observable<any> {
  //   if (!candidate.id) {
  //     return throwError(() => new Error('Candidate ID is required'));
  //   }
  //   if (!candidate.packageDetails || !candidate.packageDetails.annualSalary) {
  //     return throwError(
  //       () => new Error('packageDetails with annualSalary is required')
  //     );
  //   }

  //   const postBody = {
  //     candidateId: candidate.id,
  //     packageDetails: { ...candidate.packageDetails },
  //   };

  //   return this.http.post<any>(this.packageUrl, postBody).pipe(
  //     tap((res) => {
  //       console.log('Package details saved:', res);
  //     })
  //   );
  // }
  // createEmployee(Emp: any): Observable<any> {
  //   return this.http.post<any>(this.api + 'employees', Emp).pipe(
  //     tap((newCandidate) => {
  //       console.log(newCandidate);
  //     })
  //   );
  // }
  createRejectedEmployee(Emp: any): Observable<any> {
    return this.http
      .post<any>(
        'https://${environment.apiURL}/employees/rejectedemployees',
        Emp
      )
      .pipe(
        tap((newCandidate) => {
          console.log(newCandidate);
        })
      );
  }
  // findEmployee(email: string): Observable<Employee | undefined> {
  //   return this.http.get<Employee[]>(this.empUrl).pipe(
  //     map((employees) => employees.find((emp) => emp.work_email === email)),
  //     tap((found) => {
  //       if (found) {
  //         this.currentEmployeeSubject.next(found);
  //         localStorage.setItem(
  //           `loggedInEmployee_${found.employee_id}`,
  //           JSON.stringify(found)
  //         );
  //         localStorage.setItem(
  //           'activeEmployeeId',
  //           found.employee_id.toString()
  //         );
  //       }
  //     })
  //   );
  // }

  // verifyAndResetPassword(
  //   email: string,
  //   otp: string,
  //   newPassword: string
  // ): Observable<any> {
  //   const body = { email, otp, newPassword };
  //   return this.http.post(this.updatepassword, body);
  // }

  getCurrentCandidate(): Candidate | null {
    return this.currentCandidateSubject.value;
  }

  logout() {
    // Preserve attendance data during logout
    const attendanceKeys: string[] = [];
    const attendanceData: { [key: string]: string } = {};

    // Save all attendance-related localStorage items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('attendance_')) {
        attendanceKeys.push(key);
        attendanceData[key] = localStorage.getItem(key) || '';
      }
    }

    // Clear all localStorage
    localStorage.clear();

    // Restore attendance data
    attendanceKeys.forEach((key) => {
      localStorage.setItem(key, attendanceData[key]);
    });

    this.currentCandidateSubject.next(null);
    this.currentEmployeeSubject.next(null);
    this.profileImageSubject.next(null);
    this.employeeService.clearEmployee();
    this.routeGuardService.logout();
  }

  // searchCandidates(query: string): Observable<CandidateSearchResult[]> {
  //   const lowerQuery = query.toLowerCase().trim();
  //   return this.http.get<CandidateSearchResult[]>(`${this.api}search?q=${lowerQuery}`);
  // }
  setCurrentEmployee(employee: Employee | null): void {
    this.currentEmployeeSubject.next(employee);

    if (employee && employee.employee_id) {
      // Persist to localStorage for session restore
      localStorage.setItem(
        `loggedInEmployee_${employee.employee_id}`,
        JSON.stringify(employee)
      );
      localStorage.setItem('activeEmployeeId', employee.employee_id.toString());
    } else {
      localStorage.removeItem('activeEmployeeId');
    }
  }
  // uploadImage(file: any): Observable<{
  //   [x: string]: any;
  //   imageUrl: string;
  // }> {
  //   return this.http.post<{ imageUrl: string }>(`${this.imagesUrl}`, file);
  // }
  // uploadEmployeeProfilePic(
  //   employeeId: number,
  //   profilePicUrl: string
  // ): Observable<any> {
  //   const body = {
  //     employee_id: employeeId,
  //     profile_pic_url: profilePicUrl,
  //   };

  //   console.log('📤 Uploading profile pic:', body);

  //   return this.http.post<any>(this.empProfileUrl, body).pipe(
  //     tap({
  //       next: (res) =>
  //         console.log('✅ Profile picture updated successfully:', res),
  //       error: (err) =>
  //         console.error('❌ Error updating profile picture:', err),
  //     })
  //   );
  // }

  notifyProfileImageUpdate(imageUrl: string): void {
    this.profileImageSubject.next(imageUrl);
  }

  getProfileImageUrl(): string | null {
    return localStorage.getItem('profile_image_url');
  }

  clearProfileImage(): void {
    localStorage.removeItem('profile_image_url');
    this.profileImageSubject.next(null);
  }
}
