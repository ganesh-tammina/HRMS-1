import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  IonicModule,
  ToastController,
  PopoverController
} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { LeaveInitializeService } from 'src/app/services/leave-initialize.service';
import { LeavePlanService } from 'src/app/services/leave-plans.service';
import { EmployeeSelectPopoverComponent } from './employee-select-popover.component';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-employee-leave-allocation',
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  templateUrl: './employee-leave-allocation.component.html',
  styleUrls: ['./employee-leave-allocation.component.scss'],
})
export class EmployeeLeaveAllocationComponent implements OnInit {

  allocationForm!: FormGroup;

  applyForAll = false;
  loading = false;

  employees: any[] = [];
  leavePlans: any[] = [];
  showCreateForm = true;
  isEditMode = false;
  selectedLeaveTypeId: number | null = null;

  selectedEmployeeLabel = '';

  constructor(
    private fb: FormBuilder,
    private leaveInitService: LeaveInitializeService,
    private leavePlanService: LeavePlanService,
    private toastCtrl: ToastController,
    private popoverCtrl: PopoverController,
    private router: Router,
    private modalCtrl: ModalController,
  ) { }

  ngOnInit(): void {
    this.allocationForm = this.fb.group({
      employee_id: ['', Validators.required],
      leave_plan_id: [null, Validators.required],   // ✅ ID stored
      leave_year: [2025, Validators.required],
    });

    this.loadEmployees();
    this.loadLeavePlans(); // ✅ SAME PATTERN AS LeavesAllocationComponent
  }
  openCreateForm(): void {
    this.isEditMode = false;
    this.selectedLeaveTypeId = null;
    this.allocationForm.reset({
      is_paid: true,
      requires_approval: true,
      can_carry_forward: false,
      max_carry_forward_days: 0,
    });
    this.showCreateForm = true;
  }
  cancelCreate(): void {
    this.allocationForm.reset();
    this.showCreateForm = false;
    this.isEditMode = false;
    this.selectedLeaveTypeId = null;
    this.modalCtrl.dismiss();
  }
  /* ================= LOADERS ================= */

  loadEmployees(): void {
    this.leaveInitService.getAllEmployees().subscribe({
      next: res => this.employees = res,
      error: () => this.showToast('Failed to load employees'),
    });
  }

  loadLeavePlans(): void {
    this.leavePlanService.getLeavePlans().subscribe({
      next: res => this.leavePlans = res,
      error: () => this.showToast('Failed to load leave plans'),
    });
  }

  /* ================= EMPLOYEE POPOVER ================= */

  async openEmployeeDropdown(ev: any) {
    const popover = await this.popoverCtrl.create({
      component: EmployeeSelectPopoverComponent,
      componentProps: { employees: this.employees },
      event: ev,
      showBackdrop: true,
    });

    await popover.present();

    const { data } = await popover.onDidDismiss();
    if (data) {
      this.allocationForm.patchValue({ employee_id: data.id });
      this.selectedEmployeeLabel = `${data.FirstName} (${data.EmployeeNumber})`;
    }
  }

  onToggleChange(event: any) {
    this.applyForAll = event.detail.checked;

    if (this.applyForAll) {
      this.allocationForm.get('employee_id')?.disable();
      this.selectedEmployeeLabel = '';
    } else {
      this.allocationForm.get('employee_id')?.enable();
    }
  }

  /* ================= SUBMIT ================= */

  submitAllocation() {
    if (!this.applyForAll && this.allocationForm.invalid) return;

    this.loading = true;

    const payload = {
      leave_plan_id: this.allocationForm.value.leave_plan_id,
      leave_year: this.allocationForm.value.leave_year,
    };

    if (!this.applyForAll) {
      const empId = this.allocationForm.value.employee_id;

      this.leaveInitService.initializeForEmployee(empId, payload).subscribe({
        next: () => {
          this.showToast('Leave balance initialized successfully');
          this.loading = false;
        },
        error: () => {
          this.showToast('Initialization failed');
          this.loading = false;
          this.showCreateForm = false;
        }
      });
      return;
    }

    Promise.all(
      this.employees.map(emp =>
        this.leaveInitService.initializeForEmployee(emp.id, payload).toPromise()
      )
    )
      .then(() => {
        this.showToast('Leave balance initialized for all employees');
        this.loading = false;
        this.showCreateForm = false;
      })
      .catch(() => {
        this.showToast('Some employees failed');
        this.loading = false;
        this.showCreateForm = false;
      });
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'top',
    });
    toast.present();
  }
}
