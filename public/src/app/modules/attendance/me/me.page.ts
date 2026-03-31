import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
Chart.register(...registerables);

import { AttendanceService } from '../../../core/services/attendance.service';
import { AttendanceApiService } from '../../../core/services/attendance-api.service';
import { AdminService } from '../../../core/services/admin.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { LeaverequestService } from '../../../core/services/leaverequest.service';
import { TimeFormatPipe } from '../../../shared/pipes/time-format.pipe';

import { ClockButtonComponent } from '../../../shared/components/clock-button/clock-button.component';
import { AttendanceLogComponent } from '../../../shared/components/attendance-log/attendance-log.component';
import { CalendarComponent } from '../../../shared/components/calendar/calendar.component';
import { AttendanceRequestComponent } from '../../../shared/components/attendance-request/attendance-request.component';
import { RemoteClockinModalComponent } from './components/remote-clockin-modal.component';
import { WorkFromHomeComponent } from './components/work-from-home.component';

@Component({
  selector: 'app-me',
  templateUrl: './me.page.html',
  styleUrls: ['./me.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    ClockButtonComponent,
    AttendanceLogComponent,
    CalendarComponent,
    AttendanceRequestComponent,
    TimeFormatPipe
  ],
})
export class MePage implements OnInit, AfterViewInit {
  @ViewChild(ClockButtonComponent) clockButton?: ClockButtonComponent;
  @ViewChild('attendanceChart') attendanceChartCanvas?: ElementRef;

  attendanceRefresh = 0;
  private chart: any;

  // Stats for current date
  lateMinutes: number = 0;
  totalBreakMinutes: number = 0;
  effectiveMinutes: number = 0;
  grossMinutes: number = 0;

  // Shift
  shift_id: any;
  allShiftPolicies: any[] = [];
  shift_policy: any;

  // Weekend
  weekend_id: any;
  allWeekendPolicies: any[] = [];
  serverWeekOff: string[] = [];

  // UI
  shiftDuration = '9h 0m';
  breakMinutes = 60;
  effectiveHours = '00:00';
  grossHours = '00:00';
  status = 'Absent';
  activeTab = 'log';
  progressValue = 0.85;

  days: Date[] = [];
  today: Date = new Date();
  currentMonthName: string = '';

  monthlySummary: any = {
    total_days: 0, present_days: 0, absent_days: 0, half_days: 0,
    avg_work_hours: 0, total_effective_hours: 0, total_gross_hours: 0
  };

  lastAttendance: any[] = [];
  lastLeaves: any[] = [];

  constructor(
    private attendanceService: AttendanceService,
    private attendanceApi: AttendanceApiService,
    private adminService: AdminService,
    private employeeService: EmployeeService,
    private toastCtrl: ToastController,
    private leaveService: LeaverequestService,
    private modalCtrl: ModalController,
  ) {
    this.generateDays();
  }

  ngOnInit() {
    this.loadShiftPolicies();
    this.loadWeekendPolicies();
    this.loadEmployeeProfile();
    this.loadTodayAttendance();
    this.loadMonthlySummary();
  }

