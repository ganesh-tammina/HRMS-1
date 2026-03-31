import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalController, AlertController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CandidateService } from '../../../core/services/candidate.service';
import { ToasterService } from '../../../core/services/toaster.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-create-candidate-modal',
    templateUrl: './create-candidate-modal.component.html',
    styleUrls: ['./create-candidate-modal.component.scss'],
    standalone: false
})
export class CreateCandidateModalComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    candidateForm!: FormGroup;
    isSubmitting = false;
    isLoadingMasterData = false;

    // Master data
    departments: any[] = [];
    locations: any[] = [];
    designations: any[] = [];
    reportingManagers: any[] = [];

    // Static options
    genderOptions = ['Male', 'Female', 'Other'];
    sources = ['LinkedIn', 'Referral', 'Job Portal', 'Walk-in', 'Interview', 'Other'];

    constructor(
        private modalController: ModalController,
        private formBuilder: FormBuilder,
        private candidateService: CandidateService,
        private toasterService: ToasterService,
        private alertController: AlertController
    ) { }

    ngOnInit(): void {
        this.initializeForm();
        this.loadMasterData();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    initializeForm(): void {
        this.candidateForm = this.formBuilder.group({
            first_name: ['', [Validators.required, Validators.minLength(2)]],
            middle_name: [''],
            last_name: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]],
            phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
            alternate_phone: ['', Validators.pattern(/^\d{10}$/)],
            date_of_birth: ['', Validators.required],
            gender: ['', Validators.required],
            position: ['', Validators.required],
            designation_id: ['', Validators.required],
            department_id: ['', Validators.required],
            location_id: ['', Validators.required],
            offered_ctc: ['', [Validators.required, Validators.min(100000)]],
            joining_date: ['', Validators.required],
            reporting_manager_id: [''],
            recruiter_name: [''],
            recruitment_source: ['', Validators.required]
        });
    }

    loadMasterData(): void {
        this.isLoadingMasterData = true;

        // Load all master data in parallel
        this.candidateService.getDepartments()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.departments = Array.isArray(response) ? response : response.data || [];
                },
                error: (err) => {
                    console.error('Error loading departments:', err);
                    this.toasterService.showError('Failed to load departments');
                }
            });

        this.candidateService.getLocations()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.locations = Array.isArray(response) ? response : response.data || [];
                },
                error: (err) => {
                    console.error('Error loading locations:', err);
                    this.toasterService.showError('Failed to load locations');
                }
            });

        this.candidateService.getDesignations()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.designations = Array.isArray(response) ? response : response.data || [];
                },
                error: (err) => {
                    console.error('Error loading designations:', err);
                    this.toasterService.showError('Failed to load designations');
                }
            });

        this.candidateService.getEmployees()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    const employees = Array.isArray(response) ? response : response.data || [];
                    // Filter to get employees that can be reporting managers
                    this.reportingManagers = employees.map((emp: any) => ({
                        id: emp.id,
                        employee_number: emp.EmployeeNumber,
                        first_name: emp.FirstName,
                        last_name: emp.LastName,
                        full_name: `${emp.FirstName} ${emp.LastName}`,
                        designation: emp.designation_name || emp.DesignationId
                    }));
                    this.isLoadingMasterData = false;
                },
                error: (err) => {
                    console.error('Error loading employees:', err);
                    this.toasterService.showError('Failed to load reporting managers');
                    this.isLoadingMasterData = false;
                }
            });
    }

    get f(): any {
        return this.candidateForm.controls;
    }

    dismiss(): void {
        this.modalController.dismiss();
    }

    compareSelect(a: any, b: any): boolean {
        return a === b || (a && b ? a.id === b.id : false);
    }

    onSubmit(): void {
        if (this.candidateForm.invalid) {
            this.toasterService.showError('Please fill all required fields');
            return;
        }

        this.isSubmitting = true;

        const formData = this.candidateForm.value;
        const candidateData = {
            ...formData,
            // Format dates to YYYY-MM-DD for MySQL
            date_of_birth: formData.date_of_birth ? formData.date_of_birth.split('T')[0] : null,
            joining_date: formData.joining_date ? formData.joining_date.split('T')[0] : null,
            // Convert selected objects to IDs if needed
            department_id: formData.department_id?.id || formData.department_id,
            location_id: formData.location_id?.id || formData.location_id,
            designation_id: formData.designation_id?.id || formData.designation_id,
            reporting_manager_id: formData.reporting_manager_id?.id || formData.reporting_manager_id || null,
            full_name: `${formData.first_name}${formData.middle_name ? ' ' + formData.middle_name : ''} ${formData.last_name}`.trim()
        };

        this.candidateService.createCandidate(candidateData).subscribe({
            next: (response) => {
                this.isSubmitting = false;
                this.toasterService.showSuccess('Candidate created successfully');
                this.modalController.dismiss(response.data);
            },
            error: (err) => {
                this.isSubmitting = false;
                console.error('Error creating candidate:', err);
                this.toasterService.showError(err.error?.message || 'Failed to create candidate');
            }
        });
    }
}
