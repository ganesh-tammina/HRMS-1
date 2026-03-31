import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface WeeklyOffPolicy {
    id: number;
    name: string;
    policy_code?: string;
    description?: string;
    effective_date?: string;
    is_active?: number;
    sunday_off?: number;
    monday_off?: number;
    tuesday_off?: number;
    wednesday_off?: number;
    thursday_off?: number;
    friday_off?: number;
    saturday_off?: number;
    is_payable?: number;
    holiday_overlap_rule?: string;
    sandwich_rule?: number;
    minimum_work_days?: number;
}

@Injectable({
    providedIn: 'root',
})
export class WeeklyOffPolicyService {
    private apiUrl = `http://${environment.apiURL}/api/weekly-off-policies`;

    constructor(private http: HttpClient) { }

    getWeeklyOffPolicies(): Observable<WeeklyOffPolicy[]> {
        return this.http.get<WeeklyOffPolicy[]>(this.apiUrl);
    }
}
