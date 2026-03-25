import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import moment from 'moment';

import { environment } from 'src/environments/environment';
import { EmployeeService } from '../services/employee.service';
import { CandidateService } from '../services/pre-onboarding.service';
import { ClockButtonComponent } from '../services/clock-button/clock-button.component';
import { EmployeeLeavesService } from '../services/employee-leaves.service';
import { AttendanceService } from '../services/attendance.service';
import { AttendanceApiService } from '../services/attendance-api.service';
import { AdminService } from '../services/admin-functionality/admin.service.service';


@Component({
  standalone: true,
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ClockButtonComponent,
    RouterLink
  ],
})
export class HomePage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private clockInterval: any;
  // Birthday wishes UI state
  activeWishEmployeeId: number | null = null;
  wishMessages: { [employeeId: number]: string } = {};
  birthdayWishes: { [employeeId: number]: any[] } = {};
  
  // Viewing wishes state
  isViewingWishes = false;
  wishesToView: any[] = [];
  viewingMilestoneName = '';

  // Announcements Carousel
  currentAnnounceIndex = 0;
  private announceTimer: any;

  /* ================= CONSTANTS ================= */
  private static readonly REFRESH_DELAY_MS = 10;

  /* ================= UI DATA ================= */
  greeting: string = '';
  todayDate: string = '';
  currentTime: string = '';
  currentYear = new Date().getFullYear();
  monthlyAttendanceReport: any[] = [];
  attendanceRate = 0;
  leaveTypes: { code: string; name: string; available: number }[] = [];


  /* ================= EMPLOYEE ================= */
  currentEmployee: any = null;

  /* ================= IMAGES ================= */
  env: string = '';
  imageUrls: any;
  leaveCards: any[] = [];
  userDesignation: string | null = null;
  leaveCodeIdMap: any = {};
  todayAttendance: any = null;
  weeklyGrossHours: string = '0h 0m';
  todayEffectivePercentage: number = 0;
  weeklyAttendanceRate: number = 0;
  backgroundImageUrl: string = '../../assets/holidays-pics/christmas_pic.svg';

  /* ================= BIRTHDAYS ================= */
  birthdays: any[] = [];

  /* ================= ANNOUNCEMENTS ================= */
  announcements: any[] = [];

  /* ================= DASHBOARD ================= */
  days: { date: string; status: 'Complete' | 'Remaining' }[] = [];
  cdRef: ChangeDetectorRef;
  constructor(
    private employeeService: EmployeeService,
    private candidateService: CandidateService,
    private alertController: AlertController,
    private router: Router,
    private attendanceService: AttendanceService,
    private attendanceApi: AttendanceApiService,
    private employeeLeaves: EmployeeLeavesService,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) { this.cdRef = cdr; }

  /* =====================================================
     🔹 ngOnInit → runs ONCE (static data only)
  ===================================================== */
  ngOnInit() {
    this.setupEnvironment();
    this.setupGreetingAndDate();
    this.setupClock();
    this.setupDays();
    this.loadLeaveBalance()
    this.loadAnnouncements();

    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    this.attendanceService.loadMonthlyReportOnAppStart(
      this.attendanceApi,
      year,
      month
    );

    // ✅ RECEIVE MONTHLY ATTENDANCE
    this.attendanceService.monthlyReport$
      .pipe(takeUntil(this.destroy$))
      .subscribe(report => {
        this.monthlyAttendanceReport = report;
        console.log('🏠 Home received monthly attendance:', this.monthlyAttendanceReport);

        // Find today's specific record
        const todayStr = moment().format('YYYY-MM-DD');
        this.todayAttendance = report.find(r => moment(r.attendance_date || r.date).format('YYYY-MM-DD') === todayStr) || null;
        console.log('📅 Today Attendance:', this.todayAttendance);

        // Example calculation
        if (report.length) {
          const presentDays = report.filter(r => r.status === 'present').length;
          this.attendanceRate = Math.round(
            (presentDays / report.length) * 100
          );
        }

        // --- Calculate Dynamic Weekly Stats ---
        const startOfWeek = moment().startOf('week');
        const endOfWeek = moment().endOf('week');

        const weekRecords = report.filter(r => {
          const d = moment(r.attendance_date || r.date);
          return d.isSameOrAfter(startOfWeek) && d.isSameOrBefore(endOfWeek);
        });

        // 1. Weekly Gross Hours
        let weekTotalMinutes = 0;
        weekRecords.forEach(r => {
          const gross = r.gross_hours || "0";
          const val = parseFloat(gross) || 0;
          weekTotalMinutes += val * 60;
        });
        const h = Math.floor(weekTotalMinutes / 60);
        const m = Math.round(weekTotalMinutes % 60);
        this.weeklyGrossHours = `${h}h ${m}m`;

        // 2. Weekly Attendance Rate (On Time)
        if (weekRecords.length) {
          const presentWeekDays = weekRecords.filter(r => r.status === 'present' || r.status === 'on-time').length;
          this.weeklyAttendanceRate = Math.round((presentWeekDays / weekRecords.length) * 100);
        } else {
          this.weeklyAttendanceRate = 0;
        }

        // 3. Today's Effective Percentage
        if (this.todayAttendance) {
          const eff = parseFloat(this.todayAttendance.effective_hours) || 0;
          this.todayEffectivePercentage = Math.round((eff / 8) * 100);
        } else {
          this.todayEffectivePercentage = 0;
        }

        // Force UI update if needed
        this.cdr.detectChanges();
      });

    // 🔄 REFRESH REPORT ON ANY PUNCH SUCCESS (Real-time update)
    this.attendanceApi.punchRefresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const y = new Date().getFullYear();
        const m = new Date().getMonth() + 1;
        console.log('🔄 Punch action confirmed, refreshing dashboard stats...');
        this.attendanceService.loadMonthlyReportOnAppStart(this.attendanceApi, y, m);
      });

    // 🔄 RE-RENDER ON CLOCK STATE CHANGE (Instant UI feedback)
    this.attendanceApi.clockState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cdr.detectChanges();
      });

    this.loadBirthdays();

    const showLoginSuccess = localStorage.getItem('showLoginSuccess');
    if (showLoginSuccess === 'true') {
      localStorage.removeItem('showLoginSuccess');
      this.showLoginSuccessAlert();
    }

    // Subscribe to employee updates for reactive UI (name, image, etc.)
    this.employeeService.currentEmployee$
      .pipe(takeUntil(this.destroy$))
      .subscribe(emp => {
        if (emp) {
          this.currentEmployee = emp;
          this.userDesignation = emp.designation_name || emp.designation || null;
          this.cdr.detectChanges();
        }
      });
  }

  /* =====================================================
     🔹 ionViewWillEnter → runs EVERY TIME page opens
     🔥 THIS FIXES YOUR ISSUE
  ===================================================== */
  ionViewWillEnter() {
    this.loadEmployeeProfile();
    this.loadBirthdays();
  }

  loadBirthdays() {
    this.employeeService.getBirthdays()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any[]) => {
          const today = moment().startOf('day');
          const nextWeek = moment().add(7, 'days').endOf('day');
          const results: any[] = [];

          data.forEach(emp => {
            const dob = emp.DateOfBirth ? moment(emp.DateOfBirth) : null;
            const doj = emp.DateJoined ? moment(emp.DateJoined) : null;

            // Check Birthday
            if (dob) {
              const bday = dob.clone().year(today.year());
              if (bday.isBefore(today)) bday.add(1, 'year');
              
              if (bday.isBetween(today, nextWeek, 'day', '[]')) {
                results.push({
                  ...emp,
                  uid: `${emp.id}_Birthday`,
                  eventType: 'Birthday',
                  eventDate: bday.toDate(),
                  originalDate: dob.toDate(),
                  isToday: bday.isSame(today, 'day'),
                  fullImageUrl: emp.profile_image ? `${this.env}${emp.profile_image}` : 'assets/icon/Default-user.svg'
                });
              }
            }

            // Check Anniversary
            if (doj) {
              const anniv = doj.clone().year(today.year());
              if (anniv.isBefore(today)) anniv.add(1, 'year');
              
              if (anniv.isBetween(today, nextWeek, 'day', '[]')) {
                const years = today.subtract(0, 'years').year() - doj.year();
                if (years > 0) {
                  results.push({
                    ...emp,
                    uid: `${emp.id}_Anniversary`,
                    eventType: 'Anniversary',
                    eventDate: anniv.toDate(),
                    originalDate: doj.toDate(),
                    years: years,
                    isToday: anniv.isSame(today, 'day'),
                    fullImageUrl: emp.profile_image ? `${this.env}${emp.profile_image}` : 'assets/icon/Default-user.svg'
                  });
                }
              }
            }
          });

          // Sort by date
          this.birthdays = results.sort((a, b) => moment(a.eventDate).diff(moment(b.eventDate)));
          console.log('🎂 Filtered Milestones:', this.birthdays);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.birthdays = [];
          console.error('Failed to fetch birthdays:', err);
        }
      });
  }

  /* ================= PROFILE IMAGE ================= */
  getProfileImage(birthday: any): string {
    return birthday?.fullImageUrl || 'assets/icon/Default-user.svg';
  }

  showWishInput(employeeId: number) {
    this.activeWishEmployeeId = employeeId;
    if (!this.wishMessages[employeeId]) {
      this.wishMessages[employeeId] = '';
    }
  }

  hideWishInput() {
    this.activeWishEmployeeId = null;
  }

  sendWish(employeeId: number) {
    const message = this.wishMessages[employeeId]?.trim();
    if (!message) return;
    this.employeeService.sendBirthdayWish(employeeId, message)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          if (!this.birthdayWishes[employeeId]) {
            this.birthdayWishes[employeeId] = [];
          }
          this.birthdayWishes[employeeId].push({ message, sender_name: 'Me' }); // Optimistic local update
          this.wishMessages[employeeId] = '';
          this.hideWishInput();
          console.log("Wish sent successfully!");
        },
        error: (err) => {
          alert('Failed to send wish');
          console.error('Failed to send wish:', err);
        }
      });
  }

  viewWishes(milestone: any) {
    this.viewingMilestoneName = `${milestone.FirstName} ${milestone.LastName}`;
    this.employeeService.getBirthdayWishes(milestone.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any[]) => {
          this.wishesToView = res;
          this.isViewingWishes = true;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load wishes:', err);
        }
      });
  }

  closeWishesModal() {
    this.isViewingWishes = false;
    this.wishesToView = [];
    this.viewingMilestoneName = '';
  }

  /* ================= ENV ================= */
  private setupEnvironment() {
    this.env = environment.apiURL.startsWith('http')
      ? environment.apiURL
      : `http://${environment.apiURL}`;
  }

  /* ================= EMPLOYEE PROFILE ================= */
  private loadEmployeeProfile() {
    // 🔴 Clear old user immediately
    this.currentEmployee = null;

    this.employeeService.getMyProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.currentEmployee = res;
          this.userDesignation = res.designation_name || res.designation || null;

          console.log("Employee Designation 👉", this.userDesignation);
          console.log('Logged-in Employee 👉', this.currentEmployee);

          // Force UI refresh
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Profile load failed', err);
          this.currentEmployee = null;
        }
      });
  }

  /* ================= PROFILE IMAGE ================= */
  get profileImageUrl(): string {
    if (!this.currentEmployee?.profile_image) {
      return 'assets/icon/Default-user.svg';
    }
    return `${this.env}${this.currentEmployee.profile_image}`;
  }

  /* ================= GREETING ================= */
  private setupGreetingAndDate() {
    const hour = new Date().getHours();

    if (hour < 12) {
      this.greeting = 'Good Morning';
    } else if (hour < 17) {
      this.greeting = 'Good Afternoon';
    } else {
      this.greeting = 'Good Evening';
    }

    this.todayDate = moment().format('dddd, MMMM DD, YYYY');
  }

  /* ================= CLOCK ================= */
  private setupClock() {
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.clockInterval = setInterval(() => {
      this.currentTime = new Date().toLocaleTimeString('en-US', {
        hour12: true,
      });
    }, 1000);
  }

  /* ================= WEEK DAYS ================= */
  private setupDays() {
    const today = moment();
    this.days = Array.from({ length: 7 }, (_, i) => {
      const day = today.clone().add(i, 'days');
      return {
        date: day.format('ddd'),
        status: day.isSameOrBefore(today, 'day')
          ? 'Complete'
          : 'Remaining'
      };
    });
  }

  /* ================= ALERT ================= */
  async showLoginSuccessAlert() {
    const alert = await this.alertController.create({
      header: 'Information',
      message: 'Login Successful',
      backdropDismiss: false,
      buttons: [
        {
          text: 'OK',
          handler: () => {
            setTimeout(() => { }, HomePage.REFRESH_DELAY_MS);
          }
        }
      ]
    });
    await alert.present();
  }

  /* ================= NAVIGATION ================= */
  attendance() {
    this.router.navigate(['/Me']);
  }

  leaves() {
    this.router.navigate(['/leaves']);
  }

  myteam() {
    this.router.navigate(['/MyTeam']);
  }

  /* ================= OPTIONAL LOGOUT (SAFE) ================= */
  logout() {

  }
  /* ===================== LEAVE TYPE → ID ===================== */
  private mapLeaveCodeToId(code: string): number {
    const id = this.leaveCodeIdMap[code];

    if (!id) {
      console.error('Leave type ID not found for code:', code);
    }

    return id;
  }
  /* ===================== LEAVE BALANCE ===================== */
  loadLeaveBalance() {
    this.employeeLeaves.getLeaveBalance(this.currentYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any[]) => {
          this.leaveCodeIdMap = {};
          res.forEach(item => {
            this.leaveCodeIdMap[item.type_code] = item.leave_type_id || item.id;
          });
          this.leaveCards = res.map(item => ({
            title: item.type_name,
            allocated_days: Number(item.allocated_days),
            used: Number(item.used_days),
            available: Number(item.available_days),
            icon: this.getLeaveIcon(item.type_code),
          }));
          console.log(this.leaveCards, 'leaves')

          this.leaveTypes = res.map(item => ({
            code: item.type_code,
            name: item.type_name,
            available: Number(item.available_days),
          }));
        },
        error: err => console.error(err),
      });
  }
  getLeaveIcon(code: string): string {
    const map: any = {
      CL: 'CL.svg',
      SL: 'SL.svg',
      ML: 'ML.svg',
      CO: 'CO.svg',
      PL: 'CL.svg',
      UL: 'UL.svg',
    };
    return `../../../assets/leave-icons/${map[code] || 'CL.svg'}`;
  }

  isCEO(): boolean {
    return this.currentEmployee?.designation_name?.toLowerCase() === 'ceo';
  }

  trackById(index: number, item: any) {
    return item.uid || item.id || item.employee_id || index;
  }

  loadAnnouncements() {
    this.adminService.getAnnouncements()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any[]) => {
          this.announcements = data.map(announce => ({
            ...announce,
            relativeTime: moment(announce.created_at).fromNow()
          }));
          console.log('📢 Announcements loaded:', this.announcements.length);
          this.startAnnounceCarousel();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('❌ Failed to load announcements:', err);
        }
      });
  }

  startAnnounceCarousel() {
    if (this.announceTimer) clearInterval(this.announceTimer);
    if (this.announcements.length > 1) {
      this.announceTimer = setInterval(() => {
        this.nextAnnounce();
      }, 5000);
    }
  }

  nextAnnounce() {
    this.currentAnnounceIndex = (this.currentAnnounceIndex + 1) % this.announcements.length;
    this.cdr.detectChanges();
  }

  setAnnounce(index: number) {
    this.currentAnnounceIndex = index;
    this.startAnnounceCarousel(); // Reset timer
    this.cdr.detectChanges();
  }

  getStatusLabel(): string {
    // Use the real-time shared clock state for the most accurate IN/OUT status
    const isClockedIn = this.attendanceApi.getClockState();

    if (isClockedIn) {
      return 'IN';
    } else {
      // If not currently clocked in, check if they have any punch record for today
      // If they have a first check-in but are not currently clocked in, they must be OUT
      const hasPunchedToday = this.todayAttendance && 
        (this.todayAttendance.first_check_in || this.todayAttendance.check_in);
      
      return hasPunchedToday ? 'OUT' : 'NOT IN AT';
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.announceTimer) clearInterval(this.announceTimer);
  }
}
