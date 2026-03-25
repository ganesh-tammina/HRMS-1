import { Component, OnInit, Input } from '@angular/core';
import { IonicModule, ModalController, NavController } from '@ionic/angular';

@Component({
  selector: 'app-start-onboarding',
  templateUrl: './start-onboarding.component.html',
  styleUrls: ['./start-onboarding.component.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class StartOnboardingComponent implements OnInit {
  @Input() candidate: any;

  constructor(
    private modalCtrl: ModalController,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    console.log('Candidate received:', this.candidate);
  }

  close() {
    this.modalCtrl.dismiss();
  }

  createOffer() {
    if (!this.candidate) {
      console.error('Candidate object is undefined');
      return;
    }

    // Use correct property name from your console log
    const id = this.candidate.candidate_id || this.candidate.PersonalDetailsID;
    const firstName = this.candidate.FirstName;

    if (!id) {
      console.error('Candidate ID is missing:', this.candidate);
      return;
    }

    console.log('Navigating to CreateOffer for ID:', id, 'Name:', firstName);

    // ✅ Use Ionic NavController to navigate
    this.navCtrl.navigateForward(`/CreateOffer/${id}`, {
      queryParams: { name: firstName },
      state: { candidate: this.candidate }
    });

    // ✅ Dismiss modal after navigation
    setTimeout(() => this.modalCtrl.dismiss(), 300);
  }
}
