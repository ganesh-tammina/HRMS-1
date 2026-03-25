import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';


export type UserType = 'admin' | 'employee';

export interface LoggedUser {
  type: UserType;
  data: any;
}

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {
  private userSubject = new BehaviorSubject<LoggedUser | null>(null);

  constructor() {
    // Load from localStorage if exists
    const stored = localStorage.getItem('loggedInUser');
    if (stored) this.userSubject.next(JSON.parse(stored));
  }

  setUser(user: LoggedUser) {
    this.userSubject.next(user);
    localStorage.setItem('loggedInUser', JSON.stringify(user));
  }

  getUser(): LoggedUser | null {
    return this.userSubject.value;
  }

  logout() {
    this.userSubject.next(null);
    localStorage.removeItem('loggedInUser');
  }

  isAdmin(): boolean {
    return this.userSubject.value?.type === 'admin';
  }

  isEmployee(): boolean {
    return this.userSubject.value?.type === 'employee';
  }
}
