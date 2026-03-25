import { Component, OnInit, ViewChild } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

import {
  CandidateService,
  Candidate,
} from '../../services/pre-onboarding.service';

import {
  AttendanceService,
  AttendanceRecord,
  AttendanceEvent,
} from '../../services/attendance.service';

import { EmployeeHeaderComponent } from './employee-header/employee-header.component';
import { ClockButtonComponent } from '../../services/clock-button/clock-button.component';
import { AttendanceLogComponent } from './attendance-log/attendance-log.component';
import { CalendarComponent } from './calendar/calendar.component';
import { AttendanceRequestComponent } from './attendance-request/attendance-request.component';
import { RadialTimeGraphComponent } from './radial-time-graph/radial-time-graph.component';

import { WorkFromHomeComponent } from './work-from-home/work-from-home.component';
import { RemoteClockinModalComponent } from './remote-clockin-modal.component';
import { AttendanceApiService } from '../../services/attendance-api.service';
import { AdminService } from 'src/app/services/admin-functionality/admin.service.service';
import { EmployeeService } from 'src/app/services/employee.service';
import { TimeFormatPipe } from './time-format.pipe';
import { LeaverequestService } from 'src/app/services/leaverequest.service';

@Component({
  selector: 'app-me',
  templateUrl: './me.page.html',
  styleUrls: ['./me.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    ClockButtonComponent,
    EmployeeHeaderComponent,
    AttendanceLogComponent,
    CalendarComponent,
    AttendanceRequestComponent,
    RadialTimeGraphComponent,
    RemoteClockinModalComponent,
    TimeFormatPipe,
  ],
  // ...existing code...
})
export class MePage implements OnInit {
  @ViewChild(ClockButtonComponent) clockButton!: ClockButtonComponent;
  public async openRemoteClockinModal() {
    const modal = await this.modalCtrl.create({
      component: RemoteClockinModalComponent,
      cssClass: 'checkinInfo-popup side-custom-popup',
      backdropDismiss: false,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.success) {
      this.showToast('Remote Clock-In request submitted', 'success');
      // Always trigger attendance log refresh
      this.attendanceRefresh = Date.now();
      // Debug: Log ViewChild and data
      console.log('Remote modal dismissed with:', data, 'clockButton:', this.clockButton);
      // If remote clock-in was successful, update clock button UI instantly
      if (data.forceRemote && this.clockButton) {
        console.log('Calling clockButton.clockIn(true)');
        // Set clock button to Remote mode and show Remote Clock-Out instantly
        this.clockButton.workMode = 'Remote';
        this.clockButton.isClockedIn = true;
        this.clockButton.remoteActive = true;
      } else if (data.forceRemote) {
        console.warn('clockButton ViewChild not set!');
      }
    }
  }
  attendanceRefresh = 0;

  employee?: Candidate;
  record?: AttendanceRecord;

  // ================= SHIFT =================
  shift_id: any;
  allShiftPolicies: any[] = [];
  shift_policy: any;

  // ================= WEEKEND =================
  weekend_id: any;
  allWeekendPolicies: any[] = [];
  serverWeekOff: string[] = [];

  // ================= UI =================
  shiftDuration = '9h 0m';
  breakMinutes = 60;
  effectiveHours = '00:00';
  grossHours = '00:00';
  status = 'Absent';

  history: AttendanceEvent[] = [];
  activeTab = 'log';
  progressValue = 0.85;

  days: Date[] = [];
  today: Date = new Date();
  currentMonthName: string = '';

  monthlySummary: any = {
    total_days: 0,
    present_days: 0,
    absent_days: 0,
    half_days: 0,
    avg_work_hours: 0,
    total_effective_hours: 0,
    total_gross_hours: 0
  };

  constructor(
    private candidateService: CandidateService,
    private attendanceService: AttendanceService,
    private modalCtrl: ModalController,
    private attendanceApi: AttendanceApiService,
    private adminService: AdminService,
    private employeeService: EmployeeService,
    private toastCtrl: ToastController,
    private leaveService: LeaverequestService
  ) {
    this.generateDays();
  }

  // ================= INIT =================
  ngOnInit() {
    this.loadShiftPolicies();
    this.loadWeekendPolicies();
    this.loadEmployeeProfile();
    this.loadTodayAttendance();
    this.loadMonthlySummary();
  }

  // ================= DATA LOADERS =================

  loadShiftPolicies() {
    this.adminService.getShiftPolicies().subscribe(res => {
      this.allShiftPolicies = res || [];
      this.matchEmployeeShift();
    });
  }

  loadWeekendPolicies() {
    this.adminService.getWeeklyOffPolicies().subscribe(res => {
      this.allWeekendPolicies = res || [];
      this.matchEmployeeWeekend();
    });
  }

  loadEmployeeProfile() {
    this.employeeService.getMyProfile().subscribe(profile => {
      this.shift_id = profile.shift_policy_id;
      this.weekend_id = profile.weekly_off_policy_id;
      this.matchEmployeeShift();
      this.matchEmployeeWeekend();
    });
  }

  loadTodayAttendance() {
    this.attendanceApi.getTodayAttendance().subscribe({
      next: (res: any) => {
        this.status = res?.attendance?.status || 'Absent';

        const pipe = new TimeFormatPipe();

        if (res?.attendance) {
          let gross = parseFloat(res.attendance.gross_hours || 0);
          let effective = parseFloat(res.attendance.total_work_hours || 0);

          // If currently clocked in, calculate live hours
          if (res.last_punch_type === 'in' && res.punches?.length > 0) {
            const lastPunch = res.punches[res.punches.length - 1];
            const startTime = new Date(lastPunch.punch_time).getTime();
            const now = new Date().getTime();
            const diffHours = (now - startTime) / (1000 * 60 * 60);

            // Add live session to effective & gross
            effective += diffHours;

            // For gross, if it was null, calculate from first punch to now
            const firstPunch = res.punches[0];
            const firstTime = new Date(firstPunch.punch_time).getTime();
            gross = (now - firstTime) / (1000 * 60 * 60);
          }

          this.grossHours = pipe.transform(gross);
          this.effectiveHours = pipe.transform(effective);
        } else {
          this.grossHours = '00:00';
          this.effectiveHours = '00:00';
        }
      },
      error: () => {
        this.status = 'Absent';
        this.grossHours = '00:00';
        this.effectiveHours = '00:00';
      },
    });
  }

  lastAttendance: any[] = [];
  lastLeaves: any[] = [];

  loadMonthlySummary() {
    const d = new Date();
    this.currentMonthName = d.toLocaleString('default', { month: 'long' });

    this.attendanceApi.getMonthlyAttendanceSummary().subscribe({
      next: (res: any) => {
        if (res?.summary) {
          this.monthlySummary = res.summary;
          this.lastAttendance = res?.attendance || [];

          // Fallback if backend /my-report wasn't restarted
          if (res?.leaves) {
            this.lastLeaves = res.leaves;
            this.recalculateSummary();
          } else {
            this.leaveService.getMyLeaves(d.getFullYear()).subscribe({
              next: (leaves: any) => {
                this.lastLeaves = leaves.filter((l: any) => (l.status || '').toUpperCase() === 'APPROVED');
                this.recalculateSummary();
              },
              error: () => {
                this.lastLeaves = [];
                this.recalculateSummary();
              }
            });
          }
        }
      },
      error: (err) => console.error('Error loading monthly summary:', err)
    });
  }

  recalculateSummary() {
    // Wait until weekend policy is loaded to correctly calculate absent days
    if (!this.serverWeekOff) {
      console.log('recalculateSummary aborted: serverWeekOff not yet loaded.');
      return;
    }

    if (!this.lastAttendance || !this.monthlySummary) {
      console.log('recalculateSummary aborted: lastAttendance or monthlySummary not loaded.');
      return;
    }

    console.log('recalculateSummary running. att count:', this.lastAttendance.length, 'leaves count:', this.lastLeaves.length);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayNum = now.getDate();

    const leaveSet = new Set();
    this.lastLeaves.forEach((l: any) => {
      const from = new Date(l.start_date || l.from_date);
      const to = new Date(l.end_date || l.to_date || l.start_date);
      let curr = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
      while (curr <= end) {
        leaveSet.add(new Date(curr).toDateString());
        curr.setDate(curr.getDate() + 1);
      }
    });

    const attMap = new Set();
    const presentCount = { full: 0, half: 0 };
    this.lastAttendance.forEach((a: any) => {
      const dStr = new Date(a.attendance_date).toDateString();
      attMap.add(dStr);

      // Do not count as Present if the employee is on an approved leave
      if (!leaveSet.has(dStr)) {
        if (a.status === 'half-day') presentCount.half++;
        else presentCount.full++; // Assuming everything else in DB is present
      }
    });

    let absentCount = 0;
    let leaveCount = 0;

    for (let i = 1; i <= todayNum; i++) {
      const d = new Date(currentYear, currentMonth, i);
      const dateStr = d.toDateString();

      if (leaveSet.has(dateStr)) {
        leaveCount++;
        continue;
      }

      if (this.isWeekOffDay(d)) {
        continue;
      }

      if (attMap.has(dateStr)) {
        continue;
      }

      // It is an absent day
      absentCount++;
    }

    setTimeout(() => {
      this.monthlySummary = {
        ...this.monthlySummary,
        present_days: presentCount.full,
        half_days: presentCount.half,
        absent_days: absentCount,
        leave_days: leaveCount
      };

      console.log('Final Summary Updated -> Present:', presentCount.full, 'Absent:', absentCount, 'Leaves:', leaveCount);
    }, 0);
  }

  // ================= MATCHERS =================

  matchEmployeeShift() {
    if (!this.shift_id || !this.allShiftPolicies.length) return;
    this.shift_policy = this.allShiftPolicies.find(
      (p: any) => p.id === this.shift_id
    );
  }

  matchEmployeeWeekend() {
    if (!this.weekend_id || !this.allWeekendPolicies.length) {
      console.log('Weekend match skipped:', {
        weekend_id: this.weekend_id,
        policies: this.allWeekendPolicies.length,
      });
      return;
    }

    const policy = this.allWeekendPolicies.find(
      (p: any) => p.id === this.weekend_id
    );

    console.log('Matched Weekend Policy 👉', policy);

    if (!policy) {
      console.warn('No weekend policy found for weekend_id:', this.weekend_id);
      return;
    }

    const weekMap = [
      { key: 'sunday_off', label: 'sunday' },
      { key: 'monday_off', label: 'monday' },
      { key: 'tuesday_off', label: 'tuesday' },
      { key: 'wednesday_off', label: 'wednesday' },
      { key: 'thursday_off', label: 'thursday' },
      { key: 'friday_off', label: 'friday' },
      { key: 'saturday_off', label: 'saturday' },
    ];

    this.serverWeekOff = weekMap
      .filter(day => policy[day.key] === 1)
      .map(day => day.label);

    console.log('Server Week Off Days 👉', this.serverWeekOff);
    this.recalculateSummary();
  }
  trackByDate(index: number, day: Date): string {
    return day.toDateString();
  }

  // ================= WFH CLOCK-IN =================

  wfhClockIn() {
    this.attendanceApi.checkTodayWFH().subscribe({
      next: (res: any) => {
        if (!res?.has_wfh) {
          this.showToast('WFH not approved for today', 'warning');
          return;
        }

        this.attendanceApi.apiPunchIn({
          work_mode: 'WFH',
          location: 'Home',
          notes: 'WFH Clock-In',
        }).subscribe({
          next: () => {
            this.showToast('WFH Clock-In successful', 'success');
            this.loadTodayAttendance();
            // Set clock button to WFH mode and show WFH Clock-Out
            if (this.clockButton) {
              this.clockButton.workMode = 'WFH';
              this.clockButton.isClockedIn = true;
            }
            // Always trigger attendance log refresh
            this.attendanceRefresh = Date.now();
          },
          error: err => {
            this.showToast(err?.error?.message || 'WFH Clock-In failed', 'danger');
          },
        });
      },
      error: () => this.showToast('WFH check failed', 'danger'),
    });
  }

  // ================= HELPERS =================

  generateDays() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const start = new Date(today.setDate(diff));

    this.days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      this.days.push(d);
    }
  }

  isToday(day: Date) {
    return day.toDateString() === this.today.toDateString();
  }

  isWeekOffDay(day: Date): boolean {
    const weekday = day.toLocaleDateString('en-US', {
      weekday: 'long',
    }).toLowerCase();
    return this.serverWeekOff.includes(weekday);
  }

  onClockStatusChanged(record: AttendanceRecord) {
    this.record = record;
    this.attendanceRefresh = Date.now(); // trigger refresh
    this.loadTodayAttendance();
    this.loadMonthlySummary();
  }

  setTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'log') {
      this.attendanceRefresh = Date.now();
    }
  }

  async wfh() {
    const modal = await this.modalCtrl.create({
      component: WorkFromHomeComponent,
      cssClass: 'side-custom-popup',
      backdropDismiss: false,
    });
    await modal.present();
  }

  async showToast(
    message: string,
    color: 'success' | 'warning' | 'danger'
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'top',
      color,
    });
    await toast.present();
  }
}
