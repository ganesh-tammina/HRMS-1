import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

/* =========================
   PROJECT MODEL
========================= */
export interface Project {
  id?: number;
  project_code: string;
  project_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  description?: string;
  project_manager_id: number;
}

/* =========================
   PROJECT SHIFT
========================= */
export interface ProjectShift {
  id?: number;
  project_id?: number;
  shift_type: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  timezone: string;
}

/* =========================
   PROJECT ASSIGNMENT
========================= */
export interface ProjectAssignment {
  id?: number;
  employee_id: number;
  role_in_project: string;
  allocation_percentage: number;
  shift_id: number;
  assignment_start_date: string;
  assignment_end_date: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {

  private readonly BASE_URL = `http://${environment.apiURL}/api/projects`;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }

  /* =========================
     CREATE PROJECT
  ========================= */
  createProject(payload: Project): Observable<any> {
    return this.http.post(this.BASE_URL, payload, {
      headers: this.getHeaders()
    });
  }

  /* =========================
     GET PROJECTS
  ========================= */
  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.BASE_URL, {
      headers: this.getHeaders()
    });
  }

  /* =========================
     UPDATE PROJECT
  ========================= */
  updateProject(id: number, payload: Partial<Project>): Observable<any> {
    return this.http.put(`${this.BASE_URL}/${id}`, payload, {
      headers: this.getHeaders()
    });
  }

  /* =========================
     CREATE SHIFT
     POST /projects/:id/shifts
  ========================= */
  createProjectShift(
    projectId: number,
    payload: ProjectShift
  ): Observable<any> {
    return this.http.post(
      `${this.BASE_URL}/${projectId}/shifts`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /* =========================
     GET SHIFTS
     GET /projects/:id/shifts
  ========================= */
  getProjectShifts(projectId: number): Observable<ProjectShift[]> {
    return this.http.get<ProjectShift[]>(
      `${this.BASE_URL}/${projectId}/shifts`,
      { headers: this.getHeaders() }
    );
  }

  /* =========================
     ASSIGN EMPLOYEE
     POST /projects/:id/assignments
  ========================= */
  assignEmployee(
    projectId: number,
    payload: ProjectAssignment
  ): Observable<any> {
    return this.http.post(
      `${this.BASE_URL}/${projectId}/assignments`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /* =========================
     GET ASSIGNMENTS
     GET /projects/:id/assignments
  ========================= */
  getAssignments(projectId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.BASE_URL}/${projectId}/assignments`,
      { headers: this.getHeaders() }
    );
  }

  getProjectById(id: number): Observable<Project> {
    return this.http.get<Project>(
      `${this.BASE_URL}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  /* =========================
     UPDATE ASSIGNMENT
  ========================= */
  updateAssignment(assignmentId: number, payload: any): Observable<any> {
    return this.http.put(`${this.BASE_URL}/assignments/${assignmentId}`, payload, {
      headers: this.getHeaders()
    });
  }

  /* =========================
     DELETE ASSIGNMENT
  ========================= */
  deleteAssignment(assignmentId: number): Observable<any> {
    return this.http.delete(`${this.BASE_URL}/assignments/${assignmentId}`, {
      headers: this.getHeaders()
    });
  }

  /* =========================
     UPDATE PROJECT SHIFT
  ========================= */
  updateProjectShift(shiftId: number, payload: any): Observable<any> {
    return this.http.put(`${this.BASE_URL}/shifts/${shiftId}`, payload, {
      headers: this.getHeaders()
    });
  }

  /* =========================
     DELETE PROJECT SHIFT
  ========================= */
  deleteProjectShift(shiftId: number): Observable<any> {
    return this.http.delete(`${this.BASE_URL}/shifts/${shiftId}`, {
      headers: this.getHeaders()
    });
  }
}
