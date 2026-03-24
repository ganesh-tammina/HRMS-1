export interface WeeklyOffPolicyPayload {
  policy_code: string;
  name: string;
  description: string;
  effective_date: string;
  is_active: number;
  sunday_off?: number;
  monday_off?: number;
  tuesday_off?: number;
  wednesday_off?: number;
  thursday_off?: number;
  friday_off?: number;
  saturday_off?: number;
  is_payable?: number;
  holiday_overlap_rule?: string;
  sandwich_rule?: number;
  minimum_work_days?: number;
  week_pattern?: any;
}
// ...existing code...
// ...existing code...
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';


/* ===================== COMMON INTERFACES ===================== */

export interface MasterPayload {
  name: string;
}

export interface ApiResponse {
  message: string;
}

/* ===================== SHIFT POLICY INTERFACE ===================== */
export interface ShiftPolicyPayload {
  name: string;
  shift_type: string;
  start_time: string;              // "10:00:00"
  end_time: string;                // "19:00:00"
  break_duration_minutes: number;  // 60
  timezone: string;                // "Asia/Kolkata"
  description?: string;
  is_active: number;               // 1 | 0
}

/* ===================== ANNOUNCEMENTS ===================== */
export interface AnnouncementPayload {
  title: string;
  body: string;
  starts_at: string; // ISO string "2025-12-23T00:00:00Z"
  ends_at: string;   // ISO string "2025-12-26T23:59:59Z"
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private env = environment;
  private baseUrl = `http://${this.env.apiURL}/api`;

  constructor(private http: HttpClient) { }

  /* ===================== LOCATIONS ===================== */
  createLocation(payload: MasterPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/locations`, payload);
  }

  getLocations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/locations`);
  }

  updateLocation(id: number, payload: MasterPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/locations/${id}`, payload);
  }

  deleteLocation(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/locations/${id}`);
  }

  /* ===================== DEPARTMENTS ===================== */
  createDepartment(payload: MasterPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/departments`, payload);
  }

  getDepartments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/departments`);
  }

  updateDepartment(id: number, payload: MasterPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/departments/${id}`, payload);
  }

  deleteDepartment(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/departments/${id}`);
  }

  /* ===================== DESIGNATIONS ===================== */
  createDesignation(payload: MasterPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/designations`, payload);
  }

  getDesignations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/designations`);
  }

  updateDesignation(id: number, payload: MasterPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/designations/${id}`, payload);
  }

  deleteDesignation(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/designations/${id}`);
  }

  /* ===================== BUSINESS UNITS ===================== */
  createBusinessUnit(payload: MasterPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/business-units`, payload);
  }

  getBusinessUnits(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/business-units`);
  }

  updateBusinessUnit(id: number, payload: MasterPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/business-units/${id}`, payload);
  }

  deleteBusinessUnit(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/business-units/${id}`);
  }

  /* ===================== LEAVE PLANS ===================== */
  createLeavePlan(payload: MasterPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/leave-plans`, payload);
  }

  getLeavePlans(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/leave-plans`);
  }

  updateLeavePlan(id: number, payload: MasterPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/leave-plans/${id}`, payload);
  }

  deleteLeavePlan(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/leave-plans/${id}`);
  }

  /* ===================== SHIFT POLICIES (FIXED & SAFE) ===================== */

  // ✅ CREATE SHIFT POLICY
  createShiftPolicy(payload: ShiftPolicyPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/shift-policies`,
      payload
    );
  }

  // ✅ GET ALL SHIFT POLICIES
  getShiftPolicies(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/shift-policies`
    );
  }

  // ✅ UPDATE SHIFT POLICY
  updateShiftPolicy(id: number, payload: ShiftPolicyPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.baseUrl}/shift-policies/${id}`,
      payload
    );
  }

  /* ===================== WEEKLY OFF POLICIES ===================== */
  createWeeklyOffPolicy(payload: WeeklyOffPolicyPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/weekly-off-policies`, payload);
  }

  getWeeklyOffPolicies(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/weekly-off-policies`);
  }

  updateWeeklyOffPolicy(id: number, payload: WeeklyOffPolicyPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/weekly-off-policies/${id}`, payload);
  }

  deleteWeeklyOffPolicy(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/weekly-off-policies/${id}`);
  }

  /* ===================== ATTENDANCE POLICIES ===================== */
  createAttendancePolicy(payload: MasterPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/attendance-policies`, payload);
  }

  getAttendancePolicies(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/attendance-policies`);
  }

  updateAttendancePolicy(id: number, payload: MasterPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/attendance-policies/${id}`, payload);
  }

  deleteAttendancePolicy(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/attendance-policies/${id}`);
  }

  /* ===================== ATTENDANCE CAPTURE SCHEMES ===================== */
  createAttendanceCaptureScheme(payload: MasterPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/attendance-capture-schemes`, payload);
  }

  getAttendanceCaptureSchemes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/attendance-capture-schemes`);
  }

  updateAttendanceCaptureScheme(id: number, payload: MasterPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/attendance-capture-schemes/${id}`, payload);
  }

  deleteAttendanceCaptureScheme(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/attendance-capture-schemes/${id}`);
  }

  /* ===================== HOLIDAY LISTS ===================== */
  createHolidayList(payload: MasterPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/holiday-lists`, payload);
  }

  getHolidayLists(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/holiday-lists`);
  }

  updateHolidayList(id: number, payload: MasterPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/holiday-lists/${id}`, payload);
  }

  deleteHolidayList(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/holiday-lists/${id}`);
  }

  /* ===================== WEEKLY OFF POLICIES ===================== */

  // ✅ POST: Create Weekly Off Policy
  createWeeklyOffPolicys(payload: MasterPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/weekly-off-policies`,
      payload
    );
  }

  // ✅ GET: Get All Weekly Off Policies
  getWeeklyOffPolicy(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/weekly-off-policies`
    );
  }

  // ✅ CREATE ANNOUNCEMENT
  createAnnouncement(payload: AnnouncementPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/announcements`,
      payload
    );
  }

  // ✅ GET ALL ANNOUNCEMENTS
  getAnnouncements(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/announcements`
    );
  }
  // ✅ UPDATE ANNOUNCEMENT
  updateAnnouncement(id: number, payload: AnnouncementPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.baseUrl}/announcements/${id}`,
      payload
    );
  }

  // ✅ DELETE ANNOUNCEMENT
  deleteAnnouncement(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.baseUrl}/announcements/${id}`
    );
  }
}
