import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject, forkJoin, takeUntil, catchError, of } from 'rxjs';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
} from '@angular/forms';
import {
  ToastController,
  ModalController,
} from '@ionic/angular';

import { TimesheetService } from 'src/app/core/services/timesheet.service';
import { TimesheetPreviewComponent } from './timesheet-preview.component';
import { LeaverequestService, MyLeave } from 'src/app/core/services/leaverequest.service';
import { EmployeeService } from 'src/app/core/services/employee.service';
import { WeeklyOffPolicyService, WeeklyOffPolicy } from 'src/app/core/services/weekly-off-policy.service';

@Component({
  selector: 'app-work-track',
  standalone: false,
  templateUrl: './work-track.page.html',
  styleUrls: ['./work-track.page.scss'],
})
export class WorkTrackPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  // Client timesheet upload state
  clientUploadFile: File | null = null;
  clientUploadMonth: number = new Date().getMonth() + 1;
  clientUploadYear: number = new Date().getFullYear();
  clientUploadProjectId: number | null = null;
  clientUploadLoading = false;
  /**
   * Handle file input change for client timesheet upload
   */
  onClientUploadFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.clientUploadFile = file;
    }
  }

  /**
   * Upload client timesheet for selected project
   */
  async uploadClientTimesheet(projectId: number) {
    if (!this.clientUploadFile) {
      this.showToast('Please select a file to upload');
      return;
    }
    this.clientUploadLoading = true;
    const formData = new FormData();
    formData.append('file', this.clientUploadFile);
    formData.append('month', this.clientUploadMonth.toString());
    formData.append('year', this.clientUploadYear.toString());
    formData.append('project_id', projectId.toString());
    this.timesheetService.uploadClientTimesheet(formData).subscribe({
      next: (res) => {
        this.clientUploadLoading = false;
        this.showToast(res?.message || 'Client timesheet uploaded successfully');
        this.clientUploadFile = null;
      },
      error: (err) => {
        this.clientUploadLoading = false;
        this.showToast('Failed to upload client timesheet');
      }
    });
  }

  /* ================= EXISTING ================= */
  workTrackForm!: FormGroup;
  loading = false;

  myTimesheets: any[] = [];
  loadingList = false;

  // Pagination
  currentPage = 1;
  itemsPerPage = 5;
  totalPages = 0;
  paginatedTimesheets: any[] = [];

  // Filters
  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();
  months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' }
  ];
  years: number[] = [];

  today = this.formatDate(new Date());

  /* ================= ASSIGNMENT STATE ================= */
  loadingStatus = true;
  hasProject = false;
  assignments: any[] = [];
  timesheetType: 'regular' | 'project' = 'regular'; // fallback default

  /* ================= ATTENDANCE / LEAVE INFO ================= */
  highlightedDates: any[] = [];
  leaveTooltipMap: Map<string, string> = new Map();
  weekOffsMap: Set<string> = new Set();
  selectedDateStatus: string = '';

  constructor(
    private fb: FormBuilder,
    private timesheetService: TimesheetService,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController,
    private leaveService: LeaverequestService,
    private employeeService: EmployeeService,
    private weeklyOffService: WeeklyOffPolicyService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.initForm();
    this.initializeYears();
    this.loadAllData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAllData() {
    const currentYear = new Date().getFullYear();
    this.loadingStatus = true;

    console.log('🚀 [WorkTrack] loadAllData() starting...');

    forkJoin({
      assignment: this.timesheetService.getAssignmentStatus().pipe(
        catchError(err => {
          console.error('❌ [WorkTrack] getAssignmentStatus error:', err);
          return of({ has_project: false, assignments: [], timesheet_type: 'regular' });
        })
      ),
      leaves: this.leaveService.getMyLeaves(currentYear).pipe(
        catchError(err => {
          console.error('❌ [WorkTrack] getMyLeaves error:', err);
          return of([]);
        })
      ),
      profile: this.employeeService.getMyProfile().pipe(
        catchError(err => {
          console.error('❌ [WorkTrack] getMyProfile error:', err);
          return of({ weekly_off_policy_id: null });
        })
      ),
      policies: this.weeklyOffService.getWeeklyOffPolicies().pipe(
        catchError(err => {
          console.error('❌ [WorkTrack] getWeeklyOffPolicies error:', err);
          return of([]);
        })
      )
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        try {
          console.log('🔍 [WorkTrack] Full forkJoin Response:', res);

          // Extract assignment data (forkJoin wraps it with 'assignment' key)
          const assignmentData = res?.assignment;
          console.log('📋 [WorkTrack] Assignment Data:', assignmentData);

          if (!assignmentData) {
            console.error('❌ [WorkTrack] Assignment data is null/undefined');
            this.hasProject = false;
            this.assignments = [];
            this.timesheetType = 'regular';
            this.loadingStatus = false;
            this.cdr.detectChanges();
            return;
          }

          // Set project status based on API response
          this.hasProject = assignmentData.has_project === true;
          this.timesheetType = assignmentData.timesheet_type || 'regular';
          this.assignments = assignmentData.assignments || [];
          this.loadingStatus = false;

          console.log('✅ [WorkTrack] State Updated:');
          console.log('  • hasProject:', this.hasProject);
          console.log('  • timesheetType:', this.timesheetType);
          console.log('  • assignments.length:', this.assignments.length);

          if (this.hasProject && this.assignments.length > 0) {
            console.log('✓ [WorkTrack] Project-based employee with assignments');
            console.log('  • First project:', this.assignments[0].project_name);
            this.workTrackForm.patchValue({ project_id: this.assignments[0].project_id });
          } else if (!this.hasProject) {
            console.log('ℹ️ [WorkTrack] Regular employee (no project assigned)');
          } else {
            console.log('⚠️ [WorkTrack] hasProject=true but no assignments found');
          }

          this.initializeFirstTimeSlot();
          this.loadMyTimesheets();

          // Leaves Logic
          this.processLeaves(res.leaves);

          // Week off Logic
          const policyId = res.profile?.weekly_off_policy_id;
          const policy = res.policies?.find((p: any) => p.id === policyId);
          if (policy) {
            this.mapWeekOffs(policy);
          }

          this.updateHighlightedDates();
          this.checkSelectedDateStatus(this.workTrackForm.get('date')?.value);

          // Force change detection
          this.cdr.detectChanges();
        } catch (error) {
          console.error('❌ [WorkTrack] Error processing response:', error);
          this.hasProject = false;
          this.assignments = [];
          this.loadingStatus = false;
          this.cdr.detectChanges();
        }
      },
      error: (err: any) => {
        console.error('❌ [WorkTrack] API Error:', err);
        this.loadingStatus = false;
        this.initializeFirstTimeSlot();
        this.loadMyTimesheets();
      }
    });

    // Listen to form value changes
    this.workTrackForm.get('date')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(val => {
        this.checkSelectedDateStatus(val);
      });
  }

  processLeaves(leaves: MyLeave[]) {
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
        this.leaveTooltipMap.set(this.formatDate(d), leaveType);
        d.setDate(d.getDate() + 1);
      }
    });
  }

  initializeYears() {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - 5; i--) {
      this.years.push(i);
    }
  }

  /* ================= FORM ================= */

  initForm() {
    this.workTrackForm = this.fb.group({
      date: [this.today, Validators.required],
      project_id: [null],
      hours_breakdown: this.fb.array([]),
      work_description: [''],
      notes: [''],
    });
  }

  get breakdowns(): FormArray {
    return this.workTrackForm.get('hours_breakdown') as FormArray;
  }

  /* Initialize first time slot based on shift timing */
  initializeFirstTimeSlot() {
    // Clear existing rows
    this.breakdowns.clear();

    let firstTimeSlot = '';

    if (this.hasProject && (this.assignments?.length || 0) > 0) {
      // For project-based employees, use project shift timing
      const assignment = this.assignments[0];
      if (assignment.start_time) {
        firstTimeSlot = this.generateTimeSlot(assignment.start_time);
      }
    } else {
      // For regular employees, use default 09:00 or fetch from attendance shift
      firstTimeSlot = '09:00-10:00';
    }

    // Add first row with calculated time slot
    this.breakdowns.push(
      this.fb.group({
        hour: [firstTimeSlot, Validators.required],
        task: ['', Validators.required],
        hours: [1, [Validators.required, Validators.min(0.5)]],
      })
    );
  }



  mapWeekOffs(policy: WeeklyOffPolicy) {
    this.weekOffsMap.clear();
    const offDays: number[] = [];
    if (policy.sunday_off) { this.weekOffsMap.add('0'); offDays.push(0); }
    if (policy.monday_off) { this.weekOffsMap.add('1'); offDays.push(1); }
    if (policy.tuesday_off) { this.weekOffsMap.add('2'); offDays.push(2); }
    if (policy.wednesday_off) { this.weekOffsMap.add('3'); offDays.push(3); }
    if (policy.thursday_off) { this.weekOffsMap.add('4'); offDays.push(4); }
    if (policy.friday_off) { this.weekOffsMap.add('5'); offDays.push(5); }
    if (policy.saturday_off) { this.weekOffsMap.add('6'); offDays.push(6); }

    // Generate specific week-off dates for the current year to highlight in calendar
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (offDays.includes(d.getDay())) {
        // This is a week off
        // We don't need to store all in weekOffsMap, just for highlighting
      }
    }
  }

  updateHighlightedDates() {
    const highlights: any[] = [];

    // 1. Add Leaves (Purple)
    this.leaveTooltipMap.forEach((type, dateStr) => {
      highlights.push({
        date: dateStr,
        textColor: '#ffffff',
        backgroundColor: '#b39ddb'
      });
    });

    // 2. Add Week Offs (Gray/Blue) - for the current month roughly
    // To keep it simple and performant, we only highlight weekoffs 
    // for a 6-month window around today
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 3, 1);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay().toString();
      const dateStr = this.formatDate(d);

      // Only highlight if it's NOT already a leave
      if (this.weekOffsMap.has(day) && !this.leaveTooltipMap.has(dateStr)) {
        highlights.push({
          date: dateStr,
          textColor: '#475569',
          backgroundColor: '#f1f5f9'
        });
      }
    }

    this.highlightedDates = highlights;
  }

  checkSelectedDateStatus(dateStr: string) {
    if (!dateStr) {
      this.selectedDateStatus = '';
      return;
    }

    const leave = this.leaveTooltipMap.get(dateStr);
    if (leave) {
      this.selectedDateStatus = `🏖️ On Leave: ${leave}`;
      return;
    }

    const day = new Date(dateStr).getDay().toString();
    if (this.weekOffsMap.has(day)) {
      this.selectedDateStatus = `🏠 Weekly Off`;
      return;
    }

    this.selectedDateStatus = '';
  }

  onDateChange(event: any) {
    const date = event.detail.value;
    if (date) {
      const formatted = date.split('T')[0];
      this.workTrackForm.get('date')?.setValue(formatted);
    }
    this.modalCtrl.dismiss();
  }

  /* Generate time slot from start time (e.g., "09:00" -> "09:00-10:00") */
  generateTimeSlot(startTime: string): string {
    if (!startTime) return '';

    try {
      // Parse start time (format: "HH:mm" or "HH:mm:ss")
      const [hours, minutes] = startTime.split(':').map(Number);

      // Calculate end time (1 hour later)
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      endDate.setHours(hours + 1, minutes, 0, 0);

      // Format as "HH:mm-HH:mm"
      const startStr = this.formatTime(startDate);
      const endStr = this.formatTime(endDate);

      return `${startStr}-${endStr}`;
    } catch (error) {
      console.error('Error generating time slot:', error);
      return '';
    }
  }

  /* Format time as HH:mm */
  formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  addRow() {
    // Get the last time slot to calculate the next one
    let nextTimeSlot = '';

    if (this.breakdowns.length > 0) {
      const lastRow = this.breakdowns.at(this.breakdowns.length - 1);
      const lastTimeSlot = lastRow.get('hour')?.value;

      if (lastTimeSlot && lastTimeSlot.includes('-')) {
        // Extract END time from last slot as the START time for the new slot
        const endTime = lastTimeSlot.split('-')[1];
        // Calculate next slot with 1 hour duration
        nextTimeSlot = this.generateTimeSlotWithDuration(endTime, 1);
      }
    }

    this.breakdowns.push(
      this.fb.group({
        hour: [nextTimeSlot, Validators.required],
        task: ['', Validators.required],
        hours: [1, [Validators.required, Validators.min(0.5)]],
      })
    );
  }

  /* Update time slots when hours change */
  onHoursChange(index: number) {
    const currentRow = this.breakdowns.at(index);
    const hours = Number(currentRow.get('hours')?.value || 1);
    const currentTimeSlot = currentRow.get('hour')?.value;

    if (currentTimeSlot && currentTimeSlot.includes('-')) {
      // Extract start time and recalculate end time based on hours
      const startTime = currentTimeSlot.split('-')[0];
      const newTimeSlot = this.generateTimeSlotWithDuration(startTime, hours);
      currentRow.patchValue({ hour: newTimeSlot }, { emitEvent: false });

      // Update all subsequent rows
      this.updateSubsequentRows(index);
    }
  }

  /* Update all rows after the changed one */
  updateSubsequentRows(fromIndex: number) {
    for (let i = fromIndex + 1; i < this.breakdowns.length; i++) {
      const prevRow = this.breakdowns.at(i - 1);
      const currentRow = this.breakdowns.at(i);

      const prevTimeSlot = prevRow.get('hour')?.value;

      if (prevTimeSlot && prevTimeSlot.includes('-')) {
        // Get end time from previous slot as start time for current
        const prevEndTime = prevTimeSlot.split('-')[1];
        const currentHours = Number(currentRow.get('hours')?.value || 1);
        const newTimeSlot = this.generateTimeSlotWithDuration(prevEndTime, currentHours);

        currentRow.patchValue({ hour: newTimeSlot }, { emitEvent: false });
      }
    }
  }

  /* Generate time slot with custom duration */
  generateTimeSlotWithDuration(startTime: string, hours: number): string {
    if (!startTime) return '';

    try {
      // Parse start time (format: "HH:mm" or "HH:mm:ss")
      const timeParts = startTime.split(':').map(Number);
      const startHours = timeParts[0];
      const startMinutes = timeParts[1] || 0;

      // Calculate end time based on duration
      const startDate = new Date();
      startDate.setHours(startHours, startMinutes, 0, 0);

      const endDate = new Date(startDate);
      // Add hours (convert to minutes for precision)
      endDate.setMinutes(startDate.getMinutes() + (hours * 60));

      // Format as "HH:mm-HH:mm"
      const startStr = this.formatTime(startDate);
      const endStr = this.formatTime(endDate);

      return `${startStr}-${endStr}`;
    } catch (error) {
      console.error('Error generating time slot:', error);
      return '';
    }
  }

  removeRow(i: number) {
    if (this.breakdowns.length > 1) {
      this.breakdowns.removeAt(i);
    }
  }

  calculateTotalHours(): number {
    return this.breakdowns.controls.reduce(
      (sum, row) => sum + Number(row.get('hours')?.value || 0),
      0
    );
  }

  /* ================= SUBMIT ================= */

  submit() {
    if (this.workTrackForm.invalid) {
      this.showToast('Please fill all required fields');
      return;
    }

    const basePayload = {
      date: this.workTrackForm.value.date,
      hours_breakdown: this.workTrackForm.value.hours_breakdown,
      total_hours: this.calculateTotalHours(),
      notes: this.workTrackForm.value.notes,
    };

    this.loading = true;

    /* ================= PROJECT TIMESHEET ================= */
    if (this.hasProject) {

      const projectPayload = {
        ...basePayload,
        project_id: this.workTrackForm.value.project_id || this.assignments?.[0]?.project_id,
        work_description: this.workTrackForm.value.work_description || this.workTrackForm.value.notes
      };

      this.timesheetService.submitProjectTimesheet(projectPayload).subscribe({
        next: () => {
          this.loading = false;
          this.showToast('Project work submitted successfully');
          this.resetForm();
        },
        error: () => {
          this.loading = false;
          this.showToast('Failed to submit project work');
        },
      });

      return;
    }

    /* ================= REGULAR TIMESHEET ================= */
    this.timesheetService.submitRegularTimesheet(basePayload).subscribe({
      next: () => {
        this.loading = false;
        this.showToast('Timesheet submitted successfully');
        this.resetForm();
      },
      error: () => {
        this.loading = false;
        this.showToast('Failed to submit timesheet');
      },
    });
  }
  resetForm() {
    this.workTrackForm.reset({ date: this.today });
    this.initializeFirstTimeSlot();
    // Delay loading to ensure hasProject is set
    setTimeout(() => this.loadMyTimesheets(), 100);
  }

  /* ================= EDIT ================= */
  editTimesheet(t: any) {
    // Scroll smoothly to the Daily Work Log card
    const formElement = document.getElementById('daily-work-log-card');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const formattedDate = new Date(t.date).toISOString().split('T')[0];
    this.workTrackForm.patchValue({
      date: formattedDate,
      project_id: t.project_id,
      work_description: t.work_description || '',
      notes: t.notes || ''
    });

    this.breakdowns.clear();

    let bd = t.hours_breakdown;
    if (typeof bd === 'string') {
      try {
        bd = JSON.parse(bd);
      } catch (e) { bd = []; }
    }

    if (bd && Array.isArray(bd) && bd.length > 0) {
      bd.forEach((b: any) => {
        this.breakdowns.push(
          this.fb.group({
            hour: [b.hour, Validators.required],
            task: [b.task, Validators.required],
            hours: [Number(b.hours), [Validators.required, Validators.min(0.5)]],
          })
        );
      });
    } else {
      this.initializeFirstTimeSlot();
    }
  }

  /* ================= PREVIEW ================= */

  async openPreview(timesheet: any) {
    const modal = await this.modalCtrl.create({
      component: TimesheetPreviewComponent,
      cssClass: 'side-custom-popup view-work-log',
      componentProps: { data: timesheet },
    });
    await modal.present();
  }

  /* ================= LOAD LIST ================= */

  loadMyTimesheets() {
    this.loadingList = true;

    const filters = {
      month: this.selectedMonth,
      year: this.selectedYear
    };

    // Load project timesheets if user has project, otherwise regular timesheets
    const fetchObservable = this.hasProject
      ? this.timesheetService.getMyProjectTimesheets(filters)
      : this.timesheetService.getMyRegularTimesheets(filters);

    fetchObservable.subscribe({
      next: (res: any) => {
        this.myTimesheets = res?.data || res || [];
        this.currentPage = 1;
        this.updatePagination();
        this.loadingList = false;
      },
      error: () => {
        this.loadingList = false;
        this.showToast('Failed to load timesheets');
      },
    });
  }

  /* ================= PAGINATION ================= */

  updatePagination() {
    this.totalPages = Math.ceil(this.myTimesheets.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedTimesheets = this.myTimesheets.slice(startIndex, endIndex);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  /* ================= FILTERS ================= */

  onMonthChange(event: any) {
    this.selectedMonth = Number(event.detail.value);
    this.loadMyTimesheets();
  }

  onYearChange(event: any) {
    this.selectedYear = Number(event.detail.value);
    this.loadMyTimesheets();
  }

  /* ================= DOWNLOAD EXCEL ================= */
  formatDateDDMMYYYY(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 0-based
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }
  downloadExcel(timesheet: any) {
    if (!timesheet || !timesheet.hours_breakdown?.length) {
      return;
    }

    let tableRows = '';

    timesheet.hours_breakdown.forEach((b: any, index: number) => {
      tableRows += `
        <tr>
          <td>${index + 1}</td>
          <td>${b.hour || '-'}</td>
          <td>${b.task || '-'}</td>
          <td>${b.hours || '-'}</td>
        </tr>
      `;
    });
    timesheet.date = this.formatDateDDMMYYYY(new Date(timesheet.date));
    const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head>
      <meta charset="UTF-8" />
    </head>
    <body>
      <table border="1">
        <tr><td>Date</td><td colspan="3">${timesheet.date}</td></tr>
        <tr>
          <th>S.No</th><th>Time</th><th>Task</th><th>Hours</th>
        </tr>
        ${tableRows}
        <tr><td>Note</td><td colspan="3">${timesheet.notes || '-'}</td></tr>
        <tr><td>Total</td><td colspan="3">${timesheet.total_hours}</td></tr>
      </table>
    </body>
    </html>
    `;

    const blob = new Blob([html], {
      type: 'application/vnd.ms-excel;charset=utf-8;'
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Timesheet_${timesheet.date}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /* ================= UTILS ================= */

  getStatusColor(status: string): string {
    if (!status) return 'warning'; // pending/no status

    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'verified':
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'submitted':
      case 'pending':
        return 'warning';
      default:
        return 'medium';
    }
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async showToast(msg: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
    });
    toast.present();
  }
}
