import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class PayrollUploadService {
    private apiUrl = 'http://localhost:3000/api/upload/payroll';

    constructor(private http: HttpClient) { }

    uploadPayroll(file: File, month: number, year: number, token: string): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('month', month.toString());
        formData.append('year', year.toString());

        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json',
        });

        return this.http.post(this.apiUrl, formData, { headers });
    }
}
