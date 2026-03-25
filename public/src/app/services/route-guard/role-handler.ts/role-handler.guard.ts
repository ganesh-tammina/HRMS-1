import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { RouteGuardService } from '../route-service/route-guard.service';

@Injectable({ providedIn: 'root' })
export class roleHandlerGuard implements CanActivate {

  constructor(
    private auth: RouteGuardService,
    private router: Router
  ) { }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const allowedRoles: string[] = route.data['role']; // ['admin']
    const userRole = this.auth.userRole;               // 'admin'

    if (!userRole) {
      this.router.navigate(['/login']);
      return false;
    }

    if (!allowedRoles.includes(userRole.toLowerCase())) {
      alert('Access Denied - You do not have permission to access this page');
      this.router.navigate(['/Home']);
      return false;
    }

    return true;
  }
}