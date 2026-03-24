import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { UpdatealloctionleaveService } from 'src/app/services/updatealloctionleave.service';
import { LeavePlanService } from 'src/app/services/leave-plans.service';
import { LeaveTypeService } from 'src/app/services/leavetype.service';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-leaves-allocation',
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './leaves-allocation.component.html',
  styleUrls: ['./leaves-allocation.component.scss'],
})
export class LeavesAllocationComponent implements OnInit {

  selectedPlanId: number | null = null;
  allocationForm!: FormGroup;
  loading = false;
  leavePlans: any[] = [];
  leaveTypes: any[] = [];
  filteredLeaveTypes: any[] = [];
  loadingPlans = false;
  listLoading = false;
  selectedNewLeaveTypeId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private updateAllocationService: UpdatealloctionleaveService,
    private toastCtrl: ToastController,
    private leavePlanService: LeavePlanService,
    private leaveTypesService: LeaveTypeService,
    private router: Router,
    private modalCtrl: ModalController,
  ) { }

  ngOnInit(): void {
    this.allocationForm = this.fb.group({
      name: [''],
      description: [''],
      allocations: this.fb.array([]),
    });
    this.loadLeavePlans();
    this.loadLeaveTypes();
  }

  get showAllocations(): boolean {
    return !!this.selectedPlanId;
  }

  get allocations(): FormArray {
    return this.allocationForm.get('allocations') as FormArray;
  }

  addAllocation(leaveTypeId: any = null, days: any = null, prorate = true): void {
    if (!this.selectedPlanId) {
      this.showToast('Please select a Leave Plan before adding allocations', 'warning');
      return;
    }
    this.allocations.push(
      this.fb.group({
        leave_type_id: [leaveTypeId, Validators.required],
        days_allocated: [days, [Validators.required, Validators.min(1)]],
        prorate_on_joining: [prorate],
      })
    );
  }

  removeAllocation(index: number): void {
    this.allocations.removeAt(index);
  }

  async submitallocationLeaves(): Promise<void> {
    if (!this.selectedPlanId) {
      this.showToast('Please select a Leave Plan first', 'warning');
      return;
    }
    if (this.allocations.length === 0) {
      this.showToast('Please add at least one allocation before saving', 'danger');
      return;
    }
    if (this.allocationForm.invalid) {
      this.allocationForm.markAllAsTouched();
      this.showToast('Please fill all required fields in the allocations', 'danger');
      return;
    }
    this.loading = true;
    this.updateAllocationService
      .updateLeaveAllocation(this.selectedPlanId, this.allocationForm.value)
      .subscribe({
        next: () => {
          this.loading = false;
          this.showToast('Leave allocation updated successfully', 'success');
          this.allocationForm.reset();
          this.selectedPlanId = null;
        },
        error: (err) => {
          this.loading = false;
          console.error('Submit Error:', err);
          this.showToast('Failed to update leave allocation', 'danger');
        },
      });
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 2000,
      color: color,
    });
    toast.present();
  }

  loadLeavePlans(): void {
    this.loadingPlans = true;
    this.leavePlanService.getLeavePlans().subscribe({
      next: (res: any[]) => {
        this.leavePlans = res;
        this.loadingPlans = false;
      },
      error: () => (this.loadingPlans = false),
    });
  }

  loadLeaveTypes(): void {
    this.listLoading = true;
    this.leaveTypesService.getLeaveTypes().subscribe({
      next: (res: any[]) => {
        this.leaveTypes = res;
        this.filteredLeaveTypes = res.map((t) => ({
          id: t.id,
          type_name: t.type_name,
        }));
        this.listLoading = false;
      },
      error: () => (this.listLoading = false),
    });
  }

  onPlanChange(planId: any): void {
    const selectedPlan = this.leavePlans.find((p) => p.id === Number(planId));
    if (!selectedPlan) return;
    this.selectedPlanId = Number(planId);
    this.allocationForm.patchValue({
      name: selectedPlan.name,
      description: selectedPlan.description,
    });
    this.allocations.clear();

    // Fetch full plan detail to get allocations if not already present or for fresh data
    this.leavePlanService.getLeavePlanById(this.selectedPlanId).subscribe({
      next: (fullPlan) => {
        if (fullPlan.allocations?.length) {
          fullPlan.allocations.forEach((alloc: any) => {
            this.addAllocation(
              alloc.leave_type_id,
              alloc.days_allocated,
              alloc.prorate_on_joining === 1 || alloc.prorate_on_joining === true
            );
          });
        }
      }
    });
  }

  addNewAllocation(): void {
    if (!this.selectedNewLeaveTypeId) return;

    // Check if ya already added
    const exists = this.allocations.controls.some(
      c => c.value.leave_type_id === Number(this.selectedNewLeaveTypeId)
    );

    if (exists) {
      this.showToast('This leave type is already added', 'warning');
      return;
    }

    const type = this.leaveTypes.find(t => t.id === Number(this.selectedNewLeaveTypeId));
    if (type) {
      this.addAllocation(type.id, 0, true);
      this.selectedNewLeaveTypeId = null;
    }
  }

  getTypeName(typeId: number): string {
    const type = this.leaveTypes.find(t => t.id === Number(typeId));
    return type ? type.type_name : 'Unknown Type';
  }

  leavetype() {
    this.router.navigate(['./admin-leaves']);
  }

  adminManagement() {
    this.router.navigate(['./admin']);
  }

  cancel() {
    // this.router.navigate(['./admin-leaves']);
    this.modalCtrl.dismiss();
  }
}