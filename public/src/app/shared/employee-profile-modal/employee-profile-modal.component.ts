import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ModalController, IonicModule } from '@ionic/angular';
import { Candidate } from 'src/app/services/pre-onboarding.service';
import { AttendanceService } from 'src/app/services/attendance.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-employee-profile-modal',
  templateUrl: './employee-profile-modal.component.html',
  styleUrls: ['./employee-profile-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class EmployeeProfileModalComponent implements OnInit {
  @Input() selectedEmployee: any;
  selectedObeject: any;
  attendanceStatus: 'in' | 'out' | '' = '';

  constructor(private modalCtrl: ModalController, private attendanceService: AttendanceService) { }

  ngOnInit() {
    // If the API response is { employee: {...}, ... }, use employee object for details
    this.selectedObeject = this.selectedEmployee?.employee || this.selectedEmployee;

    // Determine attendance status from last attendance log if available
    const attendanceRecords = this.selectedEmployee?.attendance_summary?.recent_records;
    if (attendanceRecords && attendanceRecords.length > 0) {
      const last = attendanceRecords[0];
      // If last record has check-in but no check-out, show 'In'; if both present, show 'Out'
      if (last.first_check_in && !last.last_check_out) {
        this.attendanceStatus = 'in';
      } else {
        this.attendanceStatus = 'out';
      }
    } else if (this.selectedObeject && (this.selectedObeject.employee_id || this.selectedObeject.id)) {
      // Fallback: use attendanceService if no log available
      const empId = this.selectedObeject.employee_id || this.selectedObeject.id;
      this.attendanceService.checkLoginOrLoggedOut(empId).subscribe({
        next: (res: any) => {
          this.attendanceStatus = res?.status === 'in' ? 'in' : 'out';
        },
        error: () => {
          this.attendanceStatus = '';
        }
      });
    } else {
      this.attendanceStatus = this.selectedObeject?.active_status || '';
    }
    console.log('Employee data in profile modal:', this.selectedObeject);
  }


  // 🛠️ Function to extract initials from the full name


  getInitials(fullName: string): string {
    if (!fullName) {
      return '??';
    }

    // Split the name by spaces and filter out empty strings
    const nameParts = fullName.trim().split(/\s+/).filter(part => part.length > 0);

    if (nameParts.length === 0) {
      return '??';
    }

    let initials = '';

    if (nameParts.length === 1) {
      // Use the first two letters if only one word is provided
      initials = nameParts[0].substring(0, 2);
    } else {
      // Use the first letter of the first and last word
      const firstInitial = nameParts[0].charAt(0);
      const lastInitial = nameParts[nameParts.length - 1].charAt(0);
      initials = firstInitial + lastInitial;
    }

    return initials.toUpperCase();
  }

  // 🎨 Optional: Function to generate a dynamic background color
  getAvatarColor(name: string): string {
    // Implement a simple hash function here to return a color based on the name
    // For now, return a fixed color or implement logic like below:
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#009688'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  /* ================= PROFILE IMAGE ================= */
  getProfileImage(employee: any): string {
    if (!employee) {
      return 'assets/icon/Default-user.svg';
    }

    if (employee?.profile_image) {
      const env = environment;
      const apiUrl = env.apiURL.startsWith('http') ? env.apiURL : `http://${env.apiURL}`;
      return `${apiUrl}${employee.profile_image}?t=${Date.now()}`;
    }

    return 'assets/icon/Default-user.svg';
  }

  close() {
    this.modalCtrl.dismiss();
  }

}
