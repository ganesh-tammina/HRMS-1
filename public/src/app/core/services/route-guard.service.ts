import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { EmployeeService } from './employee.service';

@Injectable({
  providedIn: 'root',
})
export class RouteGuardService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly ROLE_KEY = 'role';
  private readonly EMPLOYEE_ID_KEY = 'employee_id';

  constructor(
    private http: HttpClient,
    private router: Router,
    private employeeService: EmployeeService
  ) {}

  storeTokens(
    accessToken: string,
    refreshToken: string | null,
    employee_id: string | null,
    role: string
  ): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.ROLE_KEY, role.toLowerCase());
    localStorage.setItem(this.EMPLOYEE_ID_KEY, employee_id!);

    if (refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  login(token: string, role: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    localStorage.setItem(this.ROLE_KEY, role.toLowerCase());
  }

  logout(): void {
    this.employeeService.clearEmployee();

    const attendanceData: { [key: string]: string } = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('attendance_')) {
        attendanceData[key] = localStorage.getItem(key) || '';
      }
    }

    localStorage.clear();
    sessionStorage.clear();

    Object.keys(attendanceData).forEach(key => {
      localStorage.setItem(key, attendanceData[key]);
    });

    window.location.href = '/login';
  }

  get token(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  get refreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  get userRole(): string | null {
    return localStorage.getItem(this.ROLE_KEY);
  }

  get employeeID(): string | null {
    return localStorage.getItem(this.EMPLOYEE_ID_KEY);
  }
}
