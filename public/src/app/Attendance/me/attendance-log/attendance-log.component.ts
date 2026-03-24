import { Component, OnInit, OnDestroy, Input, SimpleChanges, OnChanges } from '@angular/core';
import { Subject, forkJoin, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { takeUntil, catchError } from 'rxjs/operators';

import { AttendanceService } from 'src/app/services/attendance.service';
import { RouteGuardService } from 'src/app/services/route-guard/route-service/route-guard.service';
import { AttendanceApiService } from '../../../services/attendance-api.service';
import { LeaverequestService, MyLeave } from 'src/app/services/leaverequest.service';
import { EmployeeService } from 'src/app/services/employee.service';
import { WeeklyOffPolicyService, WeeklyOffPolicy } from 'src/app/services/weekly-off-policy.service';
import { AdminService } from 'src/app/services/admin-functionality/admin.service.service';
import { TimeFormatPipe } from '../time-format.pipe';

@Component({
  selector: 'app-attendance-log',
  standalone: true,
  templateUrl: './attendance-log.component.html',
  styleUrls: ['./attendance-log.component.scss'],
  imports: [IonicModule, CommonModule, TimeFormatPipe],
})
export class AttendanceLogComponent implements OnInit, OnDestroy, OnChanges {
  @Input() refreshTrigger: any;
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshTrigger'] && !changes['refreshTrigger'].firstChange) {
      this.reloadAttendance();
    }
  }

  /* ================= UI ================= */
  monthButtons: string[] = [];

  showSlider = false;
  selectedLog: any = null;

  /* ================= DATE ================= */
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth() + 1;
  currentMonthreport: any[] = [];
  startDate = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-01`;
  endDate = this.formatDateOnly(new Date(this.currentYear, this.currentMonth, 0));
  selectedPeriod: string = '30DAYS';

  shiftPolicy: any = null;
  todayPunches: any[] = [];

  /* ================= INTERNAL ================= */
  private destroy$ = new Subject<void>();
  private reloadInProgress = false;
  private refreshInterval: any;
  leaveDaysMap: Map<string, string> = new Map(); // date string -> leave type


  employeeProfile: any = null;
  weeklyOffPolicy: WeeklyOffPolicy | null = null;



  private getLastDayOfMonth(year: number, month: number): string {
    // new Date(year, month, 0) gives the last day of the given month
    const d = new Date(year, month, 0);
    return `${year}-${String(month).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  constructor(
    private attendanceService: AttendanceService,
    private routeGuard: RouteGuardService,
    private attendanceApi: AttendanceApiService,
    private leaveService: LeaverequestService,
    private employeeService: EmployeeService,
    private weeklyOffPolicyService: WeeklyOffPolicyService,
    private adminService: AdminService,
    private router: Router
  ) {
    this.initializeMonthButtons();
    // 🔴 REMOVED: reloadAttendance() from constructor. 
    // It will be triggered by NavigationEnd or ionViewWillEnter.
  }

  private initializeMonthButtons(): void {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const now = new Date();
    const currentMonthIndex = now.getMonth(); // 0-11

    this.monthButtons = [];
    // Last 6 months starting from the previous month
    for (let i = 1; i <= 6; i++) {
      let mIdx = currentMonthIndex - i;
      if (mIdx < 0) {
        mIdx += 12;
      }
      this.monthButtons.push(months[mIdx]);
    }
  }

  private resetState(): void {
    this.currentMonthreport = [];
    this.todayPunches = [];
    this.selectedLog = null;
    this.showSlider = false;

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Also initialize dates if missing
    if (!this.startDate || !this.endDate) {
      const now = new Date();
      this.currentMonth = now.getMonth() + 1;
      this.currentYear = now.getFullYear();
      this.startDate = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-01`;
      this.endDate = this.formatDateOnly(new Date(this.currentYear, this.currentMonth, 0));
    }
  }

  /* =================================================
   * 🔄 THIS IS THE KEY FIX
   * Reload data every time route becomes active
   * ================================================= */
  ngOnInit(): void {
    this.reloadAttendance();
  }

  ionViewWillEnter(): void {
    // 🟢 Call reload once when entering, don't re-subscribe
    this.reloadAttendance();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private getAllDatesBetween(start: string, end: string): string[] {
    const dates: string[] = [];
    // Parse as local time (not UTC) to avoid timezone mismatch with 'today'
    const [sy, sm, sd] = start.split('-').map(Number);
    const startDate = new Date(sy, sm - 1, sd);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize
    const [ey, em, ed] = end.split('-').map(Number);
    const endDate = new Date(ey, em - 1, ed);
    // Only show up to today or endDate, whichever is earlier
    const finalEndDate = endDate > today ? today : endDate;
    for (
      let d = new Date(startDate);
      d <= finalEndDate;
      d.setDate(d.getDate() + 1)
    ) {
      dates.push(this.formatDateOnly(d));
    }
    return dates;
  }

  private formatDateOnly(date: string | Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /* ================= CORE RELOAD ================= */

  private reloadAttendance(): void {
    if (this.reloadInProgress) return;
    this.reloadInProgress = true;
    
    console.log('🔄 Reloading attendance data (Optimized)');
    this.resetState();
    
    const profile$ = this.employeeService.getMyProfile().pipe(catchError(() => of(null)));
    const policies$ = this.weeklyOffPolicyService.getWeeklyOffPolicies().pipe(catchError(() => of([])));
    const shiftPolicies$ = this.adminService.getShiftPolicies().pipe(catchError(() => of([])));
    const leaves$ = this.leaveService.getMyLeaves(this.currentYear).pipe(catchError(() => of([])));
    const todayPunches$ = this.attendanceApi.getTodayAttendance().pipe(catchError(() => of({ punches: [] })));

    forkJoin({
      profile: profile$,
      weekOffPolicies: policies$,
      shiftPolicies: shiftPolicies$,
      leaves: leaves$,
      today: todayPunches$
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.employeeProfile = res.profile;
        
        // Match Week Off Policy
        const woId = res.profile?.weekly_off_policy_id;
        this.weeklyOffPolicy = res.weekOffPolicies.find((p: any) => p.id === woId) || null;
        
        // Match Shift Policy
        const sId = res.profile?.shift_policy_id;
        this.shiftPolicy = res.shiftPolicies.find((p: any) => p.id === sId) || null;
        
        // Today's punches
        this.todayPunches = res.today?.punches || [];
        
        // Process Leaves
        this.processLeavesIntoMap(res.leaves);
        
        // Finally load report
        this.loadMonthlyReport();
        this.reloadInProgress = false;
      },
      error: (err) => {
        console.error('❌ Failed to reload attendance', err);
        this.loadMonthlyReport(); // fallback
        this.reloadInProgress = false;
      }
    });
  }



  private processLeavesIntoMap(leaves: MyLeave[]) {
    this.leaveDaysMap = new Map();
    const approvedLeaves = leaves.filter(l => (l.status || '').toUpperCase() === 'APPROVED');
    approvedLeaves.forEach(leave => {
      const leaveType = leave.type_name || leave.type_code || leave.leave_type || 'Leave';
      const fromRaw = leave.start_date || leave.from_date;
      const toRaw = leave.end_date || leave.to_date || fromRaw;
      if (!fromRaw) return;
      const from = new Date(fromRaw);
      const to = new Date(toRaw || fromRaw);
      let d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
      while (d <= end) {
        this.leaveDaysMap.set(this.formatDateOnly(d), leaveType);
        d.setDate(d.getDate() + 1);
      }
    });
  }

  /* ================= REPORT ================= */

  loadMonthlyReport(): void {
    this.attendanceApi.getMonthlyReport({
      startDate: this.startDate,
      endDate: this.endDate,
      month: this.currentMonth,
      year: this.currentYear,
    }).subscribe({
      next: res => {
        const apiAttendance = res?.attendance || [];
        const attendanceMap = new Map<string, any>();
        apiAttendance.forEach((item: any) => {
          const dateKey = this.formatDateOnly(item.attendance_date);
          console.log('📅 API date:', item.attendance_date, '→ key:', dateKey, 'status:', item.status);
          attendanceMap.set(dateKey, item);
        });
        const allDates = this.getAllDatesBetween(this.startDate, this.endDate);
        console.log('📅 Generated date keys:', allDates);
        console.log('📅 AttendanceMap keys:', Array.from(attendanceMap.keys()));
        // Determine week off days from policy
        const weekOffDays: number[] = [];
        if (this.weeklyOffPolicy) {
          if (this.weeklyOffPolicy.sunday_off) weekOffDays.push(0);
          if (this.weeklyOffPolicy.monday_off) weekOffDays.push(1);
          if (this.weeklyOffPolicy.tuesday_off) weekOffDays.push(2);
          if (this.weeklyOffPolicy.wednesday_off) weekOffDays.push(3);
          if (this.weeklyOffPolicy.thursday_off) weekOffDays.push(4);
          if (this.weeklyOffPolicy.friday_off) weekOffDays.push(5);
          if (this.weeklyOffPolicy.saturday_off) weekOffDays.push(6);
        }
        this.currentMonthreport = allDates.map(date => {
          const existing = attendanceMap.get(date);
          const day = new Date(date).getDay();
          const leaveType = this.leaveDaysMap.get(date);
          const isWeekOff = weekOffDays.includes(day);

          if (leaveType) {
            return {
              ...(existing || {}),
              attendance_date: date,
              status: 'on-leave',
              leaveType: leaveType,
              noLogs: existing ? false : true
            };
          } else if (isWeekOff) {
            return {
              ...(existing || {}),
              attendance_date: date,
              status: 'weekend',
              leaveType: 'Full day week off',
              noLogs: existing ? false : true
            };
          } else if (existing) {
            return { ...existing, noLogs: false };
          } else {
            let defaultStatus = 'absent';
            const today = new Date();
            const logD = new Date(date);
            const isToday = today.getFullYear() === logD.getFullYear() &&
              today.getMonth() === logD.getMonth() &&
              today.getDate() === logD.getDate();

            if (isToday) {
              if (this.shiftPolicy?.start_time) {
                try {
                  const [shiftH, shiftM, shiftS] = this.shiftPolicy.start_time.split(':').map(Number);
                  const shiftStartPlus2Hours = new Date(today);
                  shiftStartPlus2Hours.setHours(shiftH + 2, shiftM, shiftS || 0, 0);

                  if (today < shiftStartPlus2Hours) {
                    defaultStatus = 'not-in-yet';
                  }
                } catch (e) {
                  defaultStatus = 'not-in-yet';
                }
              } else {
                defaultStatus = 'not-in-yet';
              }
            }

            return {
              attendance_date: date,
              total_work_hours: null,
              gross_hours: null,
              status: defaultStatus,
              records: [],
              noLogs: true
            };
          }
        });
        this.currentMonthreport.reverse();
        this.attendanceService.setMonthlyReport(this.currentMonthreport);
        console.log('✅ Normalized monthly report:', this.currentMonthreport);
      },
      error: () => {
        this.currentMonthreport = [];
      }
    });
  }


  loadTodayAttendance(): void {
    this.attendanceApi.getTodayAttendance().subscribe({
      next: res => {
        this.todayPunches = res?.punches || [];
        console.log('Today Punches:', this.todayPunches);
      },
      error: () => {
        this.todayPunches = [];
      }
    });
  }

  filterByPeriod(period: string): void {
    this.selectedPeriod = period;
    const now = new Date();

    if (period === '30DAYS') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      this.startDate = this.formatDateOnly(thirtyDaysAgo);
      this.endDate = this.formatDateOnly(now);
    } else {
      // Month selection
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const monthIndex = months.indexOf(period);
      if (monthIndex !== -1) {
        let year = now.getFullYear();
        // If the selected month is ahead of current month, assume last year
        if (monthIndex > now.getUTCMonth()) {
          // use local month for comparison
        }
        const localMonth = now.getMonth();
        if (monthIndex > localMonth) {
          year -= 1;
        }
        this.startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
        this.endDate = this.formatDateOnly(new Date(year, monthIndex + 1, 0));
        this.currentMonth = monthIndex + 1;
        this.currentYear = year;
      }
    }
    this.loadMonthlyReport();
  }

  getSelectedPeriodLabel(): string {
    if (this.selectedPeriod === '30DAYS') {
      return 'Last 30 Days';
    }
    const months: { [key: string]: string } = {
      JAN: 'January', FEB: 'February', MAR: 'March', APR: 'April',
      MAY: 'May', JUN: 'June', JUL: 'July', AUG: 'August',
      SEP: 'September', OCT: 'October', NOV: 'November', DEC: 'December'
    };
    return `${months[this.selectedPeriod] || this.selectedPeriod} ${this.currentYear}`;
  }

  /* ================= SLIDER ================= */

  openLogDetails(log: any): void {
    const today = new Date().toDateString();
    const logDate = new Date(log.attendance_date).toDateString();

    console.log('📋 Opening log details:');
    console.log('  - Today:', today);
    console.log('  - Log Date:', logDate);
    console.log('  - Is Today:', today === logDate);
    console.log('  - Today Punches Available:', this.todayPunches.length);

    if (today === logDate && this.todayPunches.length) {
      // ✅ Use today punches (already loaded)
      console.log('✅ Using today punches (fresh data)');
      console.log('  - Raw Punches:', JSON.stringify(this.todayPunches, null, 2));

      const mappedRecords = this.mapPunches(this.todayPunches);
      console.log('  - Mapped Records:', JSON.stringify(mappedRecords, null, 2));

      this.selectedLog = {
        attendance_date: log.attendance_date,
        records: mappedRecords,
      };
    } else {
      // ✅ Load logs by date from API
      console.log('📡 Loading logs from API (past date)');
      this.selectedLog = log;
      this.loadLogDetails(log);
    }

    this.showSlider = true;
  }

  closeSlider(): void {
    this.showSlider = false;
    this.selectedLog = null;

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  /* ================= DATA ================= */

  private loadLogDetails(log: any): void {
    if (!log?.attendance_date) return;

    const formattedDate = this.formatDateOnly(log.attendance_date);

    console.log('📅 Fetching logs for:', formattedDate);

    this.attendanceApi.getAttendanceDetailsByDate(formattedDate).subscribe({
      next: (res) => {
        const punches = res?.punches || [];

        this.selectedLog = {
          ...log,
          records: this.mapPunches(punches),
        };
      },
      error: (err) => {
        console.error('❌ Failed to load attendance details', err);

        this.selectedLog = {
          ...log,
          records: [],
        };
      }
    });
  }

  private mapPunches(punches: any[]): any[] {
    console.log('🗺️ Mapping punches:', JSON.stringify(punches, null, 2));

    const records: any[] = [];
    let current: any = null;

    punches.forEach(p => {
      console.log('  Processing punch:', p.punch_type, 'work_mode:', p.work_mode);

      // Always treat remote punch-in as work_mode: 'Remote' if location or notes indicate remote
      let isRemote = (p.work_mode === 'Remote') || (p.location && p.location.toLowerCase().includes('remote')) || (p.notes && p.notes.toLowerCase().includes('remote'));

      if (p.punch_type === 'in') {
        current = {
          check_in: p.punch_time,
          check_out: null,
          work_mode: isRemote ? 'Remote' : (p.work_mode || 'Office'),
          location: p.location,
          notes: p.notes,
          approved: p.approved !== undefined ? p.approved : undefined // map approved property if present
        };
        records.push(current);
        console.log('    ✅ Created record:', current);
      }

      if (p.punch_type === 'out' && current) {
        current.check_out = p.punch_time;
        console.log('    ✅ Updated with check_out:', current);
        current = null;
      }
    });

    console.log('🎯 Final mapped records:', JSON.stringify(records, null, 2));
    return records;
  }

  // Separate office and WFH records based on location
  getOfficeRecords(records: any[]): any[] {
    const officeRecs = records.filter(r => {
      const location = r.location?.toLowerCase() || '';
      const isOffice = location.includes('office') || location.includes('mumbai');
      return isOffice || (r.work_mode === 'Office' && !location.includes('home'));
    });
    console.log('🏢 Office Records:', officeRecs);
    return officeRecs;
  }

  getWFHRecords(records: any[]): any[] {
    const wfhRecs = records.filter(r => {
      const location = r.location?.toLowerCase() || '';
      const isHome = location.includes('home') || r.work_mode === 'WFH';
      return isHome && !location.includes('office');
    });
    console.log('🏠 WFH Records:', wfhRecs);
    return wfhRecs;
  }

  /**
   * Returns all remote records, both approved and pending, for display.
   * Adds a note for pending approval.
   */
  getRemoteRecords(records: any[]): any[] {
    const remoteRecs = records.filter(r => {
      const location = r.location?.toLowerCase() || '';
      return r.work_mode === 'Remote' && !location.includes('home') && !location.includes('office');
    }).map(r => {
      // If not approved, add waiting note
      if (r.approved !== true) {
        return {
          ...r,
          notes: (r.notes ? r.notes + ' | ' : '') + '',
          pendingApproval: true
        };
      }
      return { ...r, pendingApproval: false };
    });
    console.log('🌐 Remote Records (all):', remoteRecs);
    return remoteRecs;
  }

  getArrivalStatus(log: any): string {
    if (!log || !log.status) return 'Unknown';

    const statusMap: { [key: string]: string } = {
      present: 'On Time',
      absent: 'Absent',
      'half-day': 'Half Day',
      late: 'Late Arrival',
      'on-leave': 'On Leave',
      'not-in-yet': 'NotInat',
    };

    // If status is 'present', check if it's actually 'late' based on shift
    if (log.status === 'present' && log.first_check_in && this.shiftPolicy?.start_time) {
      try {
        const checkInTime = new Date(log.first_check_in);
        const [shiftH, shiftM, shiftS] = this.shiftPolicy.start_time.split(':').map(Number);

        const graceThreshold = new Date(checkInTime);
        graceThreshold.setHours(shiftH, shiftM + 15, shiftS || 0, 0); // 15 min grace

        if (checkInTime > graceThreshold) {
          return 'Late Arrival';
        }
      } catch (e) {
        console.error('Error calculating arrival status:', e);
      }
    }

    return statusMap[log.status] || 'Unknown';
  }

  formatHours(hDecimal: any, logDate?: string): string {
    if (hDecimal === null || hDecimal === undefined || hDecimal === '-') return '-';
    const totalHours = parseFloat(hDecimal);
    if (isNaN(totalHours)) return '-';

    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);

    const suffix = logDate && this.islogToday(logDate) ? ' +' : '';
    return `${hours}h ${minutes}m${suffix}`;
  }

  islogToday(date: string): boolean {
    if (!date) return false;
    const today = new Date().toISOString().split('T')[0];
    const logDate = new Date(date).toISOString().split('T')[0];
    return today === logDate;
  }

  getLateDuration(log: any): string {
    if (!log || log.status !== 'present' || !log.first_check_in || !this.shiftPolicy?.start_time) return '';

    try {
      const checkInTime = new Date(log.first_check_in);
      const [shiftH, shiftM, shiftS] = this.shiftPolicy.start_time.split(':').map(Number);

      const shiftStart = new Date(checkInTime);
      shiftStart.setHours(shiftH, shiftM, shiftS || 0, 0);

      const diffMs = checkInTime.getTime() - shiftStart.getTime();
      const graceMs = 15 * 60 * 1000; // 15 min grace (match the arrival status logic)

      if (diffMs > graceMs) {
        const diffSecs = Math.floor(diffMs / 1000);
        const h = Math.floor(diffSecs / 3600);
        const m = Math.floor((diffSecs % 3600) / 60);
        const s = diffSecs % 60;

        // Format as H:MM:SS or MM:SS
        const hStr = h > 0 ? `${h}:` : '';
        const mStr = String(m).padStart(h > 0 ? 2 : 1, '0');
        const sStr = String(s).padStart(2, '0');

        return `${hStr}${mStr}:${sStr} late`;
      }
    } catch (e) {
      console.error('Error calculating late duration:', e);
    }
    return '';
  }
}