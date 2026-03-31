import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ActionSheetController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { CandidateService } from '../../../core/services/candidate.service';
import { PreonboardingService } from '../../../core/services/preonboarding.service';
import { ToasterService } from '../../../core/services/toaster.service';

@Component({
    selector: 'app-preonboarding-detail',
    templateUrl: './preonboarding-detail.component.html',
    styleUrls: ['./preonboarding-detail.component.scss'],
    standalone: false
})
export class PreonboardingDetailComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    candidateId: number | null = null;
    candidate: any = null;
    preonboardingTasks: any[] = [];
    progress: any = null;
    documents: any[] = [];
    isLoading = true;
    selectedSegment = 'overview';

    // File upload
    selectedFile: File | null = null;
    uploadingDocument = false;
    documentType = 'resume';

    // Offer form
    showOfferForm = false;
    offerData: any = {
        position: '',
        designation_id: '',
        department_id: '',
        location_id: '',
        reporting_manager_id: '',
        joining_date: '',
        offered_ctc: '',
        annual_salary: '',
        salary_breakup: { basic: '', hra: '', special: '' },
        offer_validity_date: '',
        probation_period: 3,
        notice_period: 2,
        work_mode: 'Hybrid',
        special_terms: '',
        benefits: ''
    };

    documentTypes = [
        { label: 'Resume', value: 'resume' },
        { label: 'Aadhar', value: 'aadhar' },
        { label: 'PAN Card', value: 'pancard' },
        { label: 'Driving License', value: 'driving_license' },
        { label: 'Passport', value: 'passport' },
        { label: 'Education Certificate', value: 'education_certificate' },
        { label: 'Experience Letter', value: 'experience_letter' },
        { label: 'Medical Report', value: 'medical_report' }
    ];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private candidateService: CandidateService,
        private preonboardingService: PreonboardingService,
        private toasterService: ToasterService,
        private alertController: AlertController,
        private actionSheetController: ActionSheetController
    ) { }

    ngOnInit(): void {
        this.candidateId = Number(this.route.snapshot.paramMap.get('candidateId'));
        if (this.candidateId) {
            this.loadData();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadData(): void {
        if (!this.candidateId) return;

        this.isLoading = true;

        this.candidateService.getCandidateById(this.candidateId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response) {
                        // Handle both wrapped and flat responses
                        this.candidate = response.candidate || response.data || (response.id ? response : null);
                        this.documents = response.documents || (this.candidate?.documents) || [];
                    }
                },
                error: (err) => {
                    console.error('Error loading candidate:', err);
                    this.toasterService.showError('Failed to load candidate details');
                }
            });

        this.preonboardingService.getProgress(this.candidateId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response) {
                        const data = response.data || response;
                        this.preonboardingTasks = data.tasks || [];
                        this.progress = data.progress || data.stats || {};
                    }
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('Error loading pre-onboarding progress:', err);
                    this.isLoading = false;
                }
            });
    }

    getStatusColor(status: string): string {
        const statusColorMap: { [key: string]: string } = {
            'pending': 'warning',
            'in_progress': 'primary',
            'completed': 'success',
            'rejected': 'danger',
            'offer_created': 'warning',
            'offer_approved': 'success',
            'documents_pending': 'danger',
            'bgv_pending': 'warning',
            'ready_to_join': 'success'
        };
        return statusColorMap[status] || 'medium';
    }

    getProgressPercentage(): number {
        // Priority 1: Use percentage from API stats
        if (this.progress && this.progress.completion_percentage !== undefined) {
            return Number(this.progress.completion_percentage);
        }

        // Fallback: Calculate manually from tasks array
        if (!this.preonboardingTasks || this.preonboardingTasks.length === 0) return 0;
        const completedTasks = this.preonboardingTasks.filter(t => t.status === 'completed').length;
        return Math.round((completedTasks / this.preonboardingTasks.length) * 100);
    }

    onSegmentChange(event: any): void {
        this.selectedSegment = event.detail.value;
    }

    // ===== OVERVIEW ACTIONS =====

    startPreonboarding(): void {
        if (!this.candidateId) return;

        this.candidateService.startPreonboarding(this.candidateId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.toasterService.showSuccess('Pre-onboarding started');
                    this.loadData();
                },
                error: (err) => {
                    console.error('Error starting pre-onboarding:', err);
                    this.toasterService.showError('Failed to start pre-onboarding');
                }
            });
    }

    // ===== OFFER MANAGEMENT =====

    openOfferForm(): void {
        this.showOfferForm = !this.showOfferForm;
        if (this.showOfferForm && this.candidate) {
            this.offerData.position = this.candidate.position || '';
            this.offerData.designation_id = this.candidate.designation_id || '';
            this.offerData.department_id = this.candidate.department_id || '';
            this.offerData.location_id = this.candidate.location_id || '';
            this.offerData.reporting_manager_id = this.candidate.reporting_manager_id || '';
            this.offerData.joining_date = this.candidate.joining_date || '';
            this.offerData.offered_ctc = this.candidate.offered_ctc || '';

            // Auto-calculate basic if empty (example: 40% of CTC)
            if (this.offerData.offered_ctc) {
                const annual = Number(this.offerData.offered_ctc);
                this.offerData.annual_salary = annual;
                this.offerData.salary_breakup.basic = Math.round(annual * 0.4 / 12);
                this.offerData.salary_breakup.hra = Math.round(annual * 0.2 / 12);
                this.offerData.salary_breakup.special = Math.round((annual / 12) - this.offerData.salary_breakup.basic - this.offerData.salary_breakup.hra);
            }

            // Default offer validity to 7 days from now
            const validityDate = new Date();
            validityDate.setDate(validityDate.getDate() + 7);
            this.offerData.offer_validity_date = validityDate.toISOString();
        }
    }

    createOffer(): void {
        if (!this.candidateId) return;

        const payload = {
            ...this.offerData,
            // Format dates to YYYY-MM-DD for MySQL
            joining_date: this.offerData.joining_date ? (typeof this.offerData.joining_date === 'string' ? this.offerData.joining_date.split('T')[0] : this.offerData.joining_date) : null,
            offer_validity_date: this.offerData.offer_validity_date ? (typeof this.offerData.offer_validity_date === 'string' ? this.offerData.offer_validity_date.split('T')[0] : this.offerData.offer_validity_date) : null,
            offered_ctc: Number(this.offerData.offered_ctc),
            annual_salary: Number(this.offerData.annual_salary),
            salary_breakup: {
                basic: Number(this.offerData.salary_breakup.basic),
                hra: Number(this.offerData.salary_breakup.hra),
                special: Number(this.offerData.salary_breakup.special)
            },
            probation_period: Number(this.offerData.probation_period),
            notice_period: Number(this.offerData.notice_period)
        };

        this.candidateService.createOffer(this.candidateId, payload)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.toasterService.showSuccess('Offer created successfully');
                    this.showOfferForm = false;
                    this.loadData();
                },
                error: (err) => {
                    console.error('Error creating offer:', err);
                    this.toasterService.showError(err.error?.message || 'Failed to create offer');
                }
            });
    }

    sendOffer(): void {
        if (!this.candidateId) return;

        this.candidateService.sendOffer(this.candidateId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.toasterService.showSuccess('Offer sent to candidate');
                    this.loadData();
                },
                error: (err) => {
                    console.error('Error sending offer:', err);
                    this.toasterService.showError('Failed to send offer');
                }
            });
    }

    // ===== DOCUMENT MANAGEMENT =====

    onFileSelected(event: any): void {
        const files = event.target.files;
        if (files && files.length > 0) {
            this.selectedFile = files[0];
        }
    }

    uploadDocument(): void {
        if (!this.candidateId || !this.selectedFile) {
            this.toasterService.showError('Please select a file');
            return;
        }

        this.uploadingDocument = true;

        this.candidateService.uploadDocument(this.candidateId, this.selectedFile, this.documentType, true)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.toasterService.showSuccess('Document uploaded successfully');
                    this.selectedFile = null;
                    this.uploadingDocument = false;
                    this.loadData();
                },
                error: (err) => {
                    this.uploadingDocument = false;
                    console.error('Error uploading document:', err);
                    this.toasterService.showError('Failed to upload document');
                }
            });
    }

    verifyDocument(documentId: number): void {
        this.alertController.create({
            header: 'Verify Document',
            message: 'Add remarks for document verification',
            inputs: [
                {
                    name: 'remarks',
                    type: 'textarea',
                    placeholder: 'Enter verification remarks'
                }
            ],
            buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel'
                },
                {
                    text: 'Verify',
                    handler: (data) => {
                        const remarks = data.remarks || 'Document verified successfully';
                        this.candidateService.verifyDocument(documentId, remarks)
                            .pipe(takeUntil(this.destroy$))
                            .subscribe({
                                next: () => {
                                    this.toasterService.showSuccess('Document verified');
                                    this.loadData();
                                },
                                error: (err) => {
                                    console.error('Error verifying document:', err);
                                    this.toasterService.showError('Failed to verify document');
                                }
                            });
                    }
                }
            ]
        }).then(alert => alert.present());
    }

    // ===== BGV MANAGEMENT =====

    initiateBGV(): void {
        if (!this.candidateId) return;

        this.actionSheetController.create({
            header: 'Initiate BGV',
            buttons: [
                {
                    text: 'Confirm BGV Initiation',
                    icon: 'checkmark-circle',
                    handler: () => {
                        this.candidateService.initiateBGV(this.candidateId!)
                            .pipe(takeUntil(this.destroy$))
                            .subscribe({
                                next: () => {
                                    this.toasterService.showSuccess('BGV initiated successfully');
                                    this.loadData();
                                },
                                error: (err) => {
                                    console.error('Error initiating BGV:', err);
                                    this.toasterService.showError('Failed to initiate BGV');
                                }
                            });
                    }
                },
                {
                    text: 'Cancel',
                    icon: 'close',
                    role: 'cancel'
                }
            ]
        }).then(sheet => sheet.present());
    }

    updateBGVStatus(status: string): void {
        if (!this.candidateId) return;

        const statusLabel = status === 'completed' ? 'Completed' : status;

        this.alertController.create({
            header: `Mark BGV as ${statusLabel}`,
            message: 'Add remarks for BGV status update',
            inputs: [
                {
                    name: 'remarks',
                    type: 'textarea',
                    placeholder: 'Enter BGV remarks'
                }
            ],
            buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel'
                },
                {
                    text: 'Update',
                    handler: (data) => {
                        const remarks = data.remarks || 'BGV status updated';
                        this.candidateService.updateBGVStatus(this.candidateId!, status, remarks)
                            .pipe(takeUntil(this.destroy$))
                            .subscribe({
                                next: () => {
                                    this.toasterService.showSuccess('BGV status updated');
                                    this.loadData();
                                },
                                error: (err) => {
                                    console.error('Error updating BGV status:', err);
                                    this.toasterService.showError('Failed to update BGV status');
                                }
                            });
                    }
                }
            ]
        }).then(alert => alert.present());
    }

    // ===== FINAL STEPS =====

    hireAsEmployee(): void {
        if (!this.candidateId) return;

        this.alertController.create({
            header: 'Hire as Employee',
            message: 'This will convert the candidate to an employee. Proceed?',
            inputs: [
                {
                    name: 'employee_number',
                    type: 'text',
                    placeholder: 'Enter Employee Number (e.g., EMP001)'
                }
            ],
            buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel'
                },
                {
                    text: 'Confirm',
                    handler: (data) => {
                        if (!data.employee_number) {
                            this.toasterService.showError('Please enter employee number');
                            return false;
                        }
                        this.candidateService.convertToEmployee(this.candidateId!, data.employee_number)
                            .pipe(takeUntil(this.destroy$))
                            .subscribe({
                                next: () => {
                                    this.toasterService.showSuccess('Candidate converted to employee');
                                    this.router.navigate(['/onboarding/preonboarding']);
                                },
                                error: (err) => {
                                    console.error('Error hiring candidate:', err);
                                    this.toasterService.showError('Failed to hire candidate');
                                }
                            });
                        return true;
                    }
                }
            ]
        }).then(alert => alert.present());
    }

    putOnHold(): void {
        if (!this.candidateId) return;

        this.alertController.create({
            header: 'Put on Hold',
            message: 'Provide reason for putting candidate on hold',
            inputs: [
                {
                    name: 'reason',
                    type: 'textarea',
                    placeholder: 'Enter reason'
                }
            ],
            buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel'
                },
                {
                    text: 'Confirm',
                    handler: (data) => {
                        const reason = data.reason || 'Candidate put on hold';
                        this.candidateService.putOnHold(this.candidateId!, reason)
                            .pipe(takeUntil(this.destroy$))
                            .subscribe({
                                next: () => {
                                    this.toasterService.showSuccess('Candidate put on hold');
                                    this.loadData();
                                },
                                error: (err) => {
                                    console.error('Error putting candidate on hold:', err);
                                    this.toasterService.showError('Failed to put on hold');
                                }
                            });
                    }
                }
            ]
        }).then(alert => alert.present());
    }

    // ===== TASK MANAGEMENT =====

    completeTask(task: any): void {
        if (!this.candidateId) return;

        const newStatus = task.status === 'completed' ? 'pending' : 'completed';

        this.preonboardingService.updateProgress(this.candidateId, newStatus, `Task: ${task.task_name}`)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.toasterService.showSuccess('Task status updated');
                    this.loadData();
                },
                error: (err) => {
                    console.error('Error updating task:', err);
                    this.toasterService.showError('Failed to update task');
                }
            });
    }

    // ===== UTILITY METHODS =====

    compareSelect(a: any, b: any): boolean {
        return a === b;
    }
}
