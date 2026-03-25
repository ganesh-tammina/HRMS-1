import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavController, AlertController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-bank-details',
  templateUrl: './bank-form.component.html',
  styleUrls: ['./bank-form.component.scss']
})
export class BankDetailsPage implements OnInit {
  bankForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private navCtrl: NavController,
    private http: HttpClient,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
    this.bankForm = this.fb.group({
      name: ['', Validators.required],
      accountNumber: ['', [Validators.required, Validators.pattern(/^\d{9,18}$/)]],
      ifsc: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)]]
    });
  }

  async submitBank() {
    if (this.bankForm.invalid) {
      this.bankForm.markAllAsTouched();
      return;
    }

    const candidateId = localStorage.getItem('candidateId');
    const data = { ...this.bankForm.value, candidateId };

    await this.http.post('https://localhost:3000/bank-details', data).toPromise();

    const alert = await this.alertCtrl.create({
      header: 'Success',
      message: 'Bank details submitted successfully!',
      buttons: ['OK']
    });
    await alert.present();

    this.navCtrl.navigateBack('/onboarding-dashboard');
  }
}
