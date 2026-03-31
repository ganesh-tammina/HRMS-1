import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PreonboardingService {
  private apiUrl = `http://${environment.apiURL}/api/preonboarding`;

  constructor(private http: HttpClient) { }

  // Get all pre-onboarding tasks
  getAllTasks(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tasks`);
  }

  // Create a new pre-onboarding task
  createTask(taskData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tasks`, taskData);
  }

  // Update a pre-onboarding task
  updateTask(taskId: number, taskData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/tasks/${taskId}`, taskData);
  }

  // Delete a pre-onboarding task
  deleteTask(taskId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/tasks/${taskId}`);
  }

  // Assign tasks to a candidate
  assignTasks(candidateId: number, taskIds: number[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/assign/${candidateId}`, { task_ids: taskIds });
  }

  // Get pre-onboarding progress for a candidate
  getProgress(candidateId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/progress/${candidateId}`);
  }

  // Update pre-onboarding progress
  updateProgress(candidateId: number, status: string, remarks: string = ''): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/progress/${candidateId}`, { status, remarks });
  }

  // Setup default pre-onboarding tasks
  setupDefaultTasks(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tasks/setup-defaults`, {});
  }
}
