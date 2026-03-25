import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CandidateService } from 'src/app/services/pre-onboarding.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CreateOfferHeaderComponent } from '../create-offer-header/create-offer-header.component';
import { OnboardingMainheaderComponent } from '../onboarding-mainheader/onboarding-mainheader.component';
import { HeaderComponent } from 'src/app/shared/header/header.component';
import { EmailService } from 'src/app/services/email.service';
import { salaryStaructureComponent } from '../../salary-staructure/salary-staructure.component';


@Component({
  selector: 'app-compensation',
  templateUrl: './compensation.component.html',
  styleUrls: ['./compensation.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, HeaderComponent,
    OnboardingMainheaderComponent, salaryStaructureComponent,
    CreateOfferHeaderComponent, ReactiveFormsModule]
})
export class CompensationComponent implements OnInit {
  candidate: any = {};
  id: string | null = null;
  credentialsForm!: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private candidateService: CandidateService,
    private fb: FormBuilder,
    private email: EmailService
  ) { }

  ngOnInit() {
    // Get candidate object from router state
    const nav = this.router.getCurrentNavigation();
    this.candidate = nav?.extras.state?.['candidate'] || {};
    console.log('candidate', this.candidate);

    // Initialize employeeCredentials if it doesn't exist
    if (!this.candidate.employeeCredentials) {
      this.candidate.employeeCredentials = {
        companyEmail: '',
        password: ''
      };
    }

    // Initialize Reactive Form
    this.credentialsForm = this.fb.group({
      companyEmail: [this.candidate.employeeCredentials.companyEmail || '', [Validators.required, Validators.email]],
      password: [this.candidate.employeeCredentials.password || '', [Validators.required, Validators.minLength(6)]]
    });

    // Get candidate ID from route
    this.id = this.route.snapshot.paramMap.get('id');
  }

  saveEmployeeCredentials() {
    if (this.credentialsForm.valid) {
      // Update candidate object
      this.candidate.employeeCredentials = this.credentialsForm.value;

      // Call service to update candidate
      // this.email.sendEmail(this.candidate).subscribe({
      //   next: (res) => {
      //     if (res.success) {
      //       this.candidateService.updateCandidate(this.candidate).subscribe({
      //         next: (res) => {
      //           console.log('Candidate updated with credentials:', res);
      //           alert('Employee credentials saved and mail sent successfully!');
      //         },
      //         error: (err) => {
      //           console.error('Error saving credentials:', err);
      //           alert('Failed to save employee credentials.');
      //         }
      //       });
      //     } else {
      //     }
      //   }
      // });

    } else {
      alert('Please fill all required fields correctly!');
    }
  }
}
