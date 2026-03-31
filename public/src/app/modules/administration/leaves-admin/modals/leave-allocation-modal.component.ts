import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { LeavePlanService } from '../../../../core/services/leave-plans.service';
import { LeaveTypeService } from '../../../../core/services/leavetype.service';
import { AdminService } from '../../../../core/services/admin.service';

@Component({
  selector: 'app-leaves-allocation-modal',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Leave Allocation</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-containerOn">
      <div class="welcome-section mb-20">
        <h4 class="page-title">Leave Allocation</h4>
        <p class="sub-text">Allocate leaves to employees</p>
      </div>

      <ion-card class="form-card">
        <ion-card-header>
          <ion-card-title>Leave Plan Details</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <form [formGroup]="allocationForm">
            <ion-item lines="outline" class="mb-20">
              <ion-label position="stacked">Leave Plan</ion-label>
              <ion-select [value]="selectedPlanId" (ionChange)="onPlanChange($event)" placeholder="Select Leave Plan" interface="popover">
                <ion-select-option *ngFor="let p of leavePlans" [value]="p.id">{{p.name}}</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item lines="outline" class="mb-20">
              <ion-label position="stacked">Leave Plan Name</ion-label>
              <ion-input formControlName="name" readonly="true"></ion-input>
            </ion-item>

            <ion-item lines="outline" class="mb-20">
              <ion-label position="stacked">Description</ion-label>
              <ion-textarea formControlName="description" rows="3" readonly="true"></ion-textarea>
            </ion-item>

            <div *ngIf="selectedPlanId" style="margin-top: 24px;">
              <h3 class="section-title">Leave Type Allocations</h3>

              <div class="add-allocation-box">
                <ion-select [(ngModel)]="selectedNewTypeId" [ngModelOptions]="{standalone: true}" placeholder="-- Select Leave Type --" class="leave-select">
                  <ion-select-option *ngFor="let lt of leaveTypes" [value]="lt.id">{{lt.type_name}}</ion-select-option>
                </ion-select>
                <ion-button (click)="addNewAllocation()" color="primary">
                  <ion-icon name="add" slot="start"></ion-icon> Add Type
                </ion-button>
              </div>

              <div formArrayName="allocations">
                <div *ngFor="let a of allocations.controls; let i = index" [formGroupName]="i" class="allocation-row">
                  <div class="allocation-name">
                    <div class="blue-dot"></div>
                    <span>{{getTypeName(a.get('leave_type_id')?.value)}}</span>
                  </div>

                  <div class="allocation-actions">
                    <div class="days-input-group">
                      <input type="number" formControlName="days_allocated" class="days-input">
                      <span class="days-label">Days</span>
                    </div>

                    <div class="prorate-group" style="display:none;">
                      <!-- Hidden as legacy UI didn't show prorate explicitly here but code had it -->
                      <ion-checkbox formControlName="prorate_on_joining"></ion-checkbox>
                    </div>

                    <ion-button fill="clear" color="danger" (click)="removeAllocation(i)" class="trash-btn">
                      <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                    </ion-button>
                  </div>
                </div>
              </div>
            </div>

            <div *ngIf="!selectedPlanId" class="empty-state">
              <ion-icon name="layers-outline"></ion-icon>
              <p>Please select a <strong>Leave Plan</strong> to manage allocations.</p>
            </div>
          </form>
        </ion-card-content>
      </ion-card>
    </ion-content>
    
    <ion-footer>
      <ion-toolbar class="footer-toolbar">
        <div class="action-buttons">
          <ion-button fill="outline" color="medium" (click)="dismiss()">Cancel</ion-button>
          <ion-button color="primary" [disabled]="loading || !selectedPlanId" (click)="submit()">
            <ion-spinner *ngIf="loading" name="crescent"></ion-spinner>
            <span *ngIf="!loading">Save & Allocate Leaves</span>
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    .mb-20 { margin-bottom: 20px; }
    .page-containerOn { --background: #f8f9fc; }
    .welcome-section { margin-bottom: 15px; }
    .page-title { font-weight: 700; color: #1e293b; margin: 0; font-size: 1.5rem; }
    .sub-text { color: #64748b; font-size: 0.95rem; margin-top: 5px; }

    .form-card { border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); }

    .section-title { font-weight: 600; color: #334155; margin-bottom: 12px; font-size: 1.1rem; border-left: 4px solid #3b82f6; padding-left: 12px; }

    .add-allocation-box { display: flex; gap: 8px; margin-bottom: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
    .leave-select { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; background: white; padding-left: 10px; }

    .allocation-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .allocation-name { display: flex; align-items: center; gap: 12px; flex: 1; }
    .blue-dot { width: 10px; height: 10px; border-radius: 50%; background: #3b82f6; box-shadow: 0 0 5px rgba(59, 130, 246, 0.4); }
    .allocation-name span { font-weight: 600; color: #1e293b; font-size: 1rem; }

    .allocation-actions { display: flex; align-items: center; gap: 16px; }
    .days-input-group { display: flex; align-items: center; gap: 8px; }
    .days-input { width: 70px; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; font-size: 0.95rem; font-weight: 700; color: #0f172a; outline: none; background: #f1f5f9; }
    .days-label { font-size: 0.85rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

    .trash-btn { border-left: 1px solid #e2e8f0; padding-left: 12px; margin: 0; }

    .empty-state { text-align: center; padding: 40px 20px; background: #f8fafc; border-radius: 12px; border: 2px dashed #e2e8f0; margin-top: 20px; }
    .empty-state ion-icon { font-size: 48px; color: #cbd5e1; margin-bottom: 12px; }
    .empty-state p { color: #64748b; font-size: 1rem; }

    .footer-toolbar { padding: 10px; }
    .action-buttons { display: flex; justify-content: flex-end; gap: 10px; }
  `],
  standalone: false
})
export class LeaveAllocationModal implements OnInit {
  selectedPlanId: number | null = null;
  allocationForm!: FormGroup;
  loading = false;
  leavePlans: any[] = [];
  leaveTypes: any[] = [];
  selectedNewTypeId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private leavePlanService: LeavePlanService,
    private leaveTypeService: LeaveTypeService,
    private adminService: AdminService
  ) {}

  ngOnInit() {
    this.allocationForm = this.fb.group({
      name: [''],
      description: [''],
      allocations: this.fb.array([])
    });
    this.loadData();
  }

  loadData() {
    this.leavePlanService.getLeavePlans().subscribe({
      next: (res) => this.leavePlans = res || []
    });
    this.leaveTypeService.getLeaveTypes().subscribe({
      next: (res) => this.leaveTypes = res || []
    });
  }

  get allocations() { return this.allocationForm.get('allocations') as FormArray; }

  onPlanChange(ev: any) {
    const planId = ev.detail.value;
    const selectedPlan = this.leavePlans.find(p => p.id === Number(planId));
    if (!selectedPlan) return;

    this.selectedPlanId = Number(planId);
    this.allocationForm.patchValue({
      name: selectedPlan.name,
      description: selectedPlan.description
    });
    
    this.allocations.clear();
    this.leavePlanService.getLeavePlanById(this.selectedPlanId!).subscribe({
      next: (res) => {
        if (res.allocations && res.allocations.length) {
          res.allocations.forEach((a: any) => {
            this.allocations.push(this.fb.group({
              leave_type_id: [a.leave_type_id, Validators.required],
              days_allocated: [a.days_allocated, [Validators.required, Validators.min(1)]],
              prorate_on_joining: [a.prorate_on_joining === 1 || a.prorate_on_joining === true]
            }));
          });
        }
      }
    });
  }

  addNewAllocation() {
    if (!this.selectedNewTypeId) return;
    
    // Check if ya already added
    if (this.allocations.controls.some(c => c.value.leave_type_id === Number(this.selectedNewTypeId))) {
      this.showToast('This leave type is already added', 'warning');
      return;
    }
    
    this.allocations.push(this.fb.group({
      leave_type_id: [Number(this.selectedNewTypeId), Validators.required],
      days_allocated: [0, [Validators.required, Validators.min(1)]],
      prorate_on_joining: [true]
    }));
    this.selectedNewTypeId = null;
  }

  removeAllocation(idx: number) { 
    this.allocations.removeAt(idx); 
  }

  getTypeName(id: number) {
    return this.leaveTypes.find(t => t.id === Number(id))?.type_name || 'Unknown Type';
  }

  submit() {
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
      this.showToast('Please fill all required fields in the allocations (Minimum 1 day)', 'danger');
      return;
    }
    
    this.loading = true;
    
    // We send name, description and allocations as in Existing code
    this.adminService.updateBulkLeaveAllocation(this.selectedPlanId, this.allocationForm.value).subscribe({
      next: () => {
        this.loading = false;
        this.showToast('Leave allocation updated successfully', 'success');
        this.dismiss();
      },
      error: () => {
        this.loading = false;
        this.showToast('Failed to update leave allocation', 'danger');
      }
    });
  }

  dismiss() { 
    this.modalCtrl.dismiss(); 
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color: color as any, position: 'top' });
    toast.present();
  }
}
