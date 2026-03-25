import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { LeavePlanService, LeavePlan } from 'src/app/services/leave-plans.service';
import { LeaveTypeService } from 'src/app/services/leavetype.service';

@Component({
  selector: 'app-create-leave-plan',
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './leaveplans.component.html',
  styleUrls: ['./leaveplans.component.scss'],
})
export class LeaveplansComponent implements OnInit {

  leavePlanForm!: FormGroup;

  loading = false;
  loadingPlans = false;
  loadingPlanDetails = false;
  showCreateForm = false;

  leavePlans: LeavePlan[] = [];

  // EDIT STATE
  isEditMode = false;
  editingPlanId: number | null = null;

  // VIEW STATE
  selectedPlan: LeavePlan | null = null;

  editingPlanAllocations: any[] = [];
  allLeaveTypes: any[] = [];
  selectedNewLeaveTypeId: number | null = null;

  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor(
    private fb: FormBuilder,
    private leavePlanService: LeavePlanService,
    private leaveTypeService: LeaveTypeService,
    private router: Router,
    private toastCtrl: ToastController
  ) { }

  ngOnInit(): void {
    this.leavePlanForm = this.fb.group({
      name: ['', Validators.required],
      leave_year_start_month: [1, Validators.required],
      leave_year_start_day: [1, Validators.required],
      description: [''],
      is_active: [true],
    });

    this.loadLeavePlans();
    this.loadAllLeaveTypes();
  }

  ionViewWillEnter(): void {
    this.loadLeavePlans();
  }

  /* ================= CREATE ================= */

  openCreateForm(): void {
    this.isEditMode = false;
    this.editingPlanId = null;
    this.editingPlanAllocations = [];

    this.leavePlanForm.reset({
      leave_year_start_month: 1,
      leave_year_start_day: 1,
      is_active: true,
    });

    this.showCreateForm = true;
  }

  /* ================= EDIT ================= */

  editPlan(plan: any): void {
    this.isEditMode = true;
    this.editingPlanId = plan.id;
    this.loading = true;

    // Fetch full plan details including allocations
    this.leavePlanService.getLeavePlanById(plan.id).subscribe({
      next: (fullPlan) => {
        this.editingPlanAllocations = fullPlan.allocations || [];
        this.leavePlanForm.patchValue({
          name: fullPlan.name,
          leave_year_start_month: fullPlan.leave_year_start_month || 1,
          leave_year_start_day: fullPlan.leave_year_start_day || 1,
          description: fullPlan.description,
          is_active: fullPlan.is_active !== undefined ? fullPlan.is_active : true,
        });

        this.loading = false;
        this.showCreateForm = true;
      },
      error: () => {
        this.loading = false;
        this.showToast('Failed to load plan details', 'danger');
      }
    });
  }

  cancelCreate(): void {
    this.showCreateForm = false;
    this.isEditMode = false;
    this.editingPlanId = null;
    this.editingPlanAllocations = [];
  }

  /* ================= SUBMIT ================= */

  submit(): void {
    if (this.leavePlanForm.invalid) {
      this.leavePlanForm.markAllAsTouched();
      return;
    }

    const payload = { ...this.leavePlanForm.value };

    // Always include allocations in the payload
    payload.allocations = this.editingPlanAllocations.map((alloc: any) => ({
      leave_type_id: alloc.leave_type_id,
      days_allocated: alloc.days_allocated,
      prorate_on_joining: alloc.prorate_on_joining !== undefined ? alloc.prorate_on_joining : true
    }));

    this.loading = true;

    const request$ = this.isEditMode
      ? this.leavePlanService.updateLeavePlan(this.editingPlanId!, payload)
      : this.leavePlanService.createLeavePlan(payload);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.showCreateForm = false; // Close the modal on success
        this.showToast(this.isEditMode ? 'Leave plan updated' : 'Leave plan created', 'success');
        this.loadLeavePlans(); // Refresh the leave plans immediately
      },
      error: () => {
        this.loading = false;
        this.showToast('Failed to submit leave plan', 'danger');
      },
    });
  }

  removeAllocation(index: number) {
    this.editingPlanAllocations.splice(index, 1);
  }

  addAllocation() {
    if (!this.selectedNewLeaveTypeId) return;

    const existing = this.editingPlanAllocations.find(a => a.leave_type_id === Number(this.selectedNewLeaveTypeId));
    if (existing) {
      this.showToast('This leave type is already added to the plan.', 'warning');
      return;
    }

    const leaveType = this.allLeaveTypes.find(t => t.id === Number(this.selectedNewLeaveTypeId));
    if (leaveType) {
      this.editingPlanAllocations.push({
        leave_type_id: leaveType.id,
        type_name: leaveType.type_name,
        days_allocated: 0,
        prorate_on_joining: true
      });
      this.selectedNewLeaveTypeId = null;
    }
  }

  loadAllLeaveTypes() {
    this.leaveTypeService.getLeaveTypes().subscribe({
      next: (res) => this.allLeaveTypes = res || [],
      error: (err) => console.error('Error loading leave types', err)
    });
  }

  /* ================= VIEW SINGLE PLAN ================= */

  viewPlanDetails(planId: number): void {
    this.loadingPlanDetails = true;

    this.leavePlanService.getLeavePlanById(planId).subscribe({
      next: (res) => {
        this.selectedPlan = res;
        this.loadingPlanDetails = false;
        // Scroll to details after a short timeout to ensure DOM is ready
        setTimeout(() => {
          const el = document.querySelector('.detail-view');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      },
      error: () => (this.loadingPlanDetails = false),
    });
  }

  /* ================= DELETE ================= */

  deletePlan(planId: number): void {
    if (!confirm('Are you sure you want to delete this leave plan?')) return;

    this.leavePlanService.deleteLeavePlan(planId).subscribe({
      next: () => this.loadLeavePlans(),
    });
  }

  /* ================= LOAD ================= */

  loadLeavePlans(): void {
    this.loadingPlans = true;
    this.leavePlanService.getLeavePlans().subscribe({
      next: (res) => {
        this.leavePlans = res || [];
        this.loadingPlans = false;
      },
      error: () => (this.loadingPlans = false),
    });
  }

  leavetype() {
    this.router.navigate(['./admin-leaves']);
  }
  adminManagement() {
    this.router.navigate(['./admin']);
  }

  /* ================= HELPERS ================= */

  getTotalEmployees(): number {
    return this.leavePlans.reduce((sum, plan) => sum + (plan.employees_count || 0), 0);
  }

  getActivePlanCount(): number {
    return this.leavePlans.filter(p => p.is_active).length;
  }

  getMonthName(monthNumber: number): string {
    if (!monthNumber || monthNumber < 1 || monthNumber > 12) return 'Unknown';
    return this.months[monthNumber - 1];
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
