import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';

import { environment } from 'src/environments/environment';
import { EmployeeService } from '../../../core/services/employee.service';
import { EmployeeLeavesService } from '../../../core/services/employee-leaves.service';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AttendanceApiService } from '../../../core/services/attendance-api.service';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
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

  /* ================= UI DATA ================= */
  greeting: string = '';
  todayDate: string = '';
  currentTime: string = '';
  currentYear = new Date().getFullYear();
  monthlyAttendanceReport: any[] = [];
  attendanceRate = 0;

  /* ================= EMPLOYEE ================= */
  currentEmployee: any = null;

  /* ================= IMAGES ================= */
  env: string = '';
  leaveCards: any[] = [];
  userDesignation: string | null = null;
  leaveCodeIdMap: any = {};
  todayAttendance: any = null;
  weeklyGrossHours: string = '0h 0m';
  todayEffectivePercentage: number = 0;
  weeklyAttendanceRate: number = 0;

  /* ================= BIRTHDAYS ================= */
  birthdays: any[] = [];

  /* ================= ANNOUNCEMENTS ================= */
  announcements: any[] = [];

  /* ================= DASHBOARD ================= */
  days: { date: string; status: 'Complete' | 'Remaining' }[] = [];

  constructor(
    private employeeService: EmployeeService,
    private alertController: AlertController,
    private router: Router,
    private attendanceService: AttendanceService,
    private attendanceApi: AttendanceApiService,
    private employeeLeaves: EmployeeLeavesService,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.setupEnvironment();
    this.setupGreetingAndDate();
    this.setupClock();
    this.loadLeaveBalance();
    this.loadAnnouncements();

    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    this.attendanceService.loadMonthlyReportOnAppStart(this.attendanceApi, year, month);

    this.attendanceService.monthlyReport$.pipe(takeUntil(this.destroy$)).subscribe(report => {
      this.monthlyAttendanceReport = report;

      const todayStr = new Date().toISOString().split('T')[0];
      this.todayAttendance = report.find(r => {
        const d = r.attendance_date || r.date;
        return d && d.startsWith(todayStr);
      }) || null;

      if (report.length) {
        const presentDays = report.filter(r => r.status === 'present').length;
        this.attendanceRate = Math.round((presentDays / report.length) * 100);
      }

      // Weekly stats
      const now = new Date();
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);

      const weekRecords = report.filter(r => {
        const d = new Date(r.attendance_date || r.date);
        return d >= weekStart && d <= now;
      });

      let weekTotalMinutes = 0;
      weekRecords.forEach(r => {
        weekTotalMinutes += (parseFloat(r.gross_hours || '0') || 0) * 60;
      });
      const h = Math.floor(weekTotalMinutes / 60);
      const m = Math.round(weekTotalMinutes % 60);
      this.weeklyGrossHours = `${h}h ${m}m`;

      if (weekRecords.length) {
        const presentWeek = weekRecords.filter(r => r.status === 'present' || r.status === 'on-time').length;
        this.weeklyAttendanceRate = Math.round((presentWeek / weekRecords.length) * 100);
      }

      if (this.todayAttendance) {
        const eff = parseFloat(this.todayAttendance.effective_hours) || 0;
        this.todayEffectivePercentage = Math.round((eff / 8) * 100);
      }

      this.cdr.detectChanges();
    });

    this.attendanceApi.punchRefresh$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      const y = new Date().getFullYear();
      const m = new Date().getMonth() + 1;
      this.attendanceService.loadMonthlyReportOnAppStart(this.attendanceApi, y, m);
    });

    this.attendanceApi.clockState$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.cdr.detectChanges();
    });

    this.loadBirthdays();

    const showLoginSuccess = localStorage.getItem('showLoginSuccess');
    if (showLoginSuccess === 'true') {
      localStorage.removeItem('showLoginSuccess');
      this.showLoginSuccessAlert();
    }

    this.employeeService.currentEmployee$.pipe(takeUntil(this.destroy$)).subscribe(emp => {
      if (emp) {
        this.currentEmployee = emp;
        this.userDesignation = emp.designation_name || emp.designation || null;
        this.cdr.detectChanges();
      }
    });
  }

  ionViewWillEnter() {
    this.loadEmployeeProfile();
    this.loadBirthdays();
  }

  loadBirthdays() {
    this.employeeService.getBirthdays().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any[]) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const results: any[] = [];

        data.forEach(emp => {
          const dob = emp.DateOfBirth ? new Date(emp.DateOfBirth) : null;
          const doj = emp.DateJoined ? new Date(emp.DateJoined) : null;

          if (dob) {
            const bday = new Date(dob);
            bday.setFullYear(today.getFullYear());
            if (bday < today) bday.setFullYear(today.getFullYear() + 1);
            if (bday >= today && bday <= nextWeek) {
              results.push({
                ...emp,
                uid: `${emp.id}_Birthday`,
                eventType: 'Birthday',
                eventDate: bday,
                originalDate: dob,
                isToday: bday.toDateString() === today.toDateString(),
                fullImageUrl: emp.profile_image ? `${this.env}${emp.profile_image}` : '../../assets/Profile_Picture.png'
              });
            }
          }

          if (doj) {
            const anniv = new Date(doj);
            anniv.setFullYear(today.getFullYear());
            if (anniv < today) anniv.setFullYear(today.getFullYear() + 1);
            if (anniv >= today && anniv <= nextWeek) {
              const years = today.getFullYear() - doj.getFullYear();
              if (years > 0) {
                results.push({
                  ...emp,
                  uid: `${emp.id}_Anniversary`,
                  eventType: 'Anniversary',
                  eventDate: anniv,
                  originalDate: doj,
                  years,
                  isToday: anniv.toDateString() === today.toDateString(),
                  fullImageUrl: emp.profile_image ? `${this.env}${emp.profile_image}` : '../../assets/Profile_Picture.png'
                });
              }
            }
          }
        });

        this.birthdays = results.sort((a, b) => a.eventDate - b.eventDate);
        this.cdr.detectChanges();
      },
      error: () => { this.birthdays = []; }
    });
  }

  showWishInput(employeeId: number) {
    this.activeWishEmployeeId = employeeId;
    if (!this.wishMessages[employeeId]) this.wishMessages[employeeId] = '';
  }

  hideWishInput() { this.activeWishEmployeeId = null; }

  sendWish(employeeId: number) {
    const message = this.wishMessages[employeeId]?.trim();
    if (!message) return;
    this.employeeService.sendBirthdayWish(employeeId, message).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        if (!this.birthdayWishes[employeeId]) this.birthdayWishes[employeeId] = [];
        this.birthdayWishes[employeeId].push({ message, sender_name: 'Me' });
        this.wishMessages[employeeId] = '';
        this.hideWishInput();
      },
      error: () => alert('Failed to send wish')
    });
  }

  viewWishes(milestone: any) {
    this.viewingMilestoneName = `${milestone.FirstName} ${milestone.LastName}`;
    this.employeeService.getBirthdayWishes(milestone.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any[]) => {
        this.wishesToView = res;
        this.isViewingWishes = true;
        this.cdr.detectChanges();
      }
    });
  }

  closeWishesModal() {
    this.isViewingWishes = false;
    this.wishesToView = [];
    this.viewingMilestoneName = '';
  }

  private setupEnvironment() {
    this.env = environment.apiURL.startsWith('http') ? environment.apiURL : `http://${environment.apiURL}`;
  }

  private loadEmployeeProfile() {
    this.currentEmployee = null;
    this.employeeService.getMyProfile().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.currentEmployee = res;
        this.userDesignation = res.designation_name || res.designation || null;
        this.cdr.detectChanges();
      },
      error: () => { this.currentEmployee = null; }
    });
  }

  get profileImageUrl(): string {
    if (!this.currentEmployee?.profile_image) return '../../assets/Profile_Picture.png';
    return `${this.env}${this.currentEmployee.profile_image}`;
  }

  private setupGreetingAndDate() {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting = 'Good Morning';
    else if (hour < 17) this.greeting = 'Good Afternoon';
    else this.greeting = 'Good Evening';

    const d = new Date();
    this.todayDate = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: '2-digit' });
  }

  private setupClock() {
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.clockInterval = setInterval(() => {
      this.currentTime = new Date().toLocaleTimeString('en-US', { hour12: true });
    }, 1000);
  }

  async showLoginSuccessAlert() {
    const alert = await this.alertController.create({
      header: 'Information',
      message: 'Login Successful',
      backdropDismiss: false,
      buttons: [{ text: 'OK' }]
    });
    await alert.present();
  }

  attendance() { this.router.navigate(['/Me']); }
  leaves() { this.router.navigate(['/leaves']); }
  myteam() { this.router.navigate(['/MyTeam']); }

  loadLeaveBalance() {
    this.employeeLeaves.getLeaveBalance(this.currentYear).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any[]) => {
        this.leaveCodeIdMap = {};
        res.forEach(item => { this.leaveCodeIdMap[item.type_code] = item.leave_type_id || item.id; });
        this.leaveCards = res.map(item => {
          const allocated = Number(item.allocated_days) || 0;
          const used = Number(item.used_days) || 0;
          return {
            title: item.type_name,
            allocated_days: allocated,
            used: used,
            available: Number(item.available_days),
            usedPercent: allocated > 0 ? Math.round((used / allocated) * 100) : 0,
            icon: this.getLeaveIcon(item.type_code),
          };
        });
      },
      error: err => console.error(err)
    });
  }

  getLeaveIcon(code: string): string {
    const map: any = { CL: 'CL.svg', SL: 'SL.svg', ML: 'ML.svg', CO: 'CO.svg', PL: 'CL.svg', UL: 'UL.svg' };
    return `assets/leave-icons/${map[code] || 'CL.svg'}`;
  }

  isCEO(): boolean {
    return this.currentEmployee?.designation_name?.toLowerCase() === 'ceo';
  }

  trackById(index: number, item: any) {
    return item.uid || item.id || item.employee_id || index;
  }

  loadAnnouncements() {
    this.adminService.getAnnouncements().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any[]) => {
        this.announcements = data;
        this.startAnnounceCarousel();
        this.cdr.detectChanges();
      },
      error: () => { }
    });
  }

  startAnnounceCarousel() {
    if (this.announceTimer) clearInterval(this.announceTimer);
    if (this.announcements.length > 1) {
      this.announceTimer = setInterval(() => { this.nextAnnounce(); }, 5000);
    }
  }

  nextAnnounce() {
    this.currentAnnounceIndex = (this.currentAnnounceIndex + 1) % this.announcements.length;
    this.cdr.detectChanges();
  }

  setAnnounce(index: number) {
    this.currentAnnounceIndex = index;
    this.startAnnounceCarousel();
    this.cdr.detectChanges();
  }

  getStatusLabel(): string {
    const isClockedIn = this.attendanceApi.getClockState();
    if (isClockedIn) return 'IN';
    const hasPunchedToday = this.todayAttendance && (this.todayAttendance.first_check_in || this.todayAttendance.check_in);
    return hasPunchedToday ? 'OUT' : 'NOT IN YET';
  }

  getStatusClass(): string {
    const label = this.getStatusLabel();
    if (label === 'IN') return 'status-in';
    if (label === 'OUT') return 'status-out';
    return '';
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.announceTimer) clearInterval(this.announceTimer);
  }
}
