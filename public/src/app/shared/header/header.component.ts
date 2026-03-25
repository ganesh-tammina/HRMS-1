import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import {
  CandidateService,
  Candidate,
  Employee,
  CandidateSearchResult,
} from 'src/app/services/pre-onboarding.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EmployeeListModalComponent } from '../employee-list-modal/employee-list-modal.component';
import { IonicModule, ModalController } from '@ionic/angular';
import { RouteGuardService } from 'src/app/services/route-guard/route-service/route-guard.service';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Observable, Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { EmployeeService } from '../../services/employee.service';
import { AuthService } from '../../services/login-services.service';

@Component({
  standalone: true,
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
})
export class HeaderComponent implements OnInit, OnDestroy {
  // Search state
  searchQuery: string = '';
  searchResults: CandidateSearchResult[] = [];
  results: string[] = [];
  private searchSubject = new Subject<string>();

  // Profile status
  currentEmployee: any;
  uploadedImageUrl: string | null = null;
  profileImageUrl: string = 'assets/user.svg';
  env: string = '';
  isAdmin: boolean = false;
  isAuthenticated: boolean = false;  // ✅ NEW: Check if user is logged in before rendering popovers

  private destroy$ = new Subject<void>();

  constructor(
    private candidateService: CandidateService,
    private modalCtrl: ModalController,
    private routeGuardService: RouteGuardService,
    private router: Router,
    private employeeService: EmployeeService,
    private navCtrl: NavController,
    private authService: AuthService
  ) {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.performSearch(query);
    });
  }

  ngOnInit() {
    this.env = environment.apiURL.startsWith('http') ? environment.apiURL : `http://${environment.apiURL}`;
    this.isAdmin = this.routeGuardService.userRole?.toLowerCase() === 'admin';
    
    // ✅ Check current URL to determine if we should initialize authenticated components
    const currentUrl = this.router.url;
    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/candidate');
    
    // ✅ CRITICAL: Only check authentication if NOT on login page
    if (isLoginPage) {
      this.isAuthenticated = false;
      return;
    }
    
    this.isAuthenticated = this.routeGuardService.isLoggedIn;

    // Listen for general profile image changes (e.g. from candidate service)
    this.candidateService.profileImage$
      .pipe(takeUntil(this.destroy$))
      .subscribe((imageUrl) => {
        if (imageUrl) {
          this.uploadedImageUrl = imageUrl;
          this.profileImageUrl = imageUrl;
        } else if (imageUrl === '') {
          this.uploadedImageUrl = null;
          this.profileImageUrl = 'assets/user.svg';
        }
      });

    // Fetch profile data regardless of role to ensure "who is login" is displayed correctly
    this.employeeService.getMyProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.currentEmployee = res;
          if (res) {
            this.updateProfileImageUrl();
            if (res.id) {
              // Set reporting manager if appropriate for the view
              this.employeeService.setEmployeeId(res.reporting_manager_id);
            }
          }
        },
        error: (err) => {
          // Skip error handling if user is not authenticated
          if (err?.status === 401) {
            console.warn('Header: User not authenticated, skipping profile load');
            return;
          }
          console.error('Header: Failed to load profile', err);
        }
      });

    // Listen to real-time updates from currentEmployee$ stream
    this.employeeService.currentEmployee$
      .pipe(takeUntil(this.destroy$))
      .subscribe(emp => {
        if (emp) {
          this.currentEmployee = emp;
          this.updateProfileImageUrl();
        }
      });

    // Listen for specific employee profile image updates
    this.employeeService.profileImageUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe((imagePath) => {
        if (imagePath && this.currentEmployee) {
          this.currentEmployee.profile_image = imagePath;
          this.updateProfileImageUrl();
        }
      });
  }

  private updateProfileImageUrl() {
    if (this.currentEmployee?.profile_image) {
      this.profileImageUrl = `${this.env}${this.currentEmployee.profile_image}`;
    } else {
      this.profileImageUrl = 'assets/user.svg';
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout() {
    this.authService.logout().subscribe();
  }

  viewProfile() {
    this.navCtrl.navigateForward('/profile-page');
  }

  onSearch() {
    this.searchSubject.next(this.searchQuery);
  }

  private performSearch(query: string) {
    if (!query || query.trim().length < 1) {
      this.searchResults = [];
      this.results = [];
      return;
    }

    this.employeeService.searchEmployees(query.trim(), 1, 20).subscribe({
      next: (res: any) => {
        // Backend returns { data: [...], pagination: { ... } }
        this.searchResults = res.data || [];
        this.results = this.searchResults.map(
          (emp: any) => emp.FullName || `${emp.FirstName} ${emp.LastName || ''}`
        );
        if (this.searchResults.length > 0) {
          this.openEmployeeListModal(this.searchResults);
        }
      },
      error: (err) => console.error('Search error:', err)
    });
  }

  async openEmployeeListModal(data: any) {
    // Dismiss existing modal if any
    const existingModal = await this.modalCtrl.getTop();
    if (existingModal) {
      await existingModal.dismiss();
    }

    const modal = await this.modalCtrl.create({
      component: EmployeeListModalComponent,
      componentProps: { employees: data },
      cssClass: 'employee-list-modal'
    });
    await modal.present();
  }
}
