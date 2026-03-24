import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PayrollService {
  private payrollUrl = `http://${environment.apiURL}/api/payroll-master/`;

  constructor(private http: HttpClient) { }

  // 🔐 Get Authorization Headers
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token'); // Store token after login
    return new HttpHeaders({
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // ✅ POST - Set Default Payroll
  setDefaultPayroll(): Observable<any> {
    return this.http.post(
      `${this.payrollUrl}setup/defaults`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // ❌ DELETE - Clear Payroll Setup
  clearPayrollSetup(): Observable<any> {
    return this.http.delete(
      `${this.payrollUrl}setup/clear`,
      { headers: this.getHeaders() }
    );
  }

  getPayrollComponents() {
    return this.http.get(
      `${this.payrollUrl}components`,
      { headers: this.getHeaders() }
    );
  }

  createPayrollComponent(payload: any): Observable<any> {
    return this.http.post(
      `${this.payrollUrl}components`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  updatePayrollComponent(id: number, payload: any): Observable<any> {
    return this.http.put(
      `${this.payrollUrl}components/${id}`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  deletePayrollComponent(id: number): Observable<any> {
    return this.http.delete(
      `${this.payrollUrl}components/${id}`,
      { headers: this.getHeaders() }
    );
  }

  getPayrollTempletes(): Observable<any> {
    return this.http.get(
      `${this.payrollUrl}templates`,
      { headers: this.getHeaders() }
    )
  }

  // 📄 Get Single Template Details
  // Endpoint: /api/payroll-master/templates/{templateId}
  getTemplateById(templateId: number): Observable<any> {
    return this.http.get(
      `${this.payrollUrl}templates/${templateId}`,
      { headers: this.getHeaders() }
    );
  }

  // 📄 Get Template Composition (All components belonging to a specific template)
  // Endpoint: /api/payroll-master/components/{templateId}
  getTemplateComposition(templateId: number): Observable<any> {
    return this.http.get(
      `${this.payrollUrl}templates/${templateId}/composition`,
      { headers: this.getHeaders() }
    );
  }
  getPayrollstructures(): Observable<any> {
    return this.http.get(
      `${this.payrollUrl}structures`,
      { headers: this.getHeaders() }
    );
  }
  getPayrollStructureById(structureId: number): Observable<any> {
    return this.http.get(
      `${this.payrollUrl}structures/${structureId}`,
      { headers: this.getHeaders() }
    );
  }

  createPayrollStructure(payload: any): Observable<any> {
    return this.http.post(
      `${this.payrollUrl}structures`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  updatePayrollStructure(id: number, payload: any): Observable<any> {
    return this.http.put(
      `${this.payrollUrl}structures/${id}`,
      payload,
      { headers: this.getHeaders() }
    );
  }



  deletePayrollStructure(id: number): Observable<any> {
    return this.http.delete(
      `${this.payrollUrl}structures/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // 📄 Get Single Component by ID
  getComponentById(componentId: number): Observable<any> {
    return this.http.get(
      `${this.payrollUrl}components/${componentId}`,
      { headers: this.getHeaders() }
    );
  }

  deleteTemplate(id: number) {
    return this.http.delete(
      `${this.payrollUrl}templates/${id}`,
      { headers: this.getHeaders() }
    );
  }

  createTemplate(payload: any): Observable<any> {
    return this.http.post(
      `${this.payrollUrl}templates`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  updateTemplate(id: number, payload: any): Observable<any> {
    return this.http.put(
      `${this.payrollUrl}templates/${id}`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  addComponentToTemplate(templateId: number, payload: any): Observable<any> {
    return this.http.post(
      `${this.payrollUrl}templates/${templateId}/composition`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  updateTemplateComposition(templateId: number, compositionId: number, payload: any): Observable<any> {
    return this.http.put(
      `${this.payrollUrl}templates/${templateId}/composition/${compositionId}`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  deleteTemplateComposition(templateId: number, compositionId: number): Observable<any> {
    return this.http.delete(
      `${this.payrollUrl}templates/${templateId}/composition/${compositionId}`,
      { headers: this.getHeaders() }
    );
  }
}
