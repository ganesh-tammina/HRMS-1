import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class PayrollTemplatesService {
    private apiUrl = 'http://localhost:3000/api/payroll/components';

    constructor(private http: HttpClient) { }

    createComponent(component: {
        name: string;
        type: 'Earning' | 'Deduction' | 'Reimbursement';
        is_statutory: boolean;
        is_taxable: boolean;
        calculation_type: 'Flat' | 'Percentage' | 'Formula';
        value: number;
    }, token: string): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        });
        return this.http.post(this.apiUrl, component, { headers });
    }

    getComponents(token: string): Observable<any> {
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
        });
        return this.http.get(this.apiUrl, { headers });
    }

    getComponentList(token: string): Observable<any> {
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
        });
        return this.http.get(this.apiUrl, { headers });
    }
}
