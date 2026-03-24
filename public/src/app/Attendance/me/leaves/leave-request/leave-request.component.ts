import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { IonicModule, ToastController, IonPopover } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { HeaderComponent } from '../../../../shared/header/header.component';
import { EmployeeHeaderComponent } from '../../employee-header/employee-header.component';
import { EmployeeLeavesService } from 'src/app/services/employee-leaves.service';
import { LeaverequestService } from 'src/app/services/leaverequest.service';
import { AdminService } from 'src/app/services/admin-functionality/admin.service.service';
import { EmployeeService } from 'src/app/services/employee.service';

@Component({
  selector: 'app-leave-request',
  standalone: true,
  templateUrl: './leave-request.component.html',
  styleUrls: ['./leave-request.component.scss'],
  imports: [
    IonicModule,
    CommonModule,
    ReactiveFormsModule,
    HeaderComponent,
    EmployeeHeaderComponent
  ]
})
export class LeaveRequestComponent implements OnInit {
  @Output() leaveSubmitted = new EventEmitter<void>(); // Notify parent

  currentYear = new Date().getFullYear();

  leaveTypes: any[] = [];
  leaveForm!: FormGroup;

  total_days = 0;
  wordsCount = 0;

  selectedDateFrom = '';
  selectedDateTo = '';
  minDate = new Date().toISOString().split('T')[0];

  /** Store all leaves for date check (pending, approved, rejected) */
  existingLeaves: { from_date: string; to_date: string; status: string }[] = [];

  weekOffDays: number[] = []; // 0 = Sun, 1 = Mon ...
  highlightedDates: any[] = [];

  constructor(
    private fb: FormBuilder,
    private employeeLeaves: EmployeeLeavesService,
    private leaveRequestService: LeaverequestService,
    private adminService: AdminService,
    private employeeService: EmployeeService,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.buildForm();
    this.loadLeaveBalance();
    this.handleDateChanges();
    this.loadPendingLeaves();
    this.loadWeeklyOffPolicy();
  }
  /** Load all leaves (pending, approved, rejected) for this employee */
  loadPendingLeaves() {
    this.leaveRequestService.getMyLeaves(this.currentYear).subscribe({
      next: (leaves: any[]) => {
        // Always use start_date and end_date from backend, fallback to from_date/to_date if needed
        this.existingLeaves = leaves
          .filter(l => l.status === 'PENDING' || l.status === 'APPROVED' || l.status === 'pending' || l.status === 'approved')
          .map(l => ({
            from_date: l.start_date || l.from_date,
            to_date: l.end_date || l.to_date || l.start_date || l.from_date, // fallback for single day
            status: l.status
          }));
      },
      error: () => {
        this.existingLeaves = [];
      }
    });
  }

  /* ================= FORM ================= */

  buildForm() {
    this.leaveForm = this.fb.group({
      leave_type: ['', Validators.required], // leave_type_id
      start_date: ['', Validators.required],
      end_date: ['', Validators.required],
      remarks: ['', Validators.required],
      notify: ['']
    });
  }

  handleDateChanges() {
    this.leaveForm.valueChanges.subscribe(() => {
      this.recalculateTotalDays();
    });
  }

  recalculateTotalDays() {
    const val = this.leaveForm.value;
    if (val.start_date && val.end_date) {
      const from = this.parseLocalDate(val.start_date);
      const to = this.parseLocalDate(val.end_date);

      if (from && to && to >= from && !isNaN(from.getTime()) && !isNaN(to.getTime())) {
        let workingDays = 0;
        let hasWeekOff = false;
        let current = new Date(from);
        while (current <= to) {
          if (!this.weekOffDays.includes(current.getDay())) {
            workingDays++;
          } else {
            hasWeekOff = true;
          }
          current.setDate(current.getDate() + 1);
        }
        
        this.total_days = workingDays;
      } else {
        this.total_days = 0;
      }
    } else {
      this.total_days = 0;
    }
  }

  private parseLocalDate(dateStr: string): Date {
    if (!dateStr) return new Date(NaN);
    // Take YYYY-MM-DD from the start to avoid any time components
    const cleanDate = dateStr.substring(0, 10);
    const parts = cleanDate.split('-');
    if (parts.length !== 3) return new Date(NaN);
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    // Creating date with year, monthIndex, day (Local time)
    return new Date(y, m - 1, d);
  }

  private formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  loadWeeklyOffPolicy() {
    this.adminService.getWeeklyOffPolicies().subscribe(policies => {
      this.employeeService.getMyProfile().subscribe({
        next: (profile: any) => {
          const policyId = profile.weekly_off_policy_id;
          const policy = policies.find((p: any) => p.id === policyId);
          if (policy) {
            this.weekOffDays = [];
            // Handle truthy values strictly (1, true, "1")
            if (Number(policy.sunday_off) === 1) this.weekOffDays.push(0);
            if (Number(policy.monday_off) === 1) this.weekOffDays.push(1);
            if (Number(policy.tuesday_off) === 1) this.weekOffDays.push(2);
            if (Number(policy.wednesday_off) === 1) this.weekOffDays.push(3);
            if (Number(policy.thursday_off) === 1) this.weekOffDays.push(4);
            if (Number(policy.friday_off) === 1) this.weekOffDays.push(5);
            if (Number(policy.saturday_off) === 1) this.weekOffDays.push(6);

            console.log('✅ Loaded WeekOffDays:', this.weekOffDays);

            this.generateHighlightedDates();
            this.recalculateTotalDays(); // Recalculate once policy is known
          }
        },
        error: () => {
          // Fallback to Sunday if profile fails
          this.weekOffDays = [0];
          this.generateHighlightedDates();
          this.recalculateTotalDays();
        }
      });
    });
  }

