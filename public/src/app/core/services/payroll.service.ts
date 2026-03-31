import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PayrollService {
  private env = environment;
  private payrollUrl = `http://${this.env.apiURL}/api/payroll-master/`;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return new HttpHeaders({
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getPayrollComponents(): Observable<any> {
    return this.http.get(`${this.payrollUrl}components`, { headers: this.getHeaders() });
  }

  getPayrollstructures(): Observable<any> {
    return this.http.get(`${this.payrollUrl}structures`, { headers: this.getHeaders() });
  }

  getPayrollStructureById(structureId: number): Observable<any> {
    return this.http.get(`${this.payrollUrl}structures/${structureId}`, { headers: this.getHeaders() });
  }

  getPayrollTempletes(): Observable<any> {
    return this.http.get(`${this.payrollUrl}templates`, { headers: this.getHeaders() });
  }

  getTemplateById(templateId: number): Observable<any> {
    return this.http.get(`${this.payrollUrl}templates/${templateId}`, { headers: this.getHeaders() });
  }

  getTemplateComposition(templateId: number): Observable<any> {
    return this.http.get(`${this.payrollUrl}templates/${templateId}/composition`, { headers: this.getHeaders() });
  }
}
