import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface Candidate {
  FirstName: string;
  LastName: string;
  PhoneNumber: string;
  Email: string;
  Gender: string;
  JobTitle: string;
  Department: string;
  JobLocation: string;
  WorkType: string;
  BusinessUnit: string;
}

export interface OfferPayload {
  position: string;
  designation_id: number;
  department_id: number;
  location_id: number;
  reporting_manager_id: number;
  joining_date: string;
  offered_ctc: number;
  annual_salary: number;
  salary_breakup: {
    basic: number;
    hra: number;
    special: number;
  };
  offer_validity_date: string;
  probation_period: number;
  notice_period: number;
  work_mode: string;
  special_terms: string;
  benefits: string;
}

export interface SalaryStructure {
  candidate_id: number;
  basic: number;
  hra: number;
  medical_allowance: number;
  transport_allowance: number;
  special_allowance: number;
  sub_total: number;
  pf_employer: number;
  total_annual: number;
}

@Injectable({
  providedIn: 'root'
})
export class CandidateDetailsService {
  private env = environment;
  private baseUrl = `http://${this.env.apiURL}/api/candidates`;
  private packageUrl = `http://${this.env.apiURL}/api/salary-structure`;

  constructor(private http: HttpClient) { }

  /** 🧍 Create new candidate */
  createCandidate(candidate: Candidate): Observable<any> {
    console.log('📤 Sending candidate data:', candidate);
    return this.http.post(this.baseUrl, candidate).pipe(
      catchError(this.handleError)
    );
  }

  /** 📋 Get all candidates */
  getCandidates(): Observable<Candidate[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      catchError(this.handleError)
    );
  }

  /** 💼 Create offer for candidate */
  createOffer(candidateId: number, offerData: OfferPayload): Observable<any> {
    console.log('📤 Sending offer letter data:', offerData);
    return this.http.post(`${this.baseUrl}/${candidateId}/create-offer`, offerData).pipe(
      catchError(this.handleError)
    );
  }

  /** 💰 Create Salary Structure for candidate */
  createSalaryStructure(salary: SalaryStructure): Observable<any> {
    console.log('📤 Sending salary structure:', salary);
    return this.http.post(this.packageUrl, salary).pipe(
      catchError(this.handleError)
    );
  }
  /** 🔍 Get candidate by ID */
  getCandidateById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`).pipe(catchError(this.handleError));
  }

  /** ⚠️ Handle all API errors */
  private handleError(error: HttpErrorResponse) {
    console.error('❌ API Error:', error);
    return throwError(() => new Error(error.message));
  }
}
