import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})

export class LeaveService {
  private env = environment;
  private apiUrls = `https://${this.env.apiURL}/api/v1/`;


    constructor(private http: HttpClient) {}

    saveLeaves(leaveData: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrls}add-leaves-all`, leaveData, {
        withCredentials: true,
      });
    }
}