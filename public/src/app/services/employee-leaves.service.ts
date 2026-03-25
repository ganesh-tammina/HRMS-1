import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root',
})
export class EmployeeLeavesService {
  private env = environment;
  private readonly API_URL = `http://${this.env.apiURL}/api/leaves`;

  constructor(private http: HttpClient) { }

  /**
   * GET Employee Leave Balance (Dynamic Year)
   * @param year leave year (ex: 2025)
   */
  getLeaveBalance(year: number): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      accept: 'application/json',
      Authorization: `Bearer ${token}`,
    });

    const params = new HttpParams().set('leave_year', year.toString());

    return this.http.get<any>(
      `${this.API_URL}/balance`,
      { headers, params }
    );
  }
}