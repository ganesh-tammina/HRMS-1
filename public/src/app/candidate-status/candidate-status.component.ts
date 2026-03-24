import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-candidate-status',
  templateUrl: './candidate-status.component.html',
  styleUrls: ['./candidate-status.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule]
})
export class CandidateStatusComponent implements OnInit {
  candidate: any = null;
  loading = true;
  error = '';
  hideOffer = false;
  onboardingForms!: FormGroup;

  private apiBase = `http://${environment.apiURL}/api/candidates`;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private alertController: AlertController,
    private fb: FormBuilder
  ) { }

  ngOnInit() {
    this.onboardingForms = this.fb.group({
      PhoneNumber: ['', [Validators.required, Validators.minLength(10)]]
    });

    // Read candidate_id from URL e.g. /candidate_status/CAN1772533410481
    const candidateId = this.route.snapshot.paramMap.get('id');
    console.log('📌 Candidate ID from URL:', candidateId);

    if (!candidateId) {
      this.loading = false;
      this.error = 'Invalid offer link. No candidate ID found.';
      return;
    }

    // Fetch candidate from backend using the candidate_id string (no auth required)
    this.http.get<any>(`${this.apiBase}/${candidateId}`).subscribe({
      next: (res) => {
        // Backend returns { candidate: {...}, documents: [...], tasks: [...] }
        const c = res?.candidate || res;
        // Normalize field names for consistent template use
        this.candidate = {
          ...c,
          FirstName: c.first_name || c.FirstName,
          LastName: c.last_name || c.LastName,
          FullName: c.full_name || c.FullName || `${c.first_name} ${c.last_name}`.trim(),
          Email: c.email || c.Email,
          PhoneNumber: c.phone || c.PhoneNumber,
          JobTitle: c.position || c.designation_name || c.JobTitle,
          Department: c.department_name || c.Department,
          joining_date: c.joining_date,
          offered_ctc: c.offered_ctc,
          candidate_id: c.candidate_id,
          id: c.id
        };

        // Fallback for name if it's in query parameters (optional UX improvement)
        const nameFromQuery = this.route.snapshot.queryParamMap.get('name');
        if (nameFromQuery && !this.candidate.FirstName) {
          this.candidate.FirstName = nameFromQuery;
        }

        console.log('✅ Candidate loaded:', this.candidate);
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Failed to load candidate:', err);
        this.loading = false;
        this.error = 'Could not find your offer. The link may be invalid or expired.';
      }
    });
  }

  /** Verify phone number and navigate to offer letter */
  submitOnboarding() {
    if (this.onboardingForms.invalid) return;

    const enteredPhone = this.onboardingForms.value.PhoneNumber?.toString().trim();
    const actualPhone = (this.candidate?.PhoneNumber || this.candidate?.phone || '')?.toString().trim();

    console.log('🔍 Phone verify — entered:', enteredPhone, 'actual:', actualPhone);

    if (enteredPhone === actualPhone) {
      console.log('✅ Phone verified. Navigating to offer letter...');
      this.router.navigate(
        ['/candidate-offer-letter', this.candidate.candidate_id],
        { state: { candidate: this.candidate } }
      );
    } else {
      this.showAlert('Phone number does not match our records.\nPlease enter the mobile number you registered with.');
    }
  }

  async showAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Verification Failed',
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}
