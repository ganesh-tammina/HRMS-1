import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { RouteGuardService } from '../services/route-guard.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: RouteGuardService, private router: Router) {}

  canActivate(): boolean {
    if (!this.auth.isLoggedIn) {
      this.router.navigate(['/login']);
      return false;
    }
    return true;
  }
}
