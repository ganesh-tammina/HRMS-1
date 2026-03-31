import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { EmployeeService } from '../../../../../core/services/employee.service';

@Component({
  selector: 'app-profile-tab',
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
export class ProfileTabComponent implements OnChanges {
  @Input() currentEmployee: any;
  IsDetails = false;
  Isedit = false;
  isAdress = false;

  constructor(
    private employeeService: EmployeeService,
    private toastController: ToastController
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentEmployee']?.currentValue) {
      console.log('✅ ProfileTabComponent received employee:', this.currentEmployee);
    }
  }

  isEditDetails() { this.IsDetails = !this.IsDetails; }
  isEditForm() { this.Isedit = !this.Isedit; }
  isEditAddress() { this.isAdress = !this.isAdress; }

  onSubmitDetails() {
    if (!this.currentEmployee) return;
    this.employeeService.updateMyProfile(this.currentEmployee).subscribe({
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
