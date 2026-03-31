import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { LeaveTypeService } from '../../../core/services/leavetype.service';

@Component({
  selector: 'app-leave-types',
  templateUrl: './leave-types.page.html',
  styleUrls: ['./leave-types.page.scss'],
  standalone: false
})
export class LeaveTypesPage implements OnInit {
  leaveTypeForm!: FormGroup;
  leaveTypes: any[] = [];
  loading = false;
  listLoading = false;
  showCreateForm = false;
  isEditMode = false;
  selectedLeaveTypeId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private leaveTypesService: LeaveTypeService,
    private toastCtrl: ToastController,
    private router: Router
  ) { }

  ngOnInit() {
    this.initForm();
    this.loadLeaveTypes();
  }

  private initForm() {
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

  loadLeaveTypes() {
    this.listLoading = true;
    this.leaveTypesService.getLeaveTypes().subscribe({
      next: (res) => {
        this.leaveTypes = res || [];
        this.listLoading = false;
      },
      error: () => this.listLoading = false
    });
  }

  openCreateForm() {
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

  editLeaveType(type: any) {
    this.isEditMode = true;
    this.selectedLeaveTypeId = type.id;
    this.leaveTypeForm.patchValue(type);
    this.showCreateForm = true;
  }

  submit() {
    if (this.leaveTypeForm.invalid) return;

    this.loading = true;
    const action = this.isEditMode 
      ? this.leaveTypesService.updateLeaveType(this.selectedLeaveTypeId!, this.leaveTypeForm.value)
      : this.leaveTypesService.createLeaveType(this.leaveTypeForm.value);

    action.subscribe({
      next: () => {
        this.showToast(`Leave type ${this.isEditMode ? 'updated' : 'created'} successfully`, 'success');
        this.loading = false;
        this.showCreateForm = false;
        this.loadLeaveTypes();
      },
      error: () => {
        this.loading = false;
        this.showToast('Operation failed', 'danger');
      }
    });
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color: color as any, position: 'top' });
    toast.present();
  }

  cancelCreate() {
    this.showCreateForm = false;
    this.isEditMode = false;
  }
}
