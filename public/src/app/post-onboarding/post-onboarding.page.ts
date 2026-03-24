import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../shared/header/header.component';
import {
  IonContent, IonCard, IonInput, IonItem, IonButton, IonSelect, IonCardTitle, IonCardHeader,
  IonHeader, IonToolbar, IonLabel, IonTitle, IonSelectOption, IonCardContent
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-onboarding',
  templateUrl: './post-onboarding.page.html',
  styleUrls: ['./post-onboarding.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    FormsModule,
    IonLabel,
    IonInput,
    IonItem,
    IonCard,
    IonButton,
    IonHeader,
    IonCardContent,
    IonSelect,
    IonSelectOption
]
})
export class OnboardingPage implements OnInit {
  onboardingForm!: FormGroup;
  selectedCard: string = 'bank';

  selectedCandidateId: string = '';
  candidateList: string[] = [];
  selectedCandidate: any = null;

  constructor(private fb: FormBuilder, private http: HttpClient, private alertController: AlertController) { }

  ngOnInit() {
    this.onboardingForm = this.fb.group({
      bankDetails: this.fb.group({
        accountNumber: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
        ifsc: ['', Validators.required],
        bankName: ['', Validators.required]
      }),
      taxInfo: this.fb.group({
        pan: ['', Validators.required],
        aadhar: ['', [Validators.required, Validators.pattern(/^[6-9]\d{11}$/)]]
      })
    });
    this.fetchLatestCandidates()
    this.candidateList.push(this.selectedCandidateId)
    console.log(this.candidateList)
  }

  fetchLatestCandidates() {
    this.http.get<any[]>('https://localhost:3000/employees?_sort=id&_order=desc&_limit=5')
      .subscribe(data => {
        console.log('Fetched candidate records:', data);

        this.candidateList = data
          .filter(emp => emp.candidateId)  // remove entries with no candidateId
          .map(emp => emp.candidateId);    // extract only the candidateId string

        console.log('Candidate list:', this.candidateList);
      });
  }

  openCard(card: string) {
    this.selectedCard = card;
  }

  async submitOnboarding() {
    if (this.onboardingForm.valid) {
      const data = this.onboardingForm.value;

      // simulate submission
      console.log('Onboarding completed:', data);

      const alert = await this.alertController.create({
        header: 'Success',
        message: 'Your onboarding is successfully completed!',
        buttons: ['OK']
      });

      await alert.present();
    } else {
      this.onboardingForm.markAllAsTouched();
    }
  }

  downloadOffer() {
    // simulate offer letter download
    const blob = new Blob(['Offer Letter Content Here'], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'OfferLetter.pdf';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  onCandidateSelected(id: string) {
    this.http.get<any[]>(`https://localhost:3000/employees?candidateId=${id}`)
      .subscribe(data => {
        if (data.length > 0) {
          this.selectedCandidate = data[0];  // get the first match
        }
      });
  }
}
