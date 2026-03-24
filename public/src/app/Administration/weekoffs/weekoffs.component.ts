import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CandidateService } from 'src/app/services/pre-onboarding.service';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-weekoffs',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, IonicModule],
  templateUrl: './weekoffs.component.html',
  styleUrls: ['./weekoffs.component.scss']
})
export class WeekoffsComponent implements OnInit {

  weekOffForm!: FormGroup;

  daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  selectedDays: string[] = [];
  constructor(private fb: FormBuilder, private candidateService: CandidateService) { }

  ngOnInit() {
    this.weekOffForm = this.fb.group({
      week_off_policy_name: ['', Validators.required],
      week_off_days: [[], Validators.required]
    });
  }
  onDaySelect(event: any) {
    const day = event.target.value;
    const isChecked = event.target.checked;

    if (isChecked) {
      if (this.selectedDays.length >= 2) {
        event.target.checked = false; // prevent third selection
        return;
      }
      this.selectedDays.push(day);
    } else {
      this.selectedDays = this.selectedDays.filter(d => d !== day);
    }

    this.weekOffForm.patchValue({
      week_off_days: this.selectedDays
    });
  }

  submitForm() {
    const formData = {
      week_off_policy_name: this.weekOffForm.value.week_off_policy_name,
      week_off_days: this.selectedDays.join(",")   // <-- ARRAY → STRING
    };
    // this.candidateService.getWeekOffPolicies(formData).subscribe((res: any) => {
    //   alert('Week Off Policy Saved Successfully!');
    //   console.log(res);
    // });
    this.weekOffForm.reset();
    this.selectedDays = [];
  }

}
