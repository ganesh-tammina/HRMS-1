import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CreateOfferHeaderComponent } from '../onboarding/create-offer-header/create-offer-header.component';
import { CandidateDetailsService } from '../services/candidate-details-service.service';

@Component({
  selector: 'app-salary-structure',
  templateUrl: './salary-staructure.component.html',
  styleUrls: ['./salary-staructure.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CreateOfferHeaderComponent,
    ReactiveFormsModule,
  ],
})
export class salaryStaructureComponent implements OnInit {
  salaryForm!: FormGroup;
  salaryStructure: any = {};
  candidate: any = {};

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private candidateService: CandidateDetailsService
  ) {
    const nav = this.router.getCurrentNavigation();
    this.candidate = nav?.extras.state?.['candidate'] || {};
    console.log('📋 Candidate:', this.candidate);
  }

  ngOnInit() {
    if (!this.candidate.packageDetails) {
      this.candidate.packageDetails = { annualSalary: '' };
    }

    this.salaryForm = this.fb.group({
      salary: [
        this.candidate.packageDetails.annualSalary || '',
        [Validators.required, Validators.min(1)],
      ],
    });

    this.salaryForm.get('salary')?.valueChanges.subscribe((value) => {
      if (value && value > 0) {
        this.calculateSalary(+value);
      }
    });

    if (this.candidate.packageDetails.annualSalary) {
      this.calculateSalary(+this.candidate.packageDetails.annualSalary);
    }
  }

  // ✅ Salary calculation logic
  calculateSalary(annualSalary: number) {
    const basic = annualSalary * 0.4;
    const hra = annualSalary * 0.16;
    const medical = 15000;
    const transport = 19200;

    const special = Math.max(0, annualSalary - (basic + hra + medical + transport));

    const pfEmployer = basic * 0.12;
    const pfEmployee = basic * 0.12;

    this.salaryStructure = {
      basic,
      hra,
      medical,
      transport,
      special,
      subtotal: basic + hra + medical + transport + special,
      pfEmployer,
      pfEmployee,
      total: basic + hra + medical + transport + special + pfEmployer,
    };
  }
  // calculateSalary(annualSalary: number) {
  //   const basic = annualSalary * 0.4;
  //   const hra = annualSalary * 0.16;
  //   const medical = 15000;
  //   const transport = 19200;
  //   // const special = annualSalary - (basic + hra + medical + transport);
  //   const special = Math.max(0,annualSalary - (basic + hra + medical + transport));

  //   const pfEmployer = basic * 0.12;
  //   const pfEmployee = basic * 0.12;

  //   this.salaryStructure = {
  //     basic,
  //     hra,
  //     medical,
  //     transport,
  //     special,
  //     subtotal: basic + hra + medical + transport + special,
  //     pfEmployer,
  //     pfEmployee,
  //     total: basic + hra + medical + transport + special + pfEmployer,
  //   };

  //   console.log('💰 Calculated Salary Structure:', this.salaryStructure);
  // }

  // ✅ View salary preview
  onViewSalary() {
    if (this.salaryForm.invalid) {
      alert('Please enter a valid salary.');
      return;
    }
    const annualSalary = this.salaryForm.value.salary;
    this.calculateSalary(annualSalary);
  }

  // ✅ Save salary structure and navigate immediately
  goToOfferDetails() {
    if (this.salaryForm.invalid) {
      alert('Please enter salary before continuing.');
      return;
    }

    const annualSalary = this.salaryForm.value.salary;
    this.calculateSalary(annualSalary);

    const candidateId = this.candidate.id || this.candidate.candidate_id;
    if (!candidateId) {
      alert('Candidate ID not found. Please go back and select a candidate.');
      this.router.navigate(['/previous-page']);
      return;
    }

    const salaryData = {
      candidate_id: candidateId,
      basic: this.salaryStructure.basic,
      hra: this.salaryStructure.hra,
      medical_allowance: this.salaryStructure.medical,
      transport_allowance: this.salaryStructure.transport,
      special_allowance: this.salaryStructure.special,
      sub_total: this.salaryStructure.subtotal,
      pf_employer: this.salaryStructure.pfEmployer,
      total_annual: annualSalary,
    };

    // Update candidate object with salary data for the final API call
    this.candidate.offered_ctc = annualSalary;
    this.candidate.annual_salary = annualSalary;
    this.candidate.salary_breakup = {
      basic: this.salaryStructure.basic,
      hra: this.salaryStructure.hra,
      special: this.salaryStructure.special
    };

    console.log('✅ Candidate updated with salary data:', this.candidate);

    // ✅ Immediately navigate to OfferDetailsComponent
    this.router.navigate(
      [
        '/OfferDetailsComponent',
        candidateId,
        encodeURIComponent(this.candidate.FirstName || ''),
      ],
      { state: { candidate: this.candidate } }
    );
  }
}
