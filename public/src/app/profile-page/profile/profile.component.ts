import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CandidateService, Employee } from '../../services/pre-onboarding.service';
import { EmployeeService } from '../../services/employee.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
  ]
})

export class ProfileComponent implements OnChanges {
  @Input() currentEmployee: any;

  currentCandidate$!: Observable<any>;
  currentEmployee$!: Observable<Employee | null>;
  Isedit: boolean = false;
  isAdress: boolean = false;
  IsDetails: boolean = false;
  constructor(
    private candidateService: CandidateService,
    private employeeService: EmployeeService,
    private toastController: ToastController
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentEmployee']?.currentValue) {
      console.log(
        '✅ AboutusComponent received employee:',
        this.currentEmployee
      );
    }
  }
  isEditDetails() {
    this.IsDetails = !this.IsDetails;
  }
  isEditForm() {
    this.Isedit = !this.Isedit;
  }
  isEditAddress() {
    this.isAdress = !this.isAdress;
  }

  onSubmitDetails() {
    if (!this.currentEmployee) return;
    const updatedData: any = {
      DateOfBirth: this.currentEmployee.DateOfBirth,
      // Add other fields as needed
    };
    this.employeeService.updateMyProfile(updatedData).subscribe({
      next: () => {
        this.presentToast('Profile updated successfully!', 'success');
        this.IsDetails = false;
      },
      error: (err: any) => {
        this.presentToast('Failed to update profile.', 'danger');
        console.error('Failed to update profile:', err);
      }
    });
  }

  async presentToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    toast.present();
  }
}
