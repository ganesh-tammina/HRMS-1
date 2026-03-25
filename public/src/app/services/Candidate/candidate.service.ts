import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface CreateCandidatePayload {
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  alternate_phone?: string;
  date_of_birth: string;
  gender: string;
  position: string;
  designation_id: number;
  department_id: number;
  location_id: number;
  offered_ctc: number;
  joining_date: string;
  reporting_manager_id: number;
  recruiter_name: string;
  recruitment_source: string;
}

@Injectable({
  providedIn: 'root',
})
export class Candidate_Create_Service {

  private readonly API_URL = `http://${environment.apiURL}/api/candidates`;

  constructor(private http: HttpClient) {}

  createCandidate(payload: CreateCandidatePayload): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });

    return this.http.post(this.API_URL, payload, { headers });
  }
}
