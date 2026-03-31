import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RouteGuardService } from './route-guard.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private env = environment;
  private LOGIN_URL = `http://${this.env.apiURL}/api/auth/login`;
  private CHECK_EMAIL_URL = `http://${this.env.apiURL}/api/auth/employee/check`;
  private CREATE_USER_URL = `http://${this.env.apiURL}/api/auth/user/create`;
  private CREATE_AUTO_USER_URL = `http://${this.env.apiURL}/api/auth/user/create-auto`;
  private CREATE_PASSWORD_URL = `http://${this.env.apiURL}/api/auth/password/create`;
  private PREVIEW_ROLE_URL = `http://${this.env.apiURL}/api/auth/user/preview-role`;
  private LOGOUT_URL = `http://${this.env.apiURL}/api/auth/logout`;

  constructor(
    private http: HttpClient,
    private routeGuardService: RouteGuardService
  ) {}

  checkEmployee(email: string): Observable<any> {
    return this.http.get(`${this.CHECK_EMAIL_URL}?email=${email}`);
  }

  login(payload: { username: string; password: string }): Observable<any> {
    return this.http.post<any>(this.LOGIN_URL, payload).pipe(
      tap(res => {
        if (res?.token && res?.user) {
          this.routeGuardService.storeTokens(
            res.token,
            res.token,
            res.user.id?.toString() || null,
            res.user.role || 'employee'
          );
          localStorage.setItem('token', res.token);
        }
      })
    );
  }

  autoCreateUser(employee_id: number, password: string): Observable<any> {
    return this.http.post<any>(this.CREATE_AUTO_USER_URL, { employee_id, password }).pipe(
      tap(res => {
        const token = res?.token;
        if (token && res?.user) {
          this.routeGuardService.storeTokens(token, token, res.user.id?.toString() || null, res.user.role || 'employee');
          localStorage.setItem('token', token);
        }
      })
    );
  }

  createUser(email: string, password: string): Observable<any> {
    return this.http.post<any>(this.CREATE_USER_URL, { email, password, role: 'employee' }).pipe(
      tap(res => {
        const token = res?.token;
        if (token && res?.user) {
          this.routeGuardService.storeTokens(token, token, res.user.id?.toString() || null, res.user.role || 'employee');
          localStorage.setItem('token', token);
        }
      })
    );
  }

  createPassword(employee_id: string, password: string, token: string): Observable<any> {
    return this.http.post(this.CREATE_PASSWORD_URL, { employee_id, password }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'accept': '*/*'
      }
    });
  }

  previewRole(email: string): Observable<any> {
    return this.http.get(`${this.PREVIEW_ROLE_URL}/${email}`);
  }

  logout(): Observable<void> {
    const token = localStorage.getItem('token');
    return this.http.post<any>(this.LOGOUT_URL, {}, {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }).pipe(
      tap(() => {
        this.routeGuardService.logout();
      })
    );
  }
}
