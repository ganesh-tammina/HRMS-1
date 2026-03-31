import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { LeavePlanService } from '../../../../core/services/leave-plans.service';
import { AdminService } from '../../../../core/services/admin.service';
import { EmployeeService } from '../../../../core/services/employee.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-leave-initialize-modal',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Leave balance setup</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-containerOn">
      <div class="initializationhead mb-20">
        <h4 class="page-title">Configure Leave Initialization</h4>
        <p class="sub-text">Setup leave balances for employees</p>
      </div>

      <ion-card class="form-card">
        <ion-card-content>
          <form [formGroup]="initForm">
            <ion-list lines="none" class="allocation-ipt form-continer">
              
              <!-- Toggle -->
              <ion-item class="toggle-item mb-20" color="light" style="border-radius: 8px;">
                <ion-label>Apply for all employees</ion-label>
                <ion-toggle (ionChange)="onToggleAll($event)"></ion-toggle>
              </ion-item>

              <!-- Employee selector (If not all) -->
              <div *ngIf="!applyForAll" class="mb-20">
                <ion-item lines="outline">
                  <ion-label position="stacked">Employee</ion-label>
                  <ion-input [(ngModel)]="empSearch" [ngModelOptions]="{standalone: true}" (ionInput)="searchEmp($event)" placeholder="Search Name or ID"></ion-input>
                </ion-item>
                
                <div *ngIf="filteredEmps.length > 0" class="emp-dropdown">
                  <ion-item *ngFor="let emp of filteredEmps" (click)="selectEmp(emp)" button detail="false">
                    {{emp.FullName}} ({{emp.id}})
                  </ion-item>
                </div>
                <div *ngIf="selectedEmp" class="selected-badge mt-10">
                  <ion-icon name="checkmark-circle" color="success" class="mr-2"></ion-icon>
                  Selected: <b>{{selectedEmp.FullName}}</b>
                </div>
              </div>

              <!-- Leave Plan Select -->
              <ion-item lines="outline" class="mb-20">
                <ion-label position="stacked">Leave Plan</ion-label>
                <ion-select formControlName="leave_plan_id" placeholder="Select Leave Plan" interface="popover" toggleIcon="chevron-down" expandedIcon="chevron-up">
                  <ion-select-option *ngFor="let plan of leavePlans" [value]="plan.id">{{plan.name}}</ion-select-option>
                </ion-select>
              </ion-item>

              <!-- Leave Year -->
              <ion-item lines="outline" class="mb-20">
                <ion-label position="stacked">Leave Year</ion-label>
                <ion-input type="number" formControlName="leave_year"></ion-input>
              </ion-item>

            </ion-list>
          </form>
        </ion-card-content>
      </ion-card>
    </ion-content>
    
    <ion-footer>
      <ion-toolbar class="footer-toolbar">
        <div class="action-buttons">
          <ion-button fill="outline" color="medium" (click)="dismiss()">Cancel</ion-button>
          <ion-button color="primary" [disabled]="loading" (click)="submit()">
            <ion-spinner *ngIf="loading" name="crescent"></ion-spinner>
            <span *ngIf="!loading">Initialize Leave Balance</span>
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    .mb-20 { margin-bottom: 20px; }
    .mt-10 { margin-top: 10px; }
    .mr-2 { margin-right: 8px; vertical-align: middle; }
    .page-containerOn { --background: #f8f9fc; }

    .initializationhead { margin-bottom: 20px; }
    .page-title { font-weight: 700; color: #1e293b; margin: 0; font-size: 1.5rem; }
    .sub-text { color: #64748b; font-size: 0.95rem; margin-top: 5px; }

    .form-card { border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); margin: 0; }

    .emp-dropdown { max-height: 200px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); background: white; z-index: 10; margin-top: -5px; }
    
    .selected-badge { background: #f0fdf4; padding: 10px 14px; border-radius: 8px; border: 1px solid #bbf7d0; color: #166534; font-size: 0.95rem; display: flex; align-items: center; }

    .footer-toolbar { padding: 10px; }
    .action-buttons { display: flex; justify-content: flex-end; gap: 10px; }
  `],
  standalone: false
})
export class LeaveInitializeModal implements OnInit {
  initForm!: FormGroup;
  loading = false;
  applyForAll = false;
  leavePlans: any[] = [];
  allEmps: any[] = [];
  filteredEmps: any[] = [];
  selectedEmp: any = null;
  empSearch = '';

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private leavePlanService: LeavePlanService,
    private adminService: AdminService,
    private employeeService: EmployeeService
  ) {}

  ngOnInit() {
    this.initForm = this.fb.group({
      employee_id: ['', Validators.required],
      leave_plan_id: [null, Validators.required],
      leave_year: [new Date().getFullYear(), Validators.required]
    });
    this.loadData();
  }

  loadData() {
    this.leavePlanService.getLeavePlans().subscribe(res => this.leavePlans = res || []);
    this.employeeService.getAllEmployees(1, 1000).subscribe((res: any) => this.allEmps = res.data || []);
  }

  onToggleAll(ev: any) {
    this.applyForAll = ev.detail.checked;
    if (this.applyForAll) {
      this.initForm.get('employee_id')?.disable();
      this.selectedEmp = null;
      this.empSearch = '';
    } else {
      this.initForm.get('employee_id')?.enable();
    }
  }

  searchEmp(ev: any) {
    const val = ev.detail.value?.toLowerCase() || '';
    if (val.length < 2) { this.filteredEmps = []; return; }
    this.filteredEmps = this.allEmps.filter(e => 
      e.FullName?.toLowerCase().includes(val) || 
      e.id.toString().includes(val)
    ).slice(0, 10);
  }

  selectEmp(emp: any) {
    this.selectedEmp = emp;
    this.empSearch = emp.FullName;
    this.initForm.patchValue({ employee_id: emp.id });
    this.filteredEmps = [];
  }

  async submit() {
    if (!this.applyForAll && this.initForm.invalid) {
      this.showToast('Please fill all required fields.', 'warning');
      return;
    }
    this.loading = true;
    
    const payload = {
      leave_plan_id: this.initForm.get('leave_plan_id')?.value,
      leave_year: this.initForm.get('leave_year')?.value
    };

    if (this.applyForAll) {
      try {
        await Promise.all(
          this.allEmps.map(emp =>
            firstValueFrom(this.adminService.initializeLeaveBalance(emp.id, payload))
          )
        );
        this.showToast('Leave balance initialized for all employees', 'success');
        this.dismiss();
      } catch (error) {
        this.showToast('Some employees failed to initialize', 'warning');
        this.dismiss();
      } finally {
        this.loading = false;
      }
    } else {
      const empId = this.initForm.get('employee_id')?.value;
      this.adminService.initializeLeaveBalance(empId, payload).subscribe({
        next: () => {
          this.loading = false;
          this.showToast('Leave balance initialized', 'success');
          this.dismiss();
        },
        error: () => {
          this.loading = false;
          this.showToast('Operation failed', 'danger');
        }
      });
    }
  }

  dismiss() { 
    this.modalCtrl.dismiss(); 
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color: color as any, position: 'top' });
    toast.present();
  }
}

