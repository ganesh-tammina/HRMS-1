import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';


@Injectable({
  providedIn: 'root',
})
export class UpdatealloctionleaveService {
private env = environment;
  private API_URL = `http://${this.env.apiURL}/api/leaves/plans`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  /** UPDATE LEAVE PLAN */
  updateLeaveAllocation(planId: number, payload: any): Observable<any> {
    return this.http.put(
      `${this.API_URL}/${planId}`,
      payload,
      { headers: this.getHeaders() }
    );
  }
}