  generateHighlightedDates() {
    const dates = [];
    const today = new Date();
    // Generate for current year +/- 1 year to cover future leaves
    const start = new Date(today.getFullYear() - 1, 0, 1);
    const end = new Date(today.getFullYear() + 1, 11, 31);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (this.weekOffDays.includes(d.getDay())) {
        dates.push({
          date: this.formatLocalDate(d),
          textColor: '#2563eb',
          backgroundColor: '#eff6ff' // Soft blue for professional 'Off' look
        });
      }
    }
    this.highlightedDates = dates;
  }

  isDateEnabled = (dateString: string) => {
    const date = this.parseLocalDate(dateString);
    if (isNaN(date.getTime())) return true;
    
    // Disable if it's in our weekOffDays array
    return !this.weekOffDays.includes(date.getDay());
  };



  /* ================= API ================= */

  loadLeaveBalance() {
    this.employeeLeaves.getLeaveBalance(this.currentYear).subscribe({
      next: (res: any[]) => {
        this.leaveTypes = res.map(item => ({
          id: item.leave_type_id,        // ✅ REAL BACKEND ID
          name: item.type_name,
          code: item.type_code,
          available: Number(item.available_days) || 0
        }));
      }
    });
  }

  /* ================= SUBMIT ================= */

  submitRequest() {
    if (this.leaveForm.invalid) {
      this.presentToast('Please fill all required fields', 'warning');
      return;
    }

    if (this.total_days <= 0) {
      this.presentToast('slectes dates are week off please check the dates', 'warning');
      return;
    }

    const form = this.leaveForm.value;
    const selectedLeave = this.leaveTypes.find(l => l.id === form.leave_type);
    if (!selectedLeave) {
      this.presentToast('Invalid leave type', 'danger');
      return;
    }
    if (this.total_days > selectedLeave.available) {
      this.presentToast(`Only ${selectedLeave.available} days available`, 'warning');
      return;
    }

    // Weekend block removed as per new requirement: 
    // "employee can apply leaves on week ends also but in leave balance we will reduce only working days only"
    const newFrom = this.parseLocalDate(form.start_date);
    const newTo = this.parseLocalDate(form.end_date);
    
    console.log('Final working days to be deducted:', this.total_days);

    // Check if any date in the new request is already taken (pending, approved)
    const normalize = (date: any) => {
      if (!date) return '';
      if (typeof date === 'string' && date.length === 10) return date;
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let dateConflict = false;
    let dIter = new Date(newFrom);
    while (dIter <= newTo) {
      const dStr = normalize(dIter);
      
      for (const l of this.existingLeaves) {
        const lFrom = this.parseLocalDate(l.from_date);
        const lTo = this.parseLocalDate(l.to_date);
        
        let existingIter = new Date(lFrom);
        while (existingIter <= lTo) {
          if (normalize(existingIter) === dStr) {
            dateConflict = true;
            break;
          }
          existingIter.setDate(existingIter.getDate() + 1);
        }
        if (dateConflict) break;
      }
      
      if (dateConflict) break;
      dIter.setDate(dIter.getDate() + 1);
    }

    if (dateConflict) {
      this.presentToast('A leave request already exists for at least one of these dates.', 'danger');
      return;
    }

    const payload = {
      leave_type_id: form.leave_type,
      start_date: form.start_date,
      end_date: form.end_date,
      total_days: this.total_days,
      reason: form.remarks
    };

    this.leaveRequestService.applyLeave(payload).subscribe({
      next: () => {
        this.leaveForm.reset();
        this.total_days = 0;
        this.selectedDateFrom = '';
        this.selectedDateTo = '';
        this.presentToast('Leave request submitted successfully', 'success');
        this.leaveSubmitted.emit(); 
        this.loadPendingLeaves(); 
      },
      error: (err) => {
        this.presentToast(err?.error?.error || 'Failed to submit leave', 'danger');
        this.loadPendingLeaves();
      }
    });
  }

  /* ================= HELPERS ================= */

  validateWordLimit(ev: any) {
    const value = ev.target.value || '';
    const words = value.trim() ? value.trim().split(/\s+/) : [];
    this.wordsCount = words.length;

    if (words.length > 100) {
      this.leaveForm.patchValue({
        remarks: words.slice(0, 100).join(' ')
      });
      this.wordsCount = 100;
    }
  }

  async presentToast(
    message: string,
    color: 'success' | 'danger' | 'warning'
  ) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    toast.present();
  }

  onDateChangeFrom(event: any, popover: IonPopover) {
    this.leaveForm.patchValue({ start_date: event.detail.value });
    this.selectedDateFrom = event.detail.value;
    popover.dismiss();
  }

  onDateChangeTo(event: any, popover: IonPopover) {
    this.leaveForm.patchValue({ end_date: event.detail.value });
    this.selectedDateTo = event.detail.value;
    popover.dismiss();
  }
}
