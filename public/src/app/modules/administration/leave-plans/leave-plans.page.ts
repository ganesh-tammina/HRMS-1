import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController, AlertController } from '@ionic/angular';
import { LeavePlanService, LeavePlan } from '../../../core/services/leave-plans.service';
import { LeaveTypeService } from '../../../core/services/leavetype.service';

@Component({
  selector: 'app-leave-plans',
  templateUrl: './leave-plans.page.html',
  styleUrls: ['./leave-plans.page.scss'],
  standalone: false
})
export class LeavePlansPage implements OnInit {
  leavePlanForm!: FormGroup;
  loading = false;
  loadingPlans = false;
  showCreateForm = false;
  isEditMode = false;
  editingPlanId: number | null = null;
  leavePlans: LeavePlan[] = [];
  allLeaveTypes: any[] = [];
  selectedNewLeaveTypeId: number | null = null;
  editingPlanAllocations: any[] = [];

  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor(
    private fb: FormBuilder,
    private leavePlanService: LeavePlanService,
    private leaveTypeService: LeaveTypeService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
    this.initForm();
    this.loadLeavePlans();
    this.loadAllLeaveTypes();
  }

  private initForm() {
    this.leavePlanForm = this.fb.group({
      name: ['', Validators.required],
      leave_year_start_month: [1, Validators.required],
      leave_year_start_day: [1, Validators.required],
      description: [''],
      is_active: [true],
    });
  }

  loadLeavePlans() {
    this.loadingPlans = true;
    this.leavePlanService.getLeavePlans().subscribe({
      next: (res) => {
        this.leavePlans = res || [];
        this.loadingPlans = false;
      },
      error: () => this.loadingPlans = false
    });
  }

  loadAllLeaveTypes() {
    this.leaveTypeService.getLeaveTypes().subscribe({
      next: (res) => this.allLeaveTypes = res || []
    });
  }

  openCreateForm() {
    this.isEditMode = false;
    this.editingPlanId = null;
    this.editingPlanAllocations = [];
    this.leavePlanForm.reset({ leave_year_start_month: 1, leave_year_start_day: 1, is_active: true });
    this.showCreateForm = true;
  }

  editPlan(plan: any) {
    this.isEditMode = true;
    this.editingPlanId = plan.id;
    this.loading = true;
    this.leavePlanService.getLeavePlanById(plan.id).subscribe({
      next: (fullPlan) => {
        this.editingPlanAllocations = fullPlan.allocations || [];
        this.leavePlanForm.patchValue({
          name: fullPlan.name,
          leave_year_start_month: fullPlan.leave_year_start_month,
          leave_year_start_day: fullPlan.leave_year_start_day,
          description: fullPlan.description,
          is_active: fullPlan.is_active
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

  addAllocation() {
    if (!this.selectedNewLeaveTypeId) return;
    const existing = this.editingPlanAllocations.find(a => a.leave_type_id === Number(this.selectedNewLeaveTypeId));
    if (existing) {
      this.showToast('This leave type is already added.', 'warning');
      return;
    }
    const lt = this.allLeaveTypes.find(t => t.id === Number(this.selectedNewLeaveTypeId));
    if (lt) {
      this.editingPlanAllocations.push({
        leave_type_id: lt.id,
        type_name: lt.type_name,
        days_allocated: 0,
        prorate_on_joining: true
      });
      this.selectedNewLeaveTypeId = null;
    }
  }

  removeAllocation(index: number) {
    this.editingPlanAllocations.splice(index, 1);
  }

  submit() {
    if (this.leavePlanForm.invalid) return;
    const payload = { 
      ...this.leavePlanForm.value,
      allocations: this.editingPlanAllocations.map(a => ({
        leave_type_id: a.leave_type_id,
        days_allocated: a.days_allocated,
        prorate_on_joining: a.prorate_on_joining
      }))
    };

    this.loading = true;
    const action = this.isEditMode 
      ? this.leavePlanService.updateLeavePlan(this.editingPlanId!, payload)
      : this.leavePlanService.createLeavePlan(payload);

    action.subscribe({
      next: () => {
        this.showToast(this.isEditMode ? 'Plan updated' : 'Plan created', 'success');
        this.loading = false;
        this.showCreateForm = false;
        this.loadLeavePlans();
      },
      error: () => {
        this.loading = false;
        this.showToast('Failed to save plan', 'danger');
      }
    });
  }

  async deletePlan(planId: number) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Plan',
      message: 'Are you sure you want to delete this leave plan?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => {
            this.leavePlanService.deleteLeavePlan(planId).subscribe(() => this.loadLeavePlans());
          }
        }
      ]
    });
    alert.present();
  }

  cancelCreate() {
    this.showCreateForm = false;
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color: color as any, position: 'top' });
    toast.present();
  }

  getMonthName(monthNum: number): string {
    return this.months[monthNum - 1] || 'Unknown';
  }
}
