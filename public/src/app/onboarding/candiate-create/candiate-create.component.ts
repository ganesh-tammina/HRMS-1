import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Candidate_Create_Service } from 'src/app/services/Candidate/candidate.service';
import { AdminService } from 'src/app/services/admin-functionality/admin.service.service';

@Component({
  selector: 'app-candiate-create',
  standalone: true,
  templateUrl: './candiate-create.component.html',
  styleUrls: ['./candiate-create.component.scss'],
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
})
export class CandiateCreateComponent implements OnInit, OnDestroy {

  candidateForm!: FormGroup;
  submitting = false;
  maxDOB = new Date().toISOString();
  designations: any[] = [];
  departments: any[] = [];
  locations: any[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private candidateService: Candidate_Create_Service,
    private adminService: AdminService
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.loadMasters();
    this.autoFullName();
  }

  /* ================= FORM ================= */
  initForm() {
    this.candidateForm = this.fb.group({
      first_name: ['', Validators.required],
      middle_name: [''],
      last_name: ['', Validators.required],
      full_name: [{ value: '', disabled: true }],

      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      alternate_phone: [''],

      gender: ['', Validators.required],

      designation_id: [null, Validators.required],
      department_id: [null, Validators.required],
      location_id: [null, Validators.required],

      // 🔽 NEXT STEP FIELDS (NOT REQUIRED NOW)
      date_of_birth: [''],
      position: [''],
      reporting_manager_id: null,
      recruiter_name: '',

      offered_ctc: null,
      // joining_date: '',

      recruitment_source: ['LinkedIn']
    });
  }

  /* ================= LOAD MASTERS ================= */
  loadMasters() {
    this.adminService.getDesignations()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => this.designations = res);

    this.adminService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => this.departments = res);

    this.adminService.getLocations()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => this.locations = res);
  }

  /* ================= AUTO FULL NAME ================= */
  autoFullName() {
    this.candidateForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(val => {
        const fullName = [val.first_name, val.middle_name, val.last_name]
          .filter(Boolean)
          .join(' ');
        this.candidateForm.get('full_name')
          ?.setValue(fullName, { emitEvent: false });
      });
  }

  /* ================= SUBMIT ================= */
  submitForm() {
    if (this.candidateForm.invalid) {
      this.candidateForm.markAllAsTouched();
      this.showToast('Please fill all required fields', 'danger');
      return;
    }

    this.submitting = true;

    const payload = this.candidateForm.getRawValue();

    // ✅ Save locally for pre-onboarding
    localStorage.setItem(
      'candidate_preonboarding',
      JSON.stringify(payload)
    );

    this.candidateService.createCandidate(payload).subscribe({
      next: async (res) => {
        this.submitting = false;
        await this.showToast('Candidate saved successfully', 'success');

        this.modalCtrl.dismiss({
          created: true,
          data: res
        });
      },
      error: async (err) => {
        this.submitting = false;
        await this.showToast(
          err?.error?.message || 'Failed to save candidate',
          'danger'
        );
      }
    });
  }

  /* ================= TOAST ================= */
  async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'top',
      color
    });
    await toast.present();
  }

  close() {
    this.modalCtrl.dismiss();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
