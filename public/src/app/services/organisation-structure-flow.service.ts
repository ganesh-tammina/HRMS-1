import { Injectable } from '@angular/core';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrganisationStructureFlowService {

  private coTeamUrl = 'http://localhost:3000/api/employees/my-team/co-team';
  private directReportsUrl = 'http://localhost:3000/api/employees/my-team/team';

  constructor(private http: HttpClient) { }

  /**
   * Fetches the organization tree structure for a given employee ID
   * @param employeeId number
   * @param token string (JWT Bearer token)
   */

  /**
   * Fetches the co-team members (peers) for a given employee ID
   */
  getCoTeam(employeeId: number, token: string): Observable<any> {
    const url = `${this.coTeamUrl}/${employeeId}`;
    const headers = new HttpHeaders({
      'accept': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    return this.http.get<any>(url, { headers });
  }

  /**
   * Fetches the direct reports (employees working under a manager) for a given employee ID
   */
  getDirectReports(employeeId: number, token: string): Observable<any> {
    const url = `${this.directReportsUrl}/${employeeId}`;
    const headers = new HttpHeaders({
      'accept': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    return this.http.get<any>(url, { headers });
  }

  /**
   * Fetches the reporting manager for a given employee ID
   * @param employeeId number
   * @param token string (JWT Bearer token)
   */
  getReportingManager(employeeId: number, token: string): Observable<any> {
    const url = `http://localhost:3000/api/employees/my-team/reporting/${employeeId}`;
    const headers = new HttpHeaders({
      'accept': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    return this.http.get<any>(url, { headers });
  }
}
