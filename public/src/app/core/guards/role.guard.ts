import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { RouteGuardService } from '../services/route-guard.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: RouteGuardService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const rawRoles = route.data['role'];
    const allowedRoles: string[] = Array.isArray(rawRoles) ? rawRoles : (rawRoles ? [rawRoles] : []);
    const normalizedRoles = allowedRoles.map(r => r.toLowerCase());
    const userRole = this.auth.userRole?.toLowerCase() || '';

    if (!normalizedRoles.length || normalizedRoles.includes(userRole)) {
      return true;
    }

    // Redirect based on role
    if (userRole === 'admin') {
      this.router.navigate(['/administration']);
    } else {
      this.router.navigate(['/Home']);
    }
    return false;
  }
}
