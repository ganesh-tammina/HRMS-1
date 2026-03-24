import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Candidate, CandidateService } from './services/pre-onboarding.service';
import { Observable, Subject, takeUntil } from 'rxjs';
import { HeaderComponent } from './shared/header/header.component';
import { RouteGuardService } from './services/route-guard/route-service/route-guard.service';
import { NavController } from '@ionic/angular';
import { EmployeeService } from './services/employee.service';
import { AdminService } from './services/admin-functionality/admin.service.service';
import { AuthService } from './services/login-services.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    HeaderComponent,
    CommonModule,
    IonicModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  showIntro = true;
  public showCategories = false;
  showMenu = true;
  currentUser: Observable<Candidate | null>;
  isLoginPage = false;
  iscandiateofferPage = false;
  iscandiateofferLetterPage = false;
  CurrentuserType: string = '';
  userType: string | null = null;
  one: any;
  isAdmin: boolean = false;
  full_name: string = '';
  currentTime: string = '';
  allEmployees: any[] = [];
  currentUrl: any; //get current page
  isRefreshing = false;
  userRole: string | null = null;
  public labels = ['Family', 'Friends', 'Notes', 'Work', 'Travel', 'Reminders'];
  userDesignation: string | null = null;
  userDepartment: string | null = null;

  constructor(
    private router: Router,
    private candidateService: CandidateService,
    private routeGaurdService: RouteGuardService,
    private employeeService: EmployeeService,
    private service: AdminService,
    private navCtrl: NavController,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUser = this.candidateService.currentCandidate$;
    this.router.events.pipe(
      takeUntil(this.destroy$)
    ).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl = event.urlAfterRedirects;
        this.showMenu = !this.currentUrl.includes('/login');
        this.isLoginPage = this.currentUrl.includes('/login');
        this.iscandiateofferPage = this.currentUrl.includes('/candidate_status');
        this.iscandiateofferLetterPage = this.currentUrl.includes('/candidate-offer-letter');

        this.userRole = this.routeGaurdService.userRole?.toLowerCase() || null;
        this.isAdmin = (this.userRole === 'admin' || this.userRole === 'hr');

        this.handleIntroLogic();
        this.fetchProfileInfoIfNeeded();

        // Ionic specific fix: Force a global layout recalculation after routing
        // This permanently prevents the 'stuck scroll' or 'invisible overflow' issue
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
          this.cdr.detectChanges();
        }, 200);
      }
    });
    this.currentUrl = this.router.url;
  }

  private handleIntroLogic() {
    const introSeen = localStorage.getItem('introSeen');
    if (!introSeen || this.isLoginPage) {
      this.showIntro = true;
      // Use a slightly shorter timeout and ensure it's cleared if needed
      setTimeout(() => {
        if (this.showIntro) {
          this.dismissIntro();
          if (!introSeen) localStorage.setItem('introSeen', 'true');
        }
      }, 0);
    } else {
      this.showIntro = false;
    }
  }

  private announcementsFetched = false;

  private fetchProfileInfoIfNeeded() {
    if (!this.userDesignation && this.userRole && !this.isLoginPage && this.routeGaurdService.isLoggedIn) {
      this.employeeService.getMyProfile().pipe(takeUntil(this.destroy$)).subscribe({
        next: (emp) => {
          if (emp) {
            this.userDesignation = (emp.designation_name || emp.designation || 'N/A').toLowerCase();
            this.userDepartment = (emp.department_name || emp.department || 'N/A').toLowerCase();
          }
        },
        error: (err) => {
          console.error('Failed to load profile in AppComponent', err);
          this.userDesignation = 'N/A'; // Prevent infinite retries
        }
      });
    }

    if (!this.announcementsFetched && !this.isLoginPage && this.routeGaurdService.isLoggedIn) {
      this.announcementsFetched = true;
      this.service.getAnnouncements().pipe(takeUntil(this.destroy$)).subscribe((r: any) => console.log('📢 Announcements:', r));
    }
  }

  ngOnInit(): void {
    this.updateRoleInfo();
  }

  private updateRoleInfo(): void {
    this.userRole = this.routeGaurdService.userRole?.toLowerCase() || null;
    const role = this.userRole?.trim() || '';
    this.isAdmin = (role === 'admin' || role === 'hr');
  }

  dismissIntro() {
    this.showIntro = false;
    // Force layout recalculation and change detection
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      this.cdr.detectChanges();
    }, 100);
  }

  shouldShowWorkTrack(): boolean {
    if (!this.isEmployeeOrManagerOrHr()) return false;
    if (this.userDepartment && this.userDepartment.trim().toLowerCase() === 'management') {
      return false;
    }
    return true;
  }

  shouldShowLeave(): boolean {
    // Hide leave for CEO
    return !(this.userDesignation && this.userDesignation.trim().toLowerCase() === 'ceo');
  }

  isAdminOnly(): boolean {
    return this.userRole === 'admin';
  }
  isHROnly(): boolean {
    return this.userRole === 'hr';
  }
  isAdminOrHR(): boolean {
    return this.userRole === 'admin' || this.userRole === 'hr';
  }
  isManager(): boolean {
    return this.userRole === 'manager';
  }
  isManagerOrAbove(): boolean {
    return this.userRole === 'manager' || this.userRole === 'hr';
  }
  isEmployeeOrManagerOrHr(): boolean {
    return this.userRole === 'employee' || this.userRole === 'manager' || this.userRole === 'hr';
  }
  isEmployee(): boolean {
    return this.userRole === 'employee';
  }
  preonboard() {
    this.router.navigate(['/pre-onboarding-cards']);
  }
  logout() {
    this.authService.logout().subscribe({
      next: () => {
        // Additional cleanup if necessary (RouteGuardService already clears most things)
        sessionStorage.clear();
        localStorage.removeItem('introSeen');
      },
      error: (err) => console.error('Logout failed in app component', err)
    });
  }
  handlePageRefresh(url: string) {
    // Check if user is logged in and navigating to main pages
    const isLoggedIn =
      this.routeGaurdService.token && this.routeGaurdService.refreshToken;
    const mainPages = ['/Me', '/Home', '/MyTeam', '/admin', '/profile-page'];
    const isMainPage = mainPages.some((page) => url.includes(page));
    // ...existing logic if needed
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}