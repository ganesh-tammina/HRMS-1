import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

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

export interface MasterPayload {
  name: string;
}

export interface ShiftPolicyPayload {
  name: string;
  shift_type: string;
  start_time: string;
  end_time: string;
  break_duration_minutes: number;
  timezone: string;
  description?: string;
  is_active: number;
}

export interface AnnouncementPayload {
  title: string;
  body: string;
  starts_at: string;
  ends_at: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private env = environment;
  private baseUrl = `http://${this.env.apiURL}/api`;

  constructor(private http: HttpClient) {}

  /* ===================== LOCATIONS ===================== */
  getLocations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/locations`);
  }
  createLocation(payload: MasterPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/locations`, payload);
  }
  updateLocation(id: number, payload: MasterPayload): Observable<any> {
    return this.http.put(`${this.baseUrl}/locations/${id}`, payload);
  }
  deleteLocation(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/locations/${id}`);
  }

  /* ===================== DEPARTMENTS ===================== */
  getDepartments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/departments`);
  }
  createDepartment(payload: MasterPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/departments`, payload);
  }
  updateDepartment(id: number, payload: MasterPayload): Observable<any> {
    return this.http.put(`${this.baseUrl}/departments/${id}`, payload);
  }
  deleteDepartment(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/departments/${id}`);
  }

  /* ===================== DESIGNATIONS ===================== */
  getDesignations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/designations`);
  }
  createDesignation(payload: MasterPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/designations`, payload);
  }
  updateDesignation(id: number, payload: MasterPayload): Observable<any> {
    return this.http.put(`${this.baseUrl}/designations/${id}`, payload);
  }
  deleteDesignation(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/designations/${id}`);
  }

  /* ===================== BUSINESS UNITS ===================== */
  getBusinessUnits(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/business-units`);
  }
  createBusinessUnit(payload: MasterPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/business-units`, payload);
  }
  updateBusinessUnit(id: number, payload: MasterPayload): Observable<any> {
    return this.http.put(`${this.baseUrl}/business-units/${id}`, payload);
  }
  deleteBusinessUnit(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/business-units/${id}`);
  }

  /* ===================== SHIFT POLICIES ===================== */
  getShiftPolicies(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/shift-policies`);
  }
  createShiftPolicy(payload: ShiftPolicyPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/shift-policies`, payload);
  }
  updateShiftPolicy(id: number, payload: ShiftPolicyPayload): Observable<any> {
    return this.http.put(`${this.baseUrl}/shift-policies/${id}`, payload);
  }
  deleteShiftPolicy(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/shift-policies/${id}`);
  }

  /* ===================== WEEKLY OFF POLICIES ===================== */
  getWeeklyOffPolicies(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/weekly-off-policies`);
  }
  createWeeklyOffPolicy(payload: WeeklyOffPolicyPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/weekly-off-policies`, payload);
  }
  updateWeeklyOffPolicy(id: number, payload: WeeklyOffPolicyPayload): Observable<any> {
    return this.http.put(`${this.baseUrl}/weekly-off-policies/${id}`, payload);
  }
  deleteWeeklyOffPolicy(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/weekly-off-policies/${id}`);
  }

  /* ===================== LEAVE PLANS ===================== */
  getLeavePlans(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/leave-plans`);
  }
  createLeavePlan(payload: MasterPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/leave-plans`, payload);
  }
  updateLeavePlan(id: number, payload: MasterPayload): Observable<any> {
    return this.http.put(`${this.baseUrl}/leave-plans/${id}`, payload);
  }
  deleteLeavePlan(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/leave-plans/${id}`);
  }

  /* ===================== ATTENDANCE POLICIES ===================== */
  getAttendancePolicies(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/attendance-policies`);
  }
  createAttendancePolicy(payload: MasterPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/attendance-policies`, payload);
  }
  updateAttendancePolicy(id: number, payload: MasterPayload): Observable<any> {
    return this.http.put(`${this.baseUrl}/attendance-policies/${id}`, payload);
  }
  deleteAttendancePolicy(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/attendance-policies/${id}`);
  }

  /* ===================== ANNOUNCEMENTS ===================== */
  getAnnouncements(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/announcements`);
  }
  createAnnouncement(payload: AnnouncementPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/announcements`, payload);
  }
  updateAnnouncement(id: number, payload: AnnouncementPayload): Observable<any> {
    return this.http.put(`${this.baseUrl}/announcements/${id}`, payload);
  }
  deleteAnnouncement(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/announcements/${id}`);
  }

  /* ===================== EMPLOYEE UPLOAD ===================== */
  uploadEmployees(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/upload/employees`, formData);
  }

  /* ===================== USER MANAGEMENT ===================== */
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/auth/users`);
  }
  makeHR(userId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/users/${userId}/make-hr`, {});
  }
  makeManager(userId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/users/${userId}/make-manager`, {});
  }
  makeEmployee(userId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/users/${userId}/make-employee`, {});
  }
  makeAdmin(userId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/users/${userId}/make-admin`, {});
  }
  createUser(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/user/create`, payload);
  }

  /* ===================== LEAVE ALLOCATION & INITIALIZATION ===================== */
  updateBulkLeaveAllocation(planId: number, payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/leaves/plans/${planId}`, payload);
  }
  initializeLeaveBalance(empId: number, payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/leaves/initialize-balance/${empId}`, payload);
  }
}
