import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { PayrollService } from '../My_Finance/payroll-service.service';

@Component({
  selector: 'app-candidate-offer-letter',
  templateUrl: './candidate-offer-letter.component.html',
  styleUrls: ['./candidate-offer-letter.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class CandidateOfferLetterComponent implements OnInit {
  candidate: any = null;
  loading = true;
  error = '';
  acceptDisabled = false;
  rejectDisabled = false;
  offerStatus: 'pending' | 'accepted' | 'rejected' = 'pending';

  // Salary Breakdown properties
  earnings: any[] = [];
  contributions: any[] = [];
  taxes: any[] = [];
  totalEarnings: number = 0;
  totalContributions: number = 0;
  totalTaxes: number = 0;
  employerPortions: number = 0;
  netSalary: number = 0;
  netSalaryInWords: string = '';
  salaryStructure: any = {};

  private apiBase = `http://${environment.apiURL}/api/candidates`;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private alertController: AlertController,
    private payrollService: PayrollService
  ) { }

  ngOnInit() {
    // Try navigation state first (passed from CandidateStatusComponent)
    const nav = this.router.getCurrentNavigation();
    const stateCandidate = nav?.extras?.state?.['candidate'];

    if (stateCandidate) {
      this.candidate = stateCandidate;
      this.loading = false;
      console.log('✅ Candidate from nav state:', this.candidate);
      return;
    }

    // Fallback: fetch from backend using route param (when user refreshes)
    const candidateId = this.route.snapshot.paramMap.get('id');
    if (!candidateId) {
      this.loading = false;
      this.error = 'Invalid offer link.';
      return;
    }

    this.http.get<any>(`${this.apiBase}/${candidateId}`).subscribe({
      next: (res) => {
        const c = res?.candidate || res;
        this.candidate = {
          ...c,
          FirstName: c.first_name || c.FirstName,
          LastName: c.last_name || c.LastName,
          Email: c.email || c.Email,
          PhoneNumber: c.phone || c.PhoneNumber,
          JobTitle: c.position || c.designation_name || c.JobTitle,
          Department: c.department_name || c.Department,
          joining_date: c.joining_date,
          offered_ctc: c.offered_ctc,
          candidate_id: c.candidate_id,
          id: c.id
        };
        this.loading = false;
        console.log('✅ Candidate fetched from backend:', this.candidate);

        // Calculate breakdown after fetching candidate
        this.fetchComponentsAndCalculate();
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Could not load offer details. Please try again.';
        console.error('❌ Error loading candidate:', err);
      }
    });
  }

  // ──────────────────────────────
  // Accept Offer
  // ──────────────────────────────
  async acceptOffer() {
    this.acceptDisabled = true;
    this.rejectDisabled = true;

    const candidateId = this.candidate?.candidate_id || this.candidate?.id;

    this.http.post<any>(`${this.apiBase}/${candidateId}/accept-offer`, {}).subscribe({
      next: async () => {
        this.offerStatus = 'accepted';
        const alert = await this.alertController.create({
          header: '🎉 Offer Accepted!',
          message: `Welcome aboard, ${this.candidate.FirstName}! We're excited to have you join us. Our HR team will be in touch with the next steps.`,
          buttons: ['OK']
        });
        await alert.present();
      },
      error: async (err) => {
        console.error('❌ Accept error:', err);
        this.acceptDisabled = false;
        this.rejectDisabled = false;
        const alert = await this.alertController.create({
          header: 'Error',
          message: 'Could not accept offer. Please try again or contact HR.',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  // ──────────────────────────────
  // Reject Offer
  // ──────────────────────────────
  async rejectOffer() {
    const confirmAlert = await this.alertController.create({
      header: 'Decline Offer',
      message: 'Are you sure you want to decline this offer? This action cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Yes, Decline',
          role: 'destructive',
          handler: () => this.doReject()
        }
      ]
    });
    await confirmAlert.present();
  }

  private async doReject() {
    this.acceptDisabled = true;
    this.rejectDisabled = true;

    const candidateId = this.candidate?.candidate_id || this.candidate?.id;

    this.http.post<any>(`${this.apiBase}/${candidateId}/decline-offer`, { reason: 'Candidate declined via portal' }).subscribe({
      next: async () => {
        this.offerStatus = 'rejected';
        const alert = await this.alertController.create({
          header: 'Offer Declined',
          message: 'You have declined the offer. Thank you for your time and interest in Tech Tammina.',
          buttons: ['OK']
        });
        await alert.present();
      },
      error: async (err) => {
        console.error('❌ Reject error:', err);
        this.acceptDisabled = false;
        this.rejectDisabled = false;
        const alert = await this.alertController.create({
          header: 'Error',
          message: 'Could not process your response. Please try again or contact HR.',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  fetchComponentsAndCalculate() {
    this.payrollService.getPayrollComponents().subscribe((res: any) => {
      const components = Array.isArray(res) ? res : (res.data || []);
      this.calculateBreakdown(this.candidate.offered_ctc, components);
    });
  }

  calculateBreakdown(ctc: number, components: any[]) {
    if (!components || components.length === 0) return;

    const calculatedAmts: any = { 'CTC': ctc };
    const sortedComps = [...components].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

    // Pass 1: FIXED and PERCENTAGE OF CTC
    sortedComps.forEach(c => {
      if (c.calculation_type === 'FIXED') {
        calculatedAmts[c.code] = Number(c.value) || 0;
      } else if (c.calculation_type === 'PERCENTAGE' && (c.percentage_of_code === 'CTC' || !c.percentage_of_code)) {
        calculatedAmts[c.code] = (ctc * (Number(c.value) || 0)) / 100;
      }
    });

    // Pass 2: PERCENTAGE OF others
    sortedComps.forEach(c => {
      if (c.calculation_type === 'PERCENTAGE' && c.percentage_of_code && c.percentage_of_code !== 'CTC') {
        const baseAmt = calculatedAmts[c.percentage_of_code] || 0;
        calculatedAmts[c.code] = (baseAmt * (Number(c.value) || 0)) / 100;
      }
    });

    // Pass 3: ESI Employer
    sortedComps.forEach(c => {
      const code = (c.code || '').toUpperCase();
      if (code.includes('ESI') && (code.includes('ER') || code.includes('EMPLOYER'))) {
        let pfm = 0;
        Object.keys(calculatedAmts).forEach(k => {
          if (k.toUpperCase().includes('PF') && (k.toUpperCase().includes('ER') || k.toUpperCase().includes('EMPLOYER'))) {
            pfm = calculatedAmts[k];
          }
        });
        calculatedAmts[c.code] = (ctc - pfm) * (3.25 / 103.25);
      }
    });

    // Pass 4: Special Allowance (SA) - Absorbs remainder
    const saComp = sortedComps.find(c => c.code.toUpperCase() === 'SA' || c.name.toUpperCase().includes('SPECIAL'));
    if (saComp) {
      let otherEarnings = 0;
      let erTotal = 0;
      sortedComps.forEach(c => {
        if (c.code === saComp.code) return;
        const code = c.code.toUpperCase();
        const isER = code.includes('ER') || code.includes('EMPLOYER');
        if (c.component_type?.toUpperCase() === 'EARNING') otherEarnings += calculatedAmts[c.code] || 0;
        if (isER) erTotal += calculatedAmts[c.code] || 0;
      });
      calculatedAmts[saComp.code] = Math.max(0, ctc - otherEarnings - erTotal);
    }

    // Display lists
    this.earnings = [];
    this.contributions = [];
    this.taxes = [];
    this.totalEarnings = 0;
    this.totalContributions = 0;
    this.totalTaxes = 0;
    this.employerPortions = 0;

    // 1. Calculate Employer portions total first
    sortedComps.forEach(c => {
      const code = (c.code || '').toUpperCase();
      const isER = code.includes('ER') || code.includes('EMPLOYER');
      if (isER) this.employerPortions += (calculatedAmts[c.code] || 0);
    });

    // 2. Populate lists
    sortedComps.forEach(c => {
      const code = c.code.toUpperCase();
      const name = c.name.toUpperCase();
      const isER = code.includes('ER') || code.includes('EMPLOYER');

      const annualVal = calculatedAmts[c.code] || 0;
      let monthlyVal = annualVal / 12;

      // Special allowance display logic (if needed)
      if (saComp && c.code === saComp.code) {
        monthlyVal -= (this.employerPortions / 12);
      }

      const item = { name: c.name, annual: annualVal, monthly: monthlyVal, isER };

      if (c.component_type?.toUpperCase() === 'EARNING') {
        this.earnings.push(item);
        this.totalEarnings += monthlyVal;
      } else if (!isER) {
        const isTax = code.includes('TAX') || name.includes('TAX') || code === 'PT' || name.includes('PROFESSIONAL');
        if (isTax) {
          this.taxes.push(item);
          this.totalTaxes += monthlyVal;
        } else {
          this.contributions.push(item);
          this.totalContributions += monthlyVal;
        }
      }
    });

    this.netSalary = this.totalEarnings - this.totalContributions - this.totalTaxes;
    this.netSalaryInWords = this.numberToWords(this.netSalary);

    this.salaryStructure = {
      total: ctc,
      monthlyTotal: ctc / 12,
      netSalary: this.netSalary,
      netSalaryInWords: this.netSalaryInWords
    };
  }

  numberToWords(num: number): string {
    const a = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six',
      'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
      'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen',
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero Rupees only';

    let words = '';
    let n = Math.floor(num);

    if (Math.floor(n / 1000) > 0) {
      words += a[Math.floor(n / 1000)] + ' Thousand ';
      n %= 1000;
    }

    if (Math.floor(n / 100) > 0) {
      words += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }

    if (n > 0) {
      if (n < 20) words += a[n];
      else words += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    }

    return words.trim() + ' Rupees only';
  }
}
