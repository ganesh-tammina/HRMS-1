import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface AttendancePolicy {
    id: number;
    name: string;
    description?: string;
    grace_period_minutes?: number;
}

@Injectable({
    providedIn: 'root',
})
export class AttendancePolicyService {
    private apiUrl = `http://${environment.apiURL}/api/attendance-policies`;

    constructor(private http: HttpClient) { }

    getAttendancePolicies(): Observable<AttendancePolicy[]> {
        return this.http.get<AttendancePolicy[]>(this.apiUrl);
    }
}
