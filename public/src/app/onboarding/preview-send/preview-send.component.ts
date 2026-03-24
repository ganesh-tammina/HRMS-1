import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CreateOfferHeaderComponent } from '../create-offer-header/create-offer-header.component';
import { HeaderComponent } from 'src/app/shared/header/header.component';
import { ActivatedRoute, Router } from '@angular/router';
import { CandidateDetailsService, OfferPayload } from 'src/app/services/candidate-details-service.service';
import { EmailService } from 'src/app/services/email.service';

@Component({
  selector: 'app-preview-send',
  templateUrl: './preview-send.component.html',
  styleUrls: ['./preview-send.component.scss'],
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    CreateOfferHeaderComponent,
    HeaderComponent]
})
export class PreviewSendComponent implements OnInit {
  @Input() candidate: any = {};
  // candidate: any = {};
  selectedOption = 'template';
  selectedTemplate = 'SVS';
  previewText = '';
  uploadedFileName: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private candidateService: CandidateDetailsService,
    private emailService: EmailService
  ) { }

  ngOnInit() {
    const nav = this.router.getCurrentNavigation();
    this.candidate = nav?.extras?.state?.['candidate'] || {};
    console.log('Final Candidate Data:', this.candidate);

    this.route.queryParams.subscribe(params => {
      if (!this.candidate && params['candidate']) {
        try {
          this.candidate = JSON.parse(params['candidate']);
        } catch (e) {
          console.warn('Failed to parse candidate', e);
        }
      }
    });

    this.updatePreview();
  }
  updatePreview() {
    if (this.selectedTemplate === 'SVS') {
      this.previewText = `
        Dear ${this.candidate.FirstName},
        <br><br>
        Welcome to <b>Tech Tammina Family</b>!! <br><br>
        It was a pleasure interacting with you during our hiring process and
        we believe you would make a great asset to Tech Tammina.
      `;
    } else {
      this.previewText = `
        Dear ${this.candidate.FirstName},
        <br><br>
        Welcome to <b>Tech Tammina Family</b>!! <br><br>
        We are excited to have you onboard and look forward to seeing the best of your capabilities.
      `;
    }
  }

  onOptionChange(event: any) {
    this.selectedOption = event.detail.value;
  }

  onTemplateChange(event: any) {
    this.selectedTemplate = event.detail.value;
    this.updatePreview();
  }

  onFileUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.uploadedFileName = file.name;
      this.previewText = `<b>Custom Offer Letter uploaded:</b> ${file.name}`;
    }
  }

  createOffer() {
    console.log('🚀 Final Offer Creation for:', this.candidate);

    // ✅ FIX: Prefer numeric `id` first; fall back to string `candidate_id` (e.g. 'CAN...')
    // Backend now handles both formats correctly.
    const candidateId = this.candidate.id || this.candidate.candidate_id;
    if (!candidateId) {
      alert('❌ Candidate ID not found!');
      return;
    }

    // Calculate offer_validity_date (Today + offerValidity days)
    const validityDays = parseInt(this.candidate.offerDetails?.offerValidity || this.candidate.offer_validity_date || '7', 10);
    const validityDate = new Date();
    validityDate.setDate(validityDate.getDate() + validityDays);
    const formattedValidityDate = validityDate.toISOString().split('T')[0];

    const offerPayload: OfferPayload = {
      position: this.candidate.JobTitle || this.candidate.position || 'Software Engineer',
      designation_id: this.candidate.designation_id || 1,
      department_id: this.candidate.department_id || 2,
      location_id: this.candidate.location_id || 1,
      reporting_manager_id: this.candidate.reporting_manager_id || 5,
      joining_date: this.candidate.joining_date || new Date().toISOString().split('T')[0],
      offered_ctc: this.candidate.offered_ctc || 800000,
      annual_salary: this.candidate.annual_salary || 800000,
      salary_breakup: this.candidate.salary_breakup || {
        basic: 400000,
        hra: 200000,
        special: 200000
      },
      offer_validity_date: formattedValidityDate,
      probation_period: parseInt(this.candidate.probation_period || '3', 10),
      notice_period: parseInt(this.candidate.notice_period || '2', 10),
      work_mode: this.candidate.work_mode || 'Hybrid',
      special_terms: this.candidate.special_terms || '',
      benefits: this.candidate.benefits || ''
    };

    console.log('📤 Using candidateId:', candidateId, '| Offer Payload:', offerPayload);

    this.candidateService.createOffer(candidateId, offerPayload).subscribe({
      next: (res: any) => {
        console.log('✅ Offer created successfully:', res);

        // ✅ Send welcome email to candidate
        this.emailService.sendEmail(this.candidate).subscribe({
          next: () => console.log('📧 Welcome email sent successfully'),
          error: (err) => console.error('📧 Email failed:', err)
        });

        alert('🎉 Offer letter created and email sent to candidate!');
        this.router.navigate(['/preonboarding-setup']);
      },
      error: (err: any) => {
        console.error('❌ Error creating offer:', err);
        const msg = err?.error?.error || err?.message || 'Unknown error';
        alert(`❌ Failed to create offer letter.\n\nDetails: ${msg}`);
      }
    });
  }
}
