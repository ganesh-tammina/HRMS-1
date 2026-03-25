import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AdminAuthService } from './auth-service.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AdminAuthService, private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const expectedRole = route.data['role'];
    const user = this.authService.getUser();

    if (!user) {
      this.router.navigate(['/login']);
      return false;
    }

    if (expectedRole === 'admin' && user.type !== 'admin') {
      this.router.navigate(['/login']);
      return false;
    }

    if (expectedRole === 'employee' && user.type !== 'employee') {
      this.router.navigate(['/login']);
      return false;
    }

    return true;
  }
}
