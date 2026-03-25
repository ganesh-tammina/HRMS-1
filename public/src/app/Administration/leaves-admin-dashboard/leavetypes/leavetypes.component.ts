import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { LeaveTypeService } from 'src/app/services/leavetype.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-leavetypes',
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  templateUrl: './leavetypes.component.html',
  styleUrls: ['./leavetypes.component.scss'],
})
export class LeavetypesComponent implements OnInit {

  leaveTypeForm!: FormGroup;
  leaveTypes: any[] = [];
  loading = false;
  listLoading = false;
  showCreateForm = false;

  // 🔹 EDIT STATE
  isEditMode = false;
  selectedLeaveTypeId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private leaveTypesService: LeaveTypeService,
    private toastCtrl: ToastController,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.loadLeaveTypes();
  }

  private initForm(): void {
    this.leaveTypeForm = this.fb.group({
      type_name: ['', Validators.required],
      type_code: ['', Validators.required],
      is_paid: [true],
      requires_approval: [true],
      can_carry_forward: [false],
      max_carry_forward_days: [0],
      description: [''],
    });
  }

  /** OPEN CREATE FORM */
  openCreateForm(): void {
    this.isEditMode = false;
    this.selectedLeaveTypeId = null;
    this.leaveTypeForm.reset({
      is_paid: true,
      requires_approval: true,
      can_carry_forward: false,
      max_carry_forward_days: 0,
    });
    this.showCreateForm = true;
  }

  /** CANCEL */
  cancelCreate(): void {
    this.showCreateForm = false;
    this.isEditMode = false;
    this.selectedLeaveTypeId = null;
  }

  /** EDIT */
  editLeaveType(type: any): void {
    this.isEditMode = true;
    this.selectedLeaveTypeId = type.id;
    this.showCreateForm = true;

    this.leaveTypeForm.patchValue({
      type_name: type.type_name,
      type_code: type.type_code,
      is_paid: type.is_paid,
      requires_approval: type.requires_approval,
      can_carry_forward: type.can_carry_forward,
      max_carry_forward_days: type.max_carry_forward_days,
      description: type.description,
    });
  }

  /** CREATE / UPDATE */
  submit(): void {
    if (this.leaveTypeForm.invalid) {
      this.leaveTypeForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = this.leaveTypeForm.value;

    const request$ = this.isEditMode
      ? this.leaveTypesService.updateLeaveType(this.selectedLeaveTypeId!, payload)
      : this.leaveTypesService.createLeaveType(payload);

    request$.subscribe({
      next: async () => {
        this.loading = false;
        this.showCreateForm = false; // Close the modal on success
        this.isEditMode = false;
        this.selectedLeaveTypeId = null;
        this.loadLeaveTypes(); // Refresh the leave types immediately

        const toast = await this.toastCtrl.create({
          message: this.isEditMode
            ? 'Leave Type updated successfully'
            : 'Leave Type created successfully',
          duration: 2000,
          color: 'success',
        });
        toast.present();
      },
      error: async () => {
        this.loading = false;
        const toast = await this.toastCtrl.create({
          message: 'Operation failed',
          duration: 2000,
          color: 'danger',
        });
        toast.present();
      },
    });
  }

  /** GET LIST */
  loadLeaveTypes(): void {
    this.listLoading = true;

    this.leaveTypesService.getLeaveTypes().subscribe({
      next: (res) => {
        this.leaveTypes = res || [];
        this.listLoading = false;
      },
      error: () => {
        this.listLoading = false;
      },
    });
  }
  leavetype() {
    this.router.navigate(['./admin-leaves']);
  }
  adminManagement() {
    this.router.navigate(['./admin']);
  }
  ionViewWillEnter(): void {
    this.loadLeaveTypes();
  }
}
