import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { of, switchMap, catchError, Observable } from 'rxjs';
import { AuthService } from '../services/login-services.service';
import { EmployeeService } from '../services/employee.service';
import { RouteGuardService } from '../services/route-guard/route-service/route-guard.service';
import { AdminSetup } from '../services/admin-setup.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.Page.html',
  styleUrls: ['./login.Page.scss'],
})
export class LoginPage implements OnInit {

  loginForm!: FormGroup;

  emailChecked = false;
  showPassword = false;
  showCreatePassword = false;
  loading = false;
  isAdmin = false;
  isEmpId = false;
  empId: number | null = null;
  rolePreviewData: any = null;
  showForgotPassword = false;
  forgotPasswordForm!: FormGroup;
  forgotPasswordSuccess = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private employeeService: EmployeeService,
    private router: Router,
    private routeGuardService: RouteGuardService,
    private adminSetup: AdminSetup,
    private toastController: ToastController
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', Validators.required],   // email OR admin
      password: ['']
    });

    this.forgotPasswordForm = this.fb.group({
      employee_id: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ionViewWillEnter(): void {
    this.ngOnInit();
  }

  /** 🔍 ADMIN CHECK */
  private isAdminLogin(value: string): boolean {
    return value === 'admin';
  }

  /** STEP 1 */
  onNext(): void {
    let value = this.loginForm.value.email;
    if (value) {
      value = value.trim().toLowerCase();
      this.loginForm.get('email')?.setValue(value);
    }
    this.isAdmin = this.isAdminLogin(value);

    /* 🔥 ADMIN FLOW */
    if (this.isAdmin) {
      this.emailChecked = true;
      this.showPassword = true;
      this.loginForm.get('password')?.setValidators(Validators.required);
      this.loginForm.get('password')?.updateValueAndValidity();
      return;
    }

    /* 🔹 EMPLOYEE FLOW */
    this.isEmpId = /^\d+$/.test(value);

    // If it's a numeric ID, we still want to check if it exists
    this.authService.checkEmployee(value).subscribe({
      next: (res) => {
        if (!res.found) {
          this.presentToast('Employee not found', 'warning');
          return;
        }

        // Store the numeric ID from response if available
        if (res.employee?.id) {
          this.empId = res.employee.id;
        } else if (this.isEmpId) {
          this.empId = parseInt(value);
        }

        // Check if employee has team/reporting members
        this.authService.previewRole(value).subscribe({
          next: (roleRes) => {
            console.log('Employee role preview:', roleRes);
            this.rolePreviewData = roleRes;
            // Store role information if needed
            if (roleRes.hasTeam || roleRes.reportingMembers?.length > 0) {
              console.log('Employee has team members:', roleRes);
              sessionStorage.setItem('hasTeam', 'true');
              sessionStorage.setItem('rolePreview', JSON.stringify(roleRes));
            }
          },
          error: (err) => console.warn('Failed to fetch role preview:', err)
        });

        this.emailChecked = true;

        if (res.hasUserAccount) {
          this.showPassword = true;
        } else {
          this.showCreatePassword = true;
        }

        this.loginForm.get('password')?.setValidators(Validators.required);
        this.loginForm.get('password')?.updateValueAndValidity();
      },
      error: () => this.presentToast('Failed to verify employee', 'danger')
    });
  }

  /** STEP 2 */
  onSubmit(): void {
    let { email, password } = this.loginForm.value;
    if (email) {
      email = email.trim().toLowerCase();
      this.loginForm.get('email')?.setValue(email);
    }
    // this.loading = true;

    /* 🔥 ADMIN LOGIN */
    if (this.isAdmin) {
      this.authService.login({ username: email, password }).subscribe({
        next: () => {
          this.loading = false;
          this.navigateBasedOnRole();
        },
        error: () => {
          this.loading = false;
          this.presentToast('Invalid admin credentials', 'danger');
        }
      });
      return;
    }

    /* 🔹 EMPLOYEE LOGIN (Integrated Flow) */
    if (this.showPassword || this.showCreatePassword) {
      if (this.loginForm.invalid) {
        this.presentToast('Please enter your password', 'warning');
        return;
      }
      this.loading = true;

      // Determine the primary authentication stream
      // We always ensure a login happens after an attempted creation
      const isCreate = this.showCreatePassword;
      console.log('🚀 Starting integrated auth flow:', { isCreate });

      let authSource$: Observable<any>;
      if (isCreate) {
        // Step A: Attempt Creation
        const createCall$ = this.empId 
          ? this.authService.autoCreateUser(this.empId, password)
          : this.authService.createUser(email, password);

        authSource$ = createCall$.pipe(
          switchMap(res => {
            // 🔥 OPTIMIZATION: If backend already gave us a token, don't login again
            if (res?.token) {
              console.log('✅ Registration returned a valid token. Skipping redundant login call.');
              return of(res);
            }
            console.log('🔑 Registration successful but no token found. Performing explicit login fallback...');
            return this.authService.login({ username: email, password });
          }),
          catchError(err => {
            console.warn('⚠️ Registration failed or user already exists. Falling back to direct login:', err.error?.message || err.message);
            return this.authService.login({ username: email, password });
          })
        );
      } else {
        // Step A: Direct Login
        authSource$ = this.authService.login({ username: email, password });
      }

      // Step B: Chain Auth -> Profile -> Navigate
      authSource$.pipe(
        switchMap(() => {
          console.log('✅ Session secured, fetching profile...');
          return this.employeeService.getMyProfile(true).pipe(
            catchError(() => of(null))
          );
        })
      ).subscribe({
        next: () => {
          console.log('🏁 Auth sequence complete. Navigating in 100ms...');
          // Small delay ensures localStorage and app state are fully synchronized
          setTimeout(() => {
            this.loading = false;
            this.navigateBasedOnRole();
          }, 100);
        },
        error: (err) => {
          console.error('❌ Integrated flow failed:', err);
          this.loading = false;
          const msg = err.error?.message || err.error?.error || 'Authentication failed. Please check your credentials.';
          this.presentToast(msg, 'danger');
        }
      });
    }
  }


  onForgotPasswordSubmit(): void {
    if (this.forgotPasswordForm.invalid) return;
    this.loading = true;
    const { employee_id, password } = this.forgotPasswordForm.value;
    const token = '';
    this.authService.createPassword(employee_id, password, token).subscribe({
      next: () => {
        this.loading = false;
        this.forgotPasswordSuccess = true;
        this.showForgotPassword = false;
        this.presentToast('Password reset successful! Logging you in...', 'success');
        // Auto-login after password reset
        this.authService.login({ username: employee_id, password }).subscribe({
          next: () => this.navigateBasedOnRole(),
          error: () => {
            this.loading = false;
            this.presentToast('Password reset, but auto-login failed. Please login manually.', 'warning');
          }
        });
      },
      error: () => {
        this.loading = false;
        this.presentToast('Failed to reset password.', 'danger');
      }
    });
  }

  async presentToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary' = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  /** SHOW FORGOT PASSWORD FORM */
  showForgotPasswordForm(): void {
    this.showForgotPassword = true;
    this.forgotPasswordSuccess = false;
    this.forgotPasswordForm.reset();
  }

  /** HIDE FORGOT PASSWORD FORM */
  hideForgotPasswordForm(): void {
    this.showForgotPassword = false;
  }



  /** NAVIGATE BASED ON USER ROLE */
  private navigateBasedOnRole(): void {
    const role = this.routeGuardService.userRole?.toLowerCase();

    // Activate the main loading spinner for a smooth visual transition
    this.loading = true;

    if (role === 'admin') {
      this.router.navigate(['/admin'], { replaceUrl: true }).then(() => {
        window.location.reload();
      });
    } else {
      // Show welcome popup for employees before navigation
      // this.showWelcomePopup();
      this.router.navigate(['/Home'], { replaceUrl: true }).then(() => {
        window.location.reload();
      });
    }
  }

  /** SHOW WELCOME POPUP WITH EMPLOYEE DETAILS */
  private showWelcomePopup(): void {
    const employee = this.employeeService.getCurrentEmployee();
    const roleData = this.rolePreviewData;

    if (employee) {
      const name = `${employee.FirstName || ''} ${employee.LastName || ''}`;
      const department = employee.Department || 'Not Assigned';

      // Determine if employee is a Manager based on having reporting members
      const isManager = roleData?.hasTeam || (roleData?.reportingMembers && roleData.reportingMembers.length > 0);
      const role = isManager ? 'Manager' : (employee.Role || 'Employee');
      const teamInfo = isManager ? `\n👥 Team Members: ${roleData.reportingMembers?.length || 0}` : '';

      const message = `
🎉 Welcome Back!

👤 Name: ${name}
💼 Role: ${role}${teamInfo}
🏢 Department: ${department}
      `;

      alert(message.trim());
    }
  }

  /** LOGOUT */
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.loginForm.reset(); // Reset the form to clear all fields
        this.emailChecked = false; // Reset admin flow state
        this.showPassword = false; // Hide password field
        this.router.navigate(['/login']); // Navigate to login page
      },
      error: (err) => {
        console.error('Logout failed:', err);
      }
    });
  }

  /** HANDLE ENTER KEY PRESS */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.emailChecked && !this.showForgotPassword) {
      this.onNext();
    }
  }
}
