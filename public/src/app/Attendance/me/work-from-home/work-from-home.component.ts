import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { WorkFromHomeService } from 'src/app/services/work-from-home.service';

@Component({
  selector: 'app-work-from-home',
  templateUrl: './work-from-home.component.html',
  styleUrls: ['./work-from-home.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class WorkFromHomeComponent implements OnInit {

  /* ================= DATE PICKER ================= */
  pickerOpen: 'from' | 'to' | null = null;

  fromDate = new Date();
  toDate = new Date();

  displayFromDate = '';
  displayToDate = '';
  validationError = '';

  totalDays = 1;
  isSubmitting = false;
  isLoadingExistingRequests = false;
  existingWFHRequests: any[] = [];

  /* ================= REQUEST TYPE ================= */
  requestType: 'full' | 'custom' = 'full';
  fromSession: 'full' | 'first' | 'second' = 'full';
  toSession: 'full' | 'first' | 'second' = 'full';

  /* ================= FORM DATA ================= */
  note = '';
  notifyEmployee = '';

  /* ================= CALENDAR ================= */
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();

  blankDays: number[] = [];
  monthDays: number[] = [];

  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor(
    private modalCtrl: ModalController,
    private wfhService: WorkFromHomeService,
    private toastCtrl: ToastController
  ) { }

  /* ================= INIT ================= */
  ngOnInit() {
    this.updateDisplayDates();
    this.generateCalendar();
    this.calculateDays();
    this.loadExistingWFHRequests();
  }

  /* ================= MODAL ================= */
  close() {
    this.modalCtrl.dismiss();
  }

  /* ================= CALENDAR ================= */
  openPicker(type: 'from' | 'to') {
    this.pickerOpen = this.pickerOpen === type ? null : type;
  }

  generateCalendar() {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const totalDays = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

    this.blankDays = Array(firstDay).fill(0);
    this.monthDays = Array.from({ length: totalDays }, (_, i) => i + 1);
  }

  selectDate(day: number) {
    const selected = new Date(this.currentYear, this.currentMonth, day);

    if (this.pickerOpen === 'from') {
      this.fromDate = selected;
    } else {
      this.toDate = selected;
    }

    this.updateDisplayDates();
    this.calculateDays();
    this.pickerOpen = null;
  }

  isSelected(day: number) {
    const d = new Date(this.currentYear, this.currentMonth, day).toDateString();

    if (this.pickerOpen === 'from') {
      return this.fromDate.toDateString() === d;
    }

    if (this.pickerOpen === 'to') {
      return this.toDate.toDateString() === d;
    }

    return false;
  }

  prevMonth() {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.generateCalendar();
  }

  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.generateCalendar();
  }

  updateDisplayDates() {
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    };

    this.displayFromDate = this.fromDate.toLocaleDateString('en-GB', options);
    this.displayToDate = this.toDate.toLocaleDateString('en-GB', options);
  }

  /* ================= TYPE ================= */
  setType(type: 'full' | 'custom') {
    this.requestType = type;

    if (type === 'full') {
      this.fromSession = 'full';
      this.toSession = 'full';
    } else {
      this.fromSession = 'first';
      this.toSession = 'second';
    }

    this.calculateDays();
  }

  /* ================= LOAD EXISTING WFH REQUESTS ================= */
  private loadExistingWFHRequests() {
    this.isLoadingExistingRequests = true;
    this.wfhService.getAllWFHRequests().subscribe({
      next: (requests: any[]) => {
        // Filter for WFH requests that are NOT rejected or cancelled
        // These are the ones that block new submissions
        this.existingWFHRequests = (requests || []).filter((req: any) => {
          // Must be WFH type
          if (req.leave_type !== 'WFH') {
            return false;
          }
          // Exclude only rejected/cancelled status
          // Include pending, approved, and any other status that blocks submission
          const blockingStatuses = ['PENDING', 'APPROVED', 'pending', 'approved'];
          return blockingStatuses.includes(req.status);
        });
        this.isLoadingExistingRequests = false;
        console.log('🔍 Existing WFH requests loaded:', this.existingWFHRequests);
        console.log('Total blocking requests found:', this.existingWFHRequests.length);
        this.existingWFHRequests.forEach(req => {
          console.log(`  - ${req.start_date} to ${req.end_date} (Status: ${req.status}, Leave Type: ${req.leave_type})`);
        });
      },
      error: (err: any) => {
        this.isLoadingExistingRequests = false;
        console.error('❌ Failed to load existing WFH requests:', err);
        // Don't block form if this fails, just log the error
      }
    });
  }

  /* ================= CHECK FOR DATE OVERLAP ================= */
  private hasDateConflict(): boolean {
    if (this.existingWFHRequests.length === 0) {
      console.log('✅ No existing WFH requests, no conflict');
      return false;
    }

    const newStartDate = this.parseDate(this.formatDate(this.fromDate));
    const newEndDate = this.parseDate(this.formatDate(this.toDate));

    console.log(`📅 Checking new request: ${this.formatDate(this.fromDate)} to ${this.formatDate(this.toDate)}`);

    // Check each existing WFH request for date overlap
    for (const existingReq of this.existingWFHRequests) {
      const existingStart = this.parseDate(existingReq.start_date);
      const existingEnd = this.parseDate(existingReq.end_date);

      console.log(`  Comparing with: ${existingReq.start_date} to ${existingReq.end_date} (Status: ${existingReq.status})`);

      // Check if date ranges overlap
      // Overlap occurs if: newStart <= existingEnd AND newEnd >= existingStart
      if (newStartDate <= existingEnd && newEndDate >= existingStart) {
        console.warn(`❌ DATE CONFLICT DETECTED: Overlap with request from ${existingStart} to ${existingEnd}`);
        return true;
      }
    }

    console.log('✅ No date conflicts found');
    return false;
  }

  /* ================= PARSE DATE STRING TO DATE OBJECT ================= */
  private parseDate(dateStr: string): Date {
    // Handle format: YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      // Create date at midnight UTC to avoid timezone issues
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    return new Date(dateStr);
  }

  /* ================= GET CONFLICTING DATES ================= */
  private getConflictingDateRange(): { start: string; end: string } | null {
    if (this.existingWFHRequests.length === 0) {
      return null;
    }

    const newStartDate = this.parseDate(this.formatDate(this.fromDate));
    const newEndDate = this.parseDate(this.formatDate(this.toDate));

    for (const existingReq of this.existingWFHRequests) {
      const existingStart = this.parseDate(existingReq.start_date);
      const existingEnd = this.parseDate(existingReq.end_date);

      if (newStartDate <= existingEnd && newEndDate >= existingStart) {
        return {
          start: this.formatDateForDisplay(existingStart),
          end: this.formatDateForDisplay(existingEnd)
        };
      }
    }

    return null;
  }

  /* ================= FORMAT DATE FOR DISPLAY ================= */
  private formatDateForDisplay(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    };
    return date.toLocaleDateString('en-GB', options);
  }

  calculateDays() {
    const oneDay = 1000 * 60 * 60 * 24;
    const toTime = this.toDate.getTime();
    const fromTime = this.fromDate.getTime();

    if (toTime < fromTime) {
      this.totalDays = 0;
      this.validationError = 'To date cannot be earlier than From date';
      return;
    }

    this.validationError = '';
    let diff = Math.floor((toTime - fromTime) / oneDay) + 1;

    if (diff <= 0) diff = 1;

    if (this.requestType === 'full') {
      this.totalDays = diff;
      return;
    }

    let total = diff;

    if (this.fromSession !== 'full') total -= 0.5;
    if (this.toSession !== 'full') total -= 0.5;

    this.totalDays = total;
  }

  /* ================= SUBMIT ================= */
  submit() {
    // Prevent multiple submissions
    if (this.isSubmitting) {
      console.log('⚠️ Submit already in progress');
      return;
    }

    // Validate required fields
    if (!this.note || this.validationError) {
      console.log('⚠️ Validation error or missing note');
      return;
    }

    // Validate both dates
    if (!this.fromDate || isNaN(this.fromDate.getTime()) || !this.toDate || isNaN(this.toDate.getTime())) {
      const toast = this.toastCtrl.create({
        message: 'Please select valid dates',
        duration: 2000,
        color: 'danger',
        position: 'top',
      });
      toast.then(t => t.present());
      return;
    }

    // CHECK FOR DATE CONFLICTS - THIS IS CRITICAL VALIDATION
    console.log('🔍 VALIDATING DATE CONFLICTS...');
    console.log('Total existing WFH requests loaded:', this.existingWFHRequests.length);

    if (this.hasDateConflict()) {
      console.log('🛑 DATE CONFLICT FOUND - BLOCKING SUBMISSION');
      const conflictRange = this.getConflictingDateRange();
      const conflictMessage = conflictRange
        ? `You already have a pending or approved WFH request from ${conflictRange.start} to ${conflictRange.end}. You cannot apply for WFH on overlapping dates.`
        : 'You already have a pending or approved WFH request on the selected dates. Please choose a different date range.';

      const toast = this.toastCtrl.create({
        message: conflictMessage,
        duration: 4000,
        color: 'warning',
        position: 'top',
      });
      toast.then(t => t.present());
      return;
    }

    console.log('✅ NO DATE CONFLICTS - PROCEEDING WITH SUBMISSION');

    // Format the dates
    const startDateStr = this.formatDate(this.fromDate);
    const endDateStr = this.formatDate(this.toDate);

    // Validate formatted dates
    if (!startDateStr || !endDateStr || startDateStr.length === 0 || endDateStr.length === 0) {
      const toast = this.toastCtrl.create({
        message: 'Invalid date format',
        duration: 2000,
        color: 'danger',
        position: 'top',
      });
      toast.then(t => t.present());
      return;
    }

    this.isSubmitting = true;

    const payload: any = {
      start_date: startDateStr,
      end_date: endDateStr,
      total_days: this.totalDays,
      work_mode: 'WFH',
      reason: this.note,
    };

    console.log('📤 SUBMITTING WFH REQUEST:', payload);

    this.wfhService.wfh(payload).subscribe({
      next: async (res: any) => {
        this.isSubmitting = false;
        console.log('✅ WFH Request submitted successfully:', res);
        const toast = await this.toastCtrl.create({
          message: 'Work From Home request submitted successfully',
          duration: 2000,
          color: 'success',
          position: 'top',
        });
        await toast.present();

        this.modalCtrl.dismiss(res, 'success');
      },
      error: async (err: any) => {
        this.isSubmitting = false;
        console.error('❌ WFH request error:', err);

        const errorMessage = err?.error?.error || err?.error?.message || 'Failed to submit WFH request';
        const toast = await this.toastCtrl.create({
          message: errorMessage,
          duration: 3000,
          color: 'danger',
          position: 'top',
        });
        await toast.present();
      },
    });
  }

  /* ================= UTIL ================= */
  private formatDate(date: Date): string {
    // Validate input
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.error('Invalid date object:', date);
      return '';
    }

    const d = new Date(date);
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');

    const formatted = `${year}-${month}-${day}`;
    console.log('Formatted date:', formatted, 'from:', date);

    return formatted;
  }
}
