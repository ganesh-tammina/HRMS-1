import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, PopoverController, ToastController } from '@ionic/angular';
import { CandidateService } from '../services/pre-onboarding.service';
import { AboutusComponent } from './aboutus/aboutus.component';
import { ProfileComponent } from './profile/profile.component';
import { JobTabComponent } from './job-tab/job-tab.component';
import { RouteGuardService } from '../services/route-guard/route-service/route-guard.service';
import { environment } from 'src/environments/environment';
import { Subject, takeUntil, interval, take } from 'rxjs';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { EmployeeService } from '../services/employee.service';

@Component({
  selector: 'app-profile-page',
  templateUrl: './profile-page.component.html',
  styleUrls: ['./profile-page.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    AboutusComponent,
    ProfileComponent,
    JobTabComponent,
  ],
})
export class ProfilePageComponent implements OnInit, OnDestroy {
  currentemp: any = []; // Single employee object (kept original type/shape)
  currentEmployee: any;
  selectedFile: File | null = null;
  uploadedImageUrl: string | null = null;
  previewImageUrl: string | null = null;
  isUploading: boolean = false;
  profileimg: any;
  updateimage: string = '';
  env: string = '';


  private destroy$ = new Subject<void>();

  constructor(
    private candidateService: CandidateService,
    private routeGuardService: RouteGuardService,
    private popoverController: PopoverController,
    private employeeService: EmployeeService,
    private router: Router,
    private navCtrl: NavController,
    private toastController: ToastController,
  ) { }

  private currentEmployeeId: string | null = null;

  ngOnInit() {
    this.employeeService.getMyProfile().subscribe({
      next: (res: any) => {
        if (res)
          this.currentEmployee = res;
        console.log(res, 'hello');
      }
    });
    this.env = environment.apiURL.startsWith('http') ? environment.apiURL : `http://${environment.apiURL}`;
    console.log(this.env);

    // Listen for employee profile image updates
    this.employeeService.profileImageUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe((imagePath) => {
        if (imagePath && this.currentEmployee) {
          this.currentEmployee.profile_image = imagePath;
          console.log('🖼️ Profile Page: Profile image updated:', imagePath);
        }
      });
  }

  /**
   * Clear cached profile data
   */
  private clearCachedData() {
    this.currentemp = [];
    this.uploadedImageUrl = null;
    localStorage.removeItem('uploadedImageUrl');
    console.log('🧹 Cleared cached profile data');
  }

  /**
   * Fetch employee details from backend and update this.currentemp
   */
  private refreshEmployee() {
    if (!this.routeGuardService.employeeID) {
      console.warn('⚠️ refreshEmployee called but no employeeID available');
      return;
    }

    // this.candidateService
    //   //.getEmpDet()
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe({
    //     next: (response: any) => {
    //       if (response?.data?.length > 0) {
    //         this.currentemp = response.data[0];
    //         console.log('🔁 Employee Details refreshed:', this.currentemp);

    //         // If backend provides profile image path, create a full URL & cache-bust
    //         if (this.currentemp.profile_image) {
    //           const ipBase = 'https://30.0.0.78:3562';
    //           const prefix = /^https?:\/\//i.test(this.currentemp.profile_image)
    //             ? ''
    //             : ipBase;
    //           const fullImageUrl = `${prefix}${this.currentemp.profile_image}`;
    //           const cacheBusted = `${fullImageUrl}${
    //             fullImageUrl.includes('?') ? '&' : '?'
    //           }t=${Date.now()}`;
    //           this.uploadedImageUrl = cacheBusted;
    //           localStorage.setItem('uploadedImageUrl', cacheBusted);
    //           try {
    //             localStorage.setItem('uploadedImageUrl', cacheBusted);
    //             console.log(
    //               '💾 Image URL saved to localStorage (from refresh):',
    //               cacheBusted
    //             );
    //           } catch (err) {
    //             console.warn(
    //               '⚠️ Could not save uploadedImageUrl to localStorage:',
    //               err
    //             );
    //           }
    //         }
    //       } else {
    //         console.warn('⚠️ No employee data found in response');
    //         this.currentemp = [];
    //       }
    //     },
    //     // error: (err) => {
    //     //   console.error('❌ Error fetching employee details:', err);
    //     // },
    //   });
  }

  onFileSelected($event: any) {
    const file = $event.target.files && $event.target.files[0];
    if (file) {
      this.selectedFile = file;

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewImageUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);

      console.log('📸 Selected file:', this.selectedFile);
    }
  }

  uploadProfilePic() {
    if (!this.selectedFile) {
      this.showToast('Please select an image first', 'warning');
      return;
    }

    this.isUploading = true;

    this.employeeService.uploadProfileImage(this.selectedFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (res: any) => {
          this.updateimage = res.imagePath;

          // ✅ Update UI immediately
          this.currentEmployee.profile_image =
            this.updateimage + '?t=' + Date.now();

          // Reset states
          this.previewImageUrl = null;
          this.selectedFile = null;
          this.isUploading = false;

          // ✅ Close popover
          await this.popoverController.dismiss();

          // ✅ Success toast
          this.showToast('Profile picture updated successfully', 'success');
        },
        error: async (err) => {
          console.error('❌ Image upload failed:', err);
          this.isUploading = false;

          // Close popover (optional)
          await this.popoverController.dismiss();

          // ❌ Error toast
          this.showToast('Failed to upload profile picture', 'danger');
        }
      });
  }

  edit() {
    console.log('edit');
  }

  // Expose a public method to force refresh externally if needed
  public forceRefresh() {
    this.refreshEmployee();
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color,
      icon: color === 'success' ? 'checkmark-circle' : 'alert-circle'
    });
    await toast.present();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
