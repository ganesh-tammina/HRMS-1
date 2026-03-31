import { Component, OnInit, OnDestroy, Input, SimpleChanges, OnChanges } from '@angular/core';
import { Subject, forkJoin, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { takeUntil, catchError } from 'rxjs/operators';

import { AttendanceApiService } from '../../../core/services/attendance-api.service';
import { AttendanceService } from '../../../core/services/attendance.service';
import { LeaverequestService, MyLeave } from '../../../core/services/leaverequest.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { AdminService } from '../../../core/services/admin.service';
import { TimeFormatPipe } from '../../pipes/time-format.pipe';

interface WeeklyOffPolicy {
  id: number;
  sunday_off?: number;
  monday_off?: number;
  tuesday_off?: number;
  wednesday_off?: number;
  thursday_off?: number;
  friday_off?: number;
  saturday_off?: number;
}

@Component({
  selector: 'app-attendance-log',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './attendance-log.component.html',
  styleUrls: ['./attendance-log.component.scss'],
})
export class AttendanceLogComponent implements OnInit, OnDestroy, OnChanges {
  @Input() refreshTrigger: any;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshTrigger'] && !changes['refreshTrigger'].firstChange) {
      this.reloadAttendance();
    }
  }

  monthButtons: string[] = [];
  showSlider = false;
  selectedLog: any = null;

  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth() + 1;
  currentMonthreport: any[] = [];
  startDate = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
  endDate = this.formatDateOnly(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
  selectedPeriod: string = '30DAYS';

  shiftPolicy: any = null;
  todayPunches: any[] = [];

  private destroy$ = new Subject<void>();
  private reloadInProgress = false;
  leaveDaysMap: Map<string, string> = new Map();
  employeeProfile: any = null;
  weeklyOffPolicy: WeeklyOffPolicy | null = null;

  constructor(
    private attendanceService: AttendanceService,
    private attendanceApi: AttendanceApiService,
    private leaveService: LeaverequestService,
    private employeeService: EmployeeService,
    private adminService: AdminService,
  ) {
    this.initializeMonthButtons();
  }

  private initializeMonthButtons(): void {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const now = new Date();
    const currentMonthIndex = now.getMonth();
    this.monthButtons = [];
    for (let i = 1; i <= 6; i++) {
      let mIdx = currentMonthIndex - i;
      if (mIdx < 0) mIdx += 12;
      this.monthButtons.push(months[mIdx]);
    }
  }

  private resetState(): void {
    this.currentMonthreport = [];
    this.todayPunches = [];
    this.selectedLog = null;
    this.showSlider = false;
    if (!this.startDate || !this.endDate) {
      const now = new Date();
      this.currentMonth = now.getMonth() + 1;
      this.currentYear = now.getFullYear();
      this.startDate = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-01`;
      this.endDate = this.formatDateOnly(new Date(this.currentYear, this.currentMonth, 0));
    }
  }

  ngOnInit(): void { this.reloadAttendance(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private getAllDatesBetween(start: string, end: string): string[] {
    const dates: string[] = [];
    const [sy, sm, sd] = start.split('-').map(Number);
    const startDate = new Date(sy, sm - 1, sd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [ey, em, ed] = end.split('-').map(Number);
    const endDate = new Date(ey, em - 1, ed);
    const finalEndDate = endDate > today ? today : endDate;
    for (let d = new Date(startDate); d <= finalEndDate; d.setDate(d.getDate() + 1)) {
      dates.push(this.formatDateOnly(new Date(d)));
    }
    return dates;
  }

  private formatDateOnly(date: string | Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private reloadAttendance(): void {
    if (this.reloadInProgress) return;
    this.reloadInProgress = true;
    this.resetState();

    const profile$ = this.employeeService.getMyProfile().pipe(catchError(() => of(null)));
    const shiftPolicies$ = this.adminService.getShiftPolicies().pipe(catchError(() => of([])));
    const weekOffPolicies$ = this.adminService.getWeeklyOffPolicies().pipe(catchError(() => of([])));
    const leaves$ = this.leaveService.getMyLeaves(this.currentYear).pipe(catchError(() => of([])));
    const todayPunches$ = this.attendanceApi.getTodayAttendance().pipe(catchError(() => of({ punches: [] })));

    forkJoin({ profile: profile$, shiftPolicies: shiftPolicies$, weekOffPolicies: weekOffPolicies$, leaves: leaves$, today: todayPunches$ })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          this.employeeProfile = res.profile;
          const woId = res.profile?.weekly_off_policy_id || res.profile?.WeeklyOffPolicyId;
          const sId = res.profile?.shift_policy_id || res.profile?.ShiftPolicyId;
          
          const weekOffPolicies = Array.isArray(res.weekOffPolicies) ? res.weekOffPolicies : (res.weekOffPolicies?.data || []);
          this.weeklyOffPolicy = (weekOffPolicies || []).find((p: any) => p.id === woId) || null;
          
          const shiftPolicies = Array.isArray(res.shiftPolicies) ? res.shiftPolicies : (res.shiftPolicies?.data || []);
          this.shiftPolicy = (shiftPolicies || []).find((p: any) => p.id === sId) || null;
          
          this.todayPunches = res.today?.punches || [];
          const leaves = Array.isArray(res.leaves) ? res.leaves : (res.leaves.data || res.leaves.leaves || []);
          this.processLeavesIntoMap(leaves);
          this.loadMonthlyReport();
          this.reloadInProgress = false;
        },
        error: () => { this.loadMonthlyReport(); this.reloadInProgress = false; }
      });
  }

  private processLeavesIntoMap(leaves: MyLeave[]) {
    this.leaveDaysMap = new Map();
    const approvedLeaves = leaves.filter(l => (l.status || '').toUpperCase() === 'APPROVED');
    approvedLeaves.forEach(leave => {
      const leaveType = (leave as any).type_name || (leave as any).type_code || leave.leave_type || 'Leave';
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
          attendanceMap.set(this.formatDateOnly(item.attendance_date), item);
        });
        const allDates = this.getAllDatesBetween(this.startDate, this.endDate);

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

          if (leaveType) return { ...(existing || {}), attendance_date: date, status: 'on-leave', leaveType, noLogs: !existing };
          if (isWeekOff) return { ...(existing || {}), attendance_date: date, status: 'weekend', leaveType: 'Full day week off', noLogs: !existing };
          if (existing) return { ...existing, noLogs: false };

          let defaultStatus = 'absent';
          const today = new Date();
          const logD = new Date(date);
          const isToday = today.getFullYear() === logD.getFullYear() && today.getMonth() === logD.getMonth() && today.getDate() === logD.getDate();
          if (isToday) {
            if (this.shiftPolicy?.start_time) {
              try {
                const [shiftH, shiftM, shiftS] = this.shiftPolicy.start_time.split(':').map(Number);
                const threshold = new Date(today);
                threshold.setHours(shiftH + 2, shiftM, shiftS || 0, 0);
                if (today < threshold) defaultStatus = 'not-in-yet';
              } catch { defaultStatus = 'not-in-yet'; }
            } else { defaultStatus = 'not-in-yet'; }
          }
          return { attendance_date: date, total_work_hours: null, gross_hours: null, status: defaultStatus, records: [], noLogs: true };
        });

        this.currentMonthreport.reverse();
        this.attendanceService.setMonthlyReport(this.currentMonthreport);
      },
      error: () => { this.currentMonthreport = []; }
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
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const monthIndex = months.indexOf(period);
      if (monthIndex !== -1) {
        let year = now.getFullYear();
        if (monthIndex > now.getMonth()) year -= 1;
        this.startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
        this.endDate = this.formatDateOnly(new Date(year, monthIndex + 1, 0));
        this.currentMonth = monthIndex + 1;
        this.currentYear = year;
      }
    }
    this.loadMonthlyReport();
  }

  getSelectedPeriodLabel(): string {
    if (this.selectedPeriod === '30DAYS') return 'Last 30 Days';
    const months: { [key: string]: string } = {
      JAN: 'January', FEB: 'February', MAR: 'March', APR: 'April',
      MAY: 'May', JUN: 'June', JUL: 'July', AUG: 'August',
      SEP: 'September', OCT: 'October', NOV: 'November', DEC: 'December'
    };
    return `${months[this.selectedPeriod] || this.selectedPeriod} ${this.currentYear}`;
  }

  openLogDetails(log: any): void {
    const today = new Date().toDateString();
    const logDate = new Date(log.attendance_date).toDateString();
    if (today === logDate && this.todayPunches.length) {
      this.selectedLog = { 
        ...log, 
        records: this.mapPunches(this.todayPunches),
        prepared: false
      };
      this.processSelectedLogRecords();
    } else {
      this.selectedLog = { ...log, prepared: false };
      this.loadLogDetails(log);
    }
    this.showSlider = true;
  }

  closeSlider(): void { this.showSlider = false; this.selectedLog = null; }

  private loadLogDetails(log: any): void {
    if (!log?.attendance_date) return;
    const formattedDate = this.formatDateOnly(log.attendance_date);
    this.attendanceApi.getAttendanceDetailsByDate(formattedDate).subscribe({
      next: (res) => { 
        this.selectedLog = { 
          ...log, 
          records: this.mapPunches(res?.punches || []),
          prepared: false
        }; 
        this.processSelectedLogRecords();
      },
      error: () => { 
        this.selectedLog = { ...log, records: [], prepared: true, officeRecords: [], wfhRecords: [], remoteRecords: [] }; 
      }
    });
  }

  private processSelectedLogRecords(): void {
    if (!this.selectedLog || !this.selectedLog.records) return;
    
    const records = this.selectedLog.records;
    
    this.selectedLog.officeRecords = records.filter((r: any) => {
      const loc = r.location?.toLowerCase() || '';
      return r.work_mode === 'Office' || loc.includes('office') || loc.includes('mumbai');
    }).slice().reverse();

    this.selectedLog.wfhRecords = records.filter((r: any) => 
      r.work_mode === 'WFH' || r.location?.toLowerCase().includes('home')
    ).slice().reverse();

    this.selectedLog.remoteRecords = records.filter((r: any) => 
      r.work_mode === 'Remote'
    ).map((r: any) => ({ ...r, pendingApproval: r.approved !== true })).slice().reverse();

    // Create a unified timeline for the redesign
    const timeline: any[] = [];
    records.forEach((r: any) => {
      if (r.check_in) {
        timeline.push({
          type: 'IN',
          time: r.check_in,
          mode: r.work_mode || 'Office',
          location: r.location,
          notes: r.notes,
          icon: 'log-in-outline'
        });
      }
      if (r.check_out) {
        timeline.push({
          type: 'OUT',
          time: r.check_out,
          mode: r.work_mode || 'Office',
          location: r.location,
          notes: r.notes,
          icon: 'log-out-outline'
        });
      }
    });

    // Sort timeline by time ascending
    this.selectedLog.timeline = timeline.sort((a, b) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    this.selectedLog.prepared = true;
  }

  private mapPunches(punches: any): any[] {
    if (!Array.isArray(punches)) return [];
    const records: any[] = [];
    let current: any = null;
    punches.forEach(p => {
      const isRemote = (p.work_mode === 'Remote') || (p.location?.toLowerCase().includes('remote')) || (p.notes?.toLowerCase().includes('remote'));
      if (p.punch_type === 'in') {
        current = { check_in: p.punch_time, check_out: null, work_mode: isRemote ? 'Remote' : (p.work_mode || 'Office'), location: p.location, notes: p.notes, approved: p.approved };
        records.push(current);
      }
      if (p.punch_type === 'out' && current) { current.check_out = p.punch_time; current = null; }
    });
    return records;
  }

  getOfficeRecords(records: any[]): any[] {
    return records.filter(r => {
      const loc = r.location?.toLowerCase() || '';
      return r.work_mode === 'Office' || loc.includes('office') || loc.includes('mumbai');
    });
  }

  getWFHRecords(records: any[]): any[] {
    return records.filter(r => r.work_mode === 'WFH' || r.location?.toLowerCase().includes('home'));
  }

  getRemoteRecords(records: any[]): any[] {
    return records.filter(r => r.work_mode === 'Remote').map(r => ({ ...r, pendingApproval: r.approved !== true }));
  }

  getArrivalStatus(log: any): string {
    if (!log?.status) return 'Unknown';
    const statusMap: { [key: string]: string } = {
      present: 'On Time', absent: 'Absent', 'half-day': 'Half Day',
      late: 'Late Arrival', 'on-leave': 'On Leave', 'not-in-yet': 'NOT-IN-YET'
    };
    if (log.status === 'present' && log.first_check_in && this.shiftPolicy?.start_time) {
      try {
        const checkIn = new Date(log.first_check_in);
        const [shiftH, shiftM, shiftS] = this.shiftPolicy.start_time.split(':').map(Number);
        const grace = new Date(checkIn);
        grace.setHours(shiftH, shiftM + 15, shiftS || 0, 0);
        if (checkIn > grace) return 'Late Arrival';
      } catch { }
    }
    return statusMap[log.status] || 'Unknown';
  }

  formatHours(hDecimal: any, logDate?: string): string {
    if (hDecimal === null || hDecimal === undefined || hDecimal === '-') return '-';
    const totalHours = parseFloat(hDecimal);
    if (isNaN(totalHours)) return '-';
    const h = Math.floor(totalHours);
    const m = Math.round((totalHours - h) * 60);
    const suffix = logDate && this.islogToday(logDate) ? ' +' : '';
    return `${h}h ${m}m${suffix}`;
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
      const checkIn = new Date(log.first_check_in);
      const [shiftH, shiftM, shiftS] = this.shiftPolicy.start_time.split(':').map(Number);
      const shiftStart = new Date(checkIn);
      shiftStart.setHours(shiftH, shiftM, shiftS || 0, 0);
      const diffMs = checkIn.getTime() - shiftStart.getTime();
      if (diffMs > 15 * 60 * 1000) {
        const s = Math.floor(diffMs / 1000);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        const hStr = h > 0 ? `${h}:` : '';
        return `${hStr}${String(m).padStart(h > 0 ? 2 : 1, '0')}:${String(sec).padStart(2, '0')} late`;
      }
    } catch { }
    return '';
  }
}
