import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CandidateService {
  private apiUrl = `http://${environment.apiURL}/api/candidates`;

  constructor(private http: HttpClient) { }

  // Get all candidates
  getAllCandidates(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  // Get candidate by ID
  getCandidateById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Create a new candidate
  createCandidate(candidateData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, candidateData);
  }

  // Update candidate
  updateCandidate(id: number, candidateData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, candidateData);
  }

  // Get candidate statistics/dashboard
  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/dashboard`);
  }

  // Start pre-onboarding
  startPreonboarding(candidateId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${candidateId}/start-preonboarding`, {});
  }

  // Create offer
  createOffer(candidateId: number, offerData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${candidateId}/create-offer`, offerData);
  }

  // Preview offer before sending
  previewSendOffer(candidateId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${candidateId}/preview-send-offer`, {});
  }

  // Send offer
  sendOffer(candidateId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${candidateId}/send-offer`, {});
  }

  // View offer
  viewOffer(candidateId: number, offerId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${candidateId}/view-offer/${offerId}`);
  }

  // Accept offer
  acceptOffer(candidateId: number, offerId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${candidateId}/accept-offer/${offerId}`, {});
  }

  // Approve offer
  approveOffer(candidateId: number, offerId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${candidateId}/approve-offer/${offerId}`, {});
  }

  // Reject offer
  rejectOffer(candidateId: number, offerId: string, reason: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${candidateId}/reject-offer/${offerId}`, { reason });
  }

  // Decline offer
  declineOffer(candidateId: number, reason: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${candidateId}/decline-offer`, { reason });
  }

  // Upload document
  uploadDocument(candidateId: number, file: File, documentType: string, required: boolean = true): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    formData.append('required', required ? '1' : '0');
    return this.http.post<any>(`${this.apiUrl}/${candidateId}/documents`, formData);
  }

  // Verify document
  verifyDocument(documentId: number, remarks: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/documents/${documentId}/verify`, { remarks });
  }

  // Initiate BGV
  initiateBGV(candidateId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${candidateId}/bgv/initiate`, {});
  }

  // Update BGV status
  updateBGVStatus(candidateId: number, bgvStatus: string, remarks: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${candidateId}/bgv/status`, { bgv_status: bgvStatus, remarks });
  }

  // Update candidate status
  updateCandidateStatus(candidateId: number, status: string, remarks: string = ''): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${candidateId}/update-status`, { status, remarks });
  }

  // Convert candidate to employee
  convertToEmployee(candidateId: number, employeeNumber: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${candidateId}/convert-to-employee`, { employee_number: employeeNumber });
  }

  // Hire as employee
  hireAsEmployee(candidateId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${candidateId}/hire-as-employee`, {});
  }

  // Put candidate on hold
  putOnHold(candidateId: number, reason: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${candidateId}/put-on-hold`, { reason });
  }

  // ===== MASTER DATA =====

  // Get all departments
  getDepartments(): Observable<any> {
    return this.http.get<any>(`http://${environment.apiURL}/api/departments`);
  }

  // Get all locations
  getLocations(): Observable<any> {
    return this.http.get<any>(`http://${environment.apiURL}/api/locations`);
  }

  // Get all designations
  getDesignations(): Observable<any> {
    return this.http.get<any>(`http://${environment.apiURL}/api/designations`);
  }

  // Get all employees (for reporting managers)
  getEmployees(limit: number = 1000): Observable<any> {
    return this.http.get<any>(`http://${environment.apiURL}/api/employees?limit=${limit}`);
  }
}
