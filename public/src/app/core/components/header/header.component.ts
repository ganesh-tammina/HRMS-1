import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EmployeeService } from '../../services/employee.service';
import { AuthService } from '../../services/auth.service';
import { RouteGuardService } from '../../services/route-guard.service';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false
})
export class HeaderComponent implements OnInit, OnDestroy {
  searchQuery: string = '';
  searchResults: any[] = [];
  results: string[] = [];

  // Employee details modal state
  isViewingEmployeeModal: boolean = false;
  selectedEmployee: any = null;

  // Profile state
  currentEmployee: any;
  profileImageUrl: string = '../../assets/Profile_Picture.png';
  env: string = '';
  isAdmin: boolean = false;
  isAuthenticated: boolean = false;

  // Master Data
  departments: any[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private navCtrl: NavController,
    private employeeService: EmployeeService,
    private adminService: AdminService,
    private routeGuardService: RouteGuardService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.env = environment.apiURL.startsWith('http') ? environment.apiURL : `http://${environment.apiURL}`;
    this.isAdmin = this.routeGuardService.userRole?.toLowerCase() === 'admin';

    const currentUrl = this.router.url;
    const isLoginPage = currentUrl.includes('/login');

    if (isLoginPage) {
      this.isAuthenticated = false;
      return;
    }

    this.isAuthenticated = this.routeGuardService.isLoggedIn;

    if (this.isAuthenticated) {
      this.employeeService.getMyProfile()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res: any) => {
            if (res) {
              this.currentEmployee = res;
              this.updateProfileImageUrl();
            }
          },
          error: (err) => {
            console.error('Header profile load failed:', err);
          }
        });

      this.employeeService.currentEmployee$
        .pipe(takeUntil(this.destroy$))
        .subscribe(emp => {
          if (emp) {
            this.currentEmployee = emp;
            this.updateProfileImageUrl();
          }
        });

      // Load master data to map IDs for search results
      this.adminService.getDepartments()
        .pipe(takeUntil(this.destroy$))
        .subscribe(deps => {
          this.departments = deps || [];
        });
    }
  }

  private updateProfileImageUrl() {
    if (this.currentEmployee?.profile_image) {
      this.profileImageUrl = `${this.env}${this.currentEmployee.profile_image}`;
    } else {
      this.profileImageUrl = '../../assets/Profile_Picture.png';
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  viewProfile() {
    // Navigate to profile details page if available
    this.navCtrl.navigateForward('/profile');
  }

  onSearch() {
    if (this.searchQuery.trim().length > 2) {
      this.employeeService.searchEmployees(this.searchQuery.trim(), 1, 10).subscribe({
        next: (res: any) => {
          this.searchResults = res.data || [];
          this.results = this.searchResults.map(emp => emp.FullName || `${emp.FirstName} ${emp.LastName}`);
        }
      });
    } else {
      this.searchResults = [];
      this.results = [];
    }
  }

  handleImageError(event: any) {
    event.target.src = '../../assets/Profile_Picture.png';
  }

  openEmployeeDetailsModal(emp: any) {
    this.searchResults = []; // Close the popover by clearing results
    
    // Fetch full details from Employee API to ensure fields like department_name are populated
    const idToFetch = emp.id || emp.employee_id || emp.EmployeeId;
    if (idToFetch) {
      this.employeeService.getEmployeeById(idToFetch).subscribe({
        next: (fullEmpDetails: any) => {
          this.selectedEmployee = { ...emp, ...fullEmpDetails };
          this.isViewingEmployeeModal = true;
        },
        error: (err) => {
          console.error('Error fetching full employee details:', err);
          // Fallback to basic search object
          this.selectedEmployee = emp;
          this.isViewingEmployeeModal = true;
        }
      });
    } else {
      this.selectedEmployee = emp;
      this.isViewingEmployeeModal = true;
    }
  }

  closeEmployeeDetailsModal() {
    this.isViewingEmployeeModal = false;
    this.selectedEmployee = null;
  }

  getDepartmentName(departmentId: any, fallbackName: string): string {
    if (departmentId) {
      const found = this.departments.find(d => d.id === departmentId);
      if (found) return found.name;
    }
    return fallbackName || 'N/A';
  }

  openEmployeeListModal() {
    // Handle opening modern ionic modal / navigating to search results page
  }
}
