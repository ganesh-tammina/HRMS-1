import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class WorkFromHomeService {

  private env = environment;
  private readonly API_URL = `http://${this.env.apiURL}/api/leaves`;

  constructor(private http: HttpClient) { }

  /* ================= COMMON HEADERS ================= */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  /* ==================================================
     GET ALL WFH REQUESTS (Employee)
     GET /api/leaves/wfh-requests
     ================================================== */
  getAllWFHRequests(): Observable<any> {
    return this.http.get<any>(
      `${this.API_URL}/wfh-requests`,
      { headers: this.getHeaders() }
    );
  }

  /* ==================================================
     CREATE WFH REQUEST
     POST /api/leaves/wfh-request
     ================================================== */
  wfh(payload: {
    start_date?: string;
    end_date?: string;
    date?: string;
    total_days?: number;
    work_mode: 'WFH' | 'WFO' | 'Remote';
    reason: string;
  }): Observable<any> {
    return this.http.post<any>(
      `${this.API_URL}/wfh-request`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /* ==================================================
     CREATE REMOTE REQUEST (uses same endpoint, work_mode: 'Remote')
     POST /api/leaves/wfh-request
     ================================================== */
  remote(payload: {
    date: string;
    reason: string;
  }): Observable<any> {
    const remotePayload = {
      ...payload,
      work_mode: 'Remote' as 'Remote',
    };
    return this.http.post<any>(
      `${this.API_URL}/wfh-request`,
      remotePayload,
      { headers: this.getHeaders() }
    );
  }

  /* ==================================================
     GET PENDING WFH REQUESTS
     GET /api/leaves/wfh-requests/pending
     ================================================== */
  getPendingWFHRequests(): Observable<any> {
    return this.http.get<any>(
      `${this.API_URL}/wfh-requests/pending`,
      { headers: this.getHeaders() }
    );
  }

  /* ================= APPROVE WFH ================= */
  approveWFHRequest(
    id: number,
    remarks: string = 'Approved'
  ): Observable<any> {
    return this.http.put<any>(
      `${this.API_URL}/approve/${id}`,
      { remarks },
    );
  }

  /* ================= REJECT WFH ================= */
  rejectWFHRequest(
    id: number,
    remarks: string = 'Rejected'
  ): Observable<any> {
    return this.http.put<any>(
      `${this.API_URL}/reject/${id}`,
      { remarks },
    );
  }
}
