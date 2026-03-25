import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LeaveTypeService {
  private env = environment;
  private API_URL = `http://${this.env.apiURL}/api/leaves/types`;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  /** CREATE */
  createLeaveType(payload: any): Observable<any> {
    return this.http.post(this.API_URL, payload, {
      headers: this.getHeaders(),
    });
  }

  /** UPDATE */
  updateLeaveType(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.API_URL}/${id}`, payload, {
      headers: this.getHeaders(),
    });
  }

  /** GET LIST */
  getLeaveTypes(): Observable<any[]> {
    return this.http.get<any[]>(this.API_URL, {
      headers: this.getHeaders(),
    });
  }
}
