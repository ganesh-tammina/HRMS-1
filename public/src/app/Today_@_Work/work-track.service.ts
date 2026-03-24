import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { body } from 'ionicons/icons';

export interface workTrack {
  employee_id: number;
  date: string
}

export interface WorkReportResponse {
  message: string;
  data: WorkReportData;
}

export interface WorkReportData {
  employee_id: number;
  date: string;
  technologies: string[];
  hours: WorkHour[];
}

export interface WorkHour {
  start_time: string;
  end_time: string;
  task: string;
  project: string;
  type: 'work' | 'break' | string; // you can restrict later if needed
}
@Injectable({
  providedIn: 'root'
})


export class WorkTrackService {
  private environment = environment;
  private api = `https://${this.environment.apiURL}/api/v1/work-track`;

  constructor(private http: HttpClient) { }

  submitReport(data: any): Observable<any> {
    return this.http.post(`${this.api}/save`, data, {
      withCredentials: true,
    });
  }
  getReport(data: workTrack): Observable<WorkReportResponse> {
    return this.http.post<WorkReportResponse>(`${this.api}/get`, data, {
      withCredentials: true,
    });
  }
  getAllReport(data: { employee_id: number }): Observable<WorkReportResponse> {
    return this.http.post<WorkReportResponse>(`${this.api}/get-all`, data, {
      withCredentials: true,
    });
  }
}
