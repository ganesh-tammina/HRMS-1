import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ShiftPolicy {
    id: number;
    name: string;
    start_time: string;
    end_time: string;
    grace_period_minutes: number;
}

@Injectable({
    providedIn: 'root',
})
export class ShiftPolicyService {
    private apiUrl = `http://${environment.apiURL}/api/shift-policies`;

    constructor(private http: HttpClient) { }

    getShiftPolicies(): Observable<ShiftPolicy[]> {
        return this.http.get<ShiftPolicy[]>(this.apiUrl);
    }
}
