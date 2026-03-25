import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface LeavePlan {
    id: number;
    name: string;
    description?: string;
}

@Injectable({
    providedIn: 'root',
})
export class LeavePlanService {
    private apiUrl = `http://${environment.apiURL}/api/leave-plans`;

    constructor(private http: HttpClient) { }

    getLeavePlans(): Observable<LeavePlan[]> {
        return this.http.get<LeavePlan[]>(this.apiUrl);
    }
}
