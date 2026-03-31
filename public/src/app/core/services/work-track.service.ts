import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WorkTrackService {
  private env = environment;
  private apiUrl = `http://${this.env.apiURL}/api/worktrack`;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return new HttpHeaders({
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getWorkTrackEntries(date?: string): Observable<any[]> {
    const url = date ? `${this.apiUrl}/entries?date=${date}` : `${this.apiUrl}/entries`;
    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }

  saveWorkEntry(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/entry`, payload, { headers: this.getHeaders() });
  }
}