  ionViewWillEnter() {
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
      if (!profile) return;
      this.shift_id = profile.shift_policy_id || profile.ShiftPolicyId;
      this.weekend_id = profile.weekly_off_policy_id || profile.WeeklyOffPolicyId;
      this.matchEmployeeShift();
      this.matchEmployeeWeekend();
    });
  }

  loadTodayAttendance() {
    this.attendanceApi.getTodayAttendance(true).subscribe({
      next: (res: any) => {
        this.status = res?.attendance?.status || 'Absent';
        const punches = res?.punches || [];
        const pipe = new TimeFormatPipe();
        
        if (res?.attendance) {
          let gross = parseFloat(res.attendance.gross_hours || 0);
          let effective = parseFloat(res.attendance.total_work_hours || 0);
          
          if (res.last_punch_type === 'in' && punches.length > 0) {
            const lastPunch = punches[punches.length - 1];
            const startTime = new Date(lastPunch.punch_time).getTime();
            const now = new Date().getTime();
            const diffHours = (now - startTime) / (1000 * 60 * 60);
            effective += diffHours;
            const firstPunch = punches[0];
            gross = (now - new Date(firstPunch.punch_time).getTime()) / (1000 * 60 * 60);
          }

          this.grossHours = pipe.transform(gross);
          this.effectiveHours = pipe.transform(effective);
          
          this.grossMinutes = Math.round(gross * 60);
          this.effectiveMinutes = Math.round(effective * 60);
          
          // Calculate late login if shift is available
          if (this.shift_policy && punches.length > 0) {
            const firstPunch = new Date(punches[0].punch_time);
            const shiftStartStr = this.shift_policy.start_time; // HH:mm
            const [h, m] = shiftStartStr.split(':').map(Number);
            const shiftStartDate = new Date(firstPunch);
            shiftStartDate.setHours(h, m, 0, 0);
            
            if (firstPunch > shiftStartDate) {
              this.lateMinutes = Math.max(0, Math.round((firstPunch.getTime() - shiftStartDate.getTime()) / 60000));
            } else {
              this.lateMinutes = 0;
            }
          }

          this.createTimelineData(punches);
        } else {
          this.grossHours = '00:00';
          this.effectiveHours = '00:00';
          this.lateMinutes = 0;
          this.totalBreakMinutes = 0;
          this.createTimelineData([]);
        }
      },
      error: () => { 
        this.status = 'Absent'; 
        this.grossHours = '00:00'; 
        this.effectiveHours = '00:00';
        this.lateMinutes = 0;
        this.totalBreakMinutes = 0;
        this.createTimelineData([]);
      },
    });
  }

  createTimelineData(punches: any[]) {
    if (!punches || punches.length === 0) {
      if (this.chart) this.chart.destroy();
      return;
    }

    const labels: string[] = [];
    const inData: number[] = [];
    const outData: number[] = [];
    
    let totalBreaks = 0;
    
    for (let i = 0; i < punches.length; i++) {
      const p = punches[i];
      const time = new Date(p.punch_time).getTime();
      
      if (p.punch_type === 'in') {
        const nextPunch = punches[i + 1];
        const endTime = nextPunch ? new Date(nextPunch.punch_time).getTime() : Date.now();
        const durationMin = (endTime - time) / 60000;
        inData.push(Math.round(durationMin));
        labels.push(`In: ${new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      } else if (p.punch_type === 'out') {
        const nextPunch = punches[i + 1];
        if (nextPunch) {
          const nextInTime = new Date(nextPunch.punch_time).getTime();
          const breakMin = (nextInTime - time) / 60000;
          totalBreaks += breakMin;
          outData.push(Math.round(breakMin));
        }
      }
    }
    
    this.totalBreakMinutes = Math.round(totalBreaks);
    this.updateChart(Math.round(inData.reduce((a, b) => a + b, 0)), this.totalBreakMinutes);
  }

  ngAfterViewInit() {
    // Chart will be initialized when data arrives
  }

  updateChart(effective: number, totalBreak: number) {
    if (!this.attendanceChartCanvas) return;
    
    const ctx = this.attendanceChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.chart) this.chart.destroy();

    const late = this.lateMinutes || 0;
    const hasData = (effective + totalBreak + late) > 0;
    
    // Custom helper for formatting durations in tooltips
    const formatDuration = (min: number) => {
      if (min < 60) return `${min}m`;
      const h = Math.floor(min / 60);
      const m = Math.round(min % 60);
      return `${h}h ${m}m`;
    };

    // Custom plugin for center text
    const centerTextPlugin = {
      id: 'centerText',
      afterDraw: (chart: any) => {
        const { ctx, chartArea: { top, width, height } } = chart;
        ctx.save();
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        ctx.fillText(this.grossHours || '00:00', width / 2, (height / 2) + top + 5);
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Gross', width / 2, (height / 2) + top + 22);
        ctx.restore();
      }
    };

    const data = {
      labels: ['Late', 'Effective', 'Break'],
      datasets: [
        {
          data: hasData ? [late, effective, totalBreak] : [0, 0, 1],
          backgroundColor: hasData 
            ? ['rgba(245, 158, 11, 1)', 'rgba(16, 185, 129, 1)', 'rgba(239, 68, 68, 1)'] 
            : ['rgba(226, 232, 240, 1)'],
          borderWidth: 0,
          cutout: '75%',
          borderRadius: 4
        }
      ]
    };

    const config: any = {
      type: 'doughnut',
      data: data,
      plugins: [centerTextPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'right', 
            labels: { 
              boxWidth: 8, 
              usePointStyle: true, 
              padding: 10,
              font: { size: 10 }
            } 
          },
          tooltip: { 
            enabled: hasData,
            callbacks: {
              label: (item: any) => `${item.label}: ${formatDuration(item.raw)}`
            }
          }
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  loadMonthlySummary() {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;

    this.currentMonthName = d.toLocaleString('default', { month: 'long' });
    
    this.attendanceApi.getMonthlyReport({ startDate, endDate, month, year }).subscribe({
      next: (res: any) => {
        if (res?.summary) {
          this.monthlySummary = res.summary;
          this.lastAttendance = res?.attendance || [];
          
          // Get leaves for the month
          this.leaveService.getMyLeaves(year).subscribe({
            next: (leaves: any) => {
              const leaveData = Array.isArray(leaves) ? leaves : (leaves.data || leaves.leaves || []);
              this.lastLeaves = leaveData.filter((l: any) => (l.status || '').toUpperCase() === 'APPROVED');
              this.recalculateSummary();
            },
            error: () => { 
              this.lastLeaves = []; 
              this.recalculateSummary(); 
            }
          });
        }
      },
      error: (err) => console.error('Error loading monthly summary:', err)
    });
  }

  recalculateSummary() {
    if (!this.lastAttendance || !this.monthlySummary) return;

    // Default week-off to Sat/Sun if not loaded yet
    const weekOffs = this.serverWeekOff?.length > 0 ? this.serverWeekOff : ['saturday', 'sunday'];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayNum = now.getDate();

    const leaveSet = new Set<string>();
    this.lastLeaves.forEach((l: any) => {
      const from = new Date(l.start_date || l.from_date || l.fromDate);
      const to = new Date(l.end_date || l.to_date || l.toDate || l.start_date || l.from_date || l.fromDate);
      let curr = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
      
      // Only add to set if it falls in current month
      while (curr <= end) {
        if (curr.getMonth() === currentMonth && curr.getFullYear() === currentYear) {
          leaveSet.add(new Date(curr).toDateString());
        }
        curr.setDate(curr.getDate() + 1);
      }
    });

    const attMap = new Set<string>();
    const presentCount = { full: 0, half: 0 };
    
    this.lastAttendance.forEach((a: any) => {
      const dStr = new Date(a.attendance_date).toDateString();
      attMap.add(dStr);
      
      const status = (a.status || '').toLowerCase();
      if (!leaveSet.has(dStr)) {
        if (status === 'half-day' || status === 'halfday' || status === 'half_day') {
          presentCount.half++;
        } else if (status === 'present' || status === 'office' || status === 'wfh') {
          presentCount.full++;
        }
      }
    });

    let absentCount = 0;
    let leaveCount = 0;
    for (let i = 1; i <= todayNum; i++) {
      const d = new Date(currentYear, currentMonth, i);
      const dateStr = d.toDateString();
      const weekday = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

      if (leaveSet.has(dateStr)) {
        leaveCount++;
        continue;
      }
      
      if (weekOffs.includes(weekday)) {
        continue;
      }
      
      if (attMap.has(dateStr)) {
        continue;
      }
      
      absentCount++;
    }

    // Use a small timeout to ensure UI update
    setTimeout(() => {
      this.monthlySummary = {
        ...this.monthlySummary,
        present_days: presentCount.full,
        half_days: presentCount.half,
        absent_days: absentCount,
        leave_days: leaveCount
      };
    }, 0);
  }

  // ================= MATCHERS =================

  matchEmployeeShift() {
    if (!this.shift_id || !this.allShiftPolicies.length) return;
    this.shift_policy = this.allShiftPolicies.find((p: any) => p.id === this.shift_id);
  }

  matchEmployeeWeekend() {
    if (!this.weekend_id || !this.allWeekendPolicies.length) return;
    const policy = this.allWeekendPolicies.find((p: any) => p.id === this.weekend_id);
    if (!policy) return;
    const weekMap = [
      { key: 'sunday_off', label: 'sunday' }, { key: 'monday_off', label: 'monday' },
      { key: 'tuesday_off', label: 'tuesday' }, { key: 'wednesday_off', label: 'wednesday' },
      { key: 'thursday_off', label: 'thursday' }, { key: 'friday_off', label: 'friday' },
      { key: 'saturday_off', label: 'saturday' },
    ];
    this.serverWeekOff = weekMap.filter(day => policy[day.key] === 1).map(day => day.label);
    this.recalculateSummary();
  }

  trackByDate(index: number, day: Date): string { return day.toDateString(); }

  // ================= WFH CLOCK-IN =================

  wfhClockIn() {
    this.attendanceApi.checkTodayWFH().subscribe({
      next: (res: any) => {
        if (!res?.has_wfh) { this.showToast('WFH not approved for today', 'warning'); return; }
        this.attendanceApi.apiPunchIn({ work_mode: 'WFH', location: 'Home', notes: 'WFH Clock-In' }).subscribe({
          next: () => {
            this.showToast('WFH Clock-In successful', 'success');
            this.loadTodayAttendance();
            if (this.clockButton) { this.clockButton.workMode = 'WFH'; this.clockButton.isClockedIn = true; }
            this.attendanceRefresh = Date.now();
          },
          error: err => this.showToast(err?.error?.message || 'WFH Clock-In failed', 'danger'),
        });
      },
      error: () => this.showToast('WFH check failed', 'danger'),
    });
  }

  // ================= MODALS =================

  async openRemoteClockinModal() {
    const modal = await this.modalCtrl.create({
      component: RemoteClockinModalComponent,
      cssClass: 'side-custom-popup team-popup',
      backdropDismiss: false,
    });
    
    modal.onDidDismiss().then((res) => {
      if (res.data?.success) {
        this.loadTodayAttendance();
        this.attendanceRefresh = Date.now();
      }
    });

    return await modal.present();
  }

  async openWFHModal() {
    const modal = await this.modalCtrl.create({
      component: WorkFromHomeComponent,
      cssClass: 'side-custom-popup team-popup',
      backdropDismiss: false,
    });

    modal.onDidDismiss().then((data) => {
      if (data.role === 'success') {
        this.attendanceRefresh = Date.now();
      }
    });

    return await modal.present();
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

  isToday(day: Date) { return day.toDateString() === this.today.toDateString(); }

  isWeekOffDay(day: Date): boolean {
    const weekday = day.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const weekOffs = this.serverWeekOff?.length > 0 ? this.serverWeekOff : ['saturday', 'sunday'];
    return weekOffs.includes(weekday);
  }

  onClockStatusChanged(record: any) {
    this.attendanceRefresh = Date.now();
    this.loadTodayAttendance();
    this.loadMonthlySummary();
  }

  setTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'log') this.attendanceRefresh = Date.now();
  }

  async showToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastCtrl.create({ message, duration: 2500, position: 'top', color });
    await toast.present();
  }
}
