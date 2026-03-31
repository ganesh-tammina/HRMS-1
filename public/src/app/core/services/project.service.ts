import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

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

export interface ProjectShift {
  id?: number;
  project_id?: number;
  shift_type: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  timezone: string;
  is_active: boolean;
}

export interface ProjectAssignment {
  id?: number;
  employee_id: number;
  role_in_project: string;
  allocation_percentage: number;
  shift_id: number;
  assignment_start_date: string;
  assignment_end_date: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly BASE_URL = `http://${environment.apiURL}/api/projects`;

  constructor(private http: HttpClient) {}

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.BASE_URL);
  }

  getProjectById(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.BASE_URL}/${id}`);
  }

  createProject(payload: Project): Observable<any> {
    return this.http.post(this.BASE_URL, payload);
  }

  updateProject(id: number, payload: Partial<Project>): Observable<any> {
    return this.http.put(`${this.BASE_URL}/${id}`, payload);
  }

  deleteProject(id: number): Observable<any> {
    return this.http.delete(`${this.BASE_URL}/${id}`);
  }

  /* ================= SHIFTS ================= */
  
  getProjectShifts(projectId: number): Observable<ProjectShift[]> {
    return this.http.get<ProjectShift[]>(`${this.BASE_URL}/${projectId}/shifts`);
  }

  createProjectShift(projectId: number, payload: ProjectShift): Observable<any> {
    return this.http.post(`${this.BASE_URL}/${projectId}/shifts`, payload);
  }

  updateProjectShift(shiftId: number, payload: any): Observable<any> {
    return this.http.put(`${this.BASE_URL}/shifts/${shiftId}`, payload);
  }

  deleteProjectShift(shiftId: number): Observable<any> {
    return this.http.delete(`${this.BASE_URL}/shifts/${shiftId}`);
  }

  /* ================= ASSIGNMENTS ================= */

  getAssignments(projectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/${projectId}/assignments`);
  }

  assignEmployee(projectId: number, payload: ProjectAssignment): Observable<any> {
    return this.http.post(`${this.BASE_URL}/${projectId}/assignments`, payload);
  }

  updateAssignment(assignmentId: number, payload: any): Observable<any> {
    return this.http.put(`${this.BASE_URL}/assignments/${assignmentId}`, payload);
  }

  deleteAssignment(assignmentId: number): Observable<any> {
    return this.http.delete(`${this.BASE_URL}/assignments/${assignmentId}`);
  }
}
