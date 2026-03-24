import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CandidateService } from 'src/app/services/pre-onboarding.service';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-shifts',
  templateUrl: './shifts.component.html',
  styleUrls: ['./shifts.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, IonicModule, CommonModule]
})
export class ShiftsComponent implements OnInit {
  shiftForm!: FormGroup;
  shiftsDetails:any

  constructor(
    private fb: FormBuilder,
    private shiftService: CandidateService,
    private toastCtrl: ToastController
  ) { }

  ngOnInit(): void {
    this.shiftForm = this.fb.group({
      shift_name: ['', Validators.required],
      check_in: ['', Validators.required],
      check_out: ['', Validators.required]
    });
      this.loadShifts();
    // this.shiftService.getShifts(this.shiftForm.value).subscribe((res: any) => {
    //   console.log(res)
    //   alert('Shift Saved Successfully!');
    //   this.shiftsDetails = res;
    // });
  }
loadShifts() {
  this.shiftService.getShifts(this.shiftForm.value).subscribe((res: any) => {
    this.shiftsDetails = res;
  });
}
  submitShift() {
    if (this.shiftForm.invalid) {
      this.shiftForm.markAllAsTouched();
      return;
    }
    this.shiftService.getShifts(this.shiftForm.value).subscribe((res: any) => {
      console.log(res)
      this.showToast('Shift Saved Successfully!', 'success');
      this.shiftsDetails = res;
        this.OpenForm(false);
         this.shiftForm.reset();
      console.log("shiftDetails", this.shiftsDetails);
    });
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }
  isModalOpen = false;

  OpenForm(isOpen: boolean) {
    this.isModalOpen = isOpen;
  }
}
