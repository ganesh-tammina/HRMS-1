import { Component, OnInit } from '@angular/core';
import { OnboardingMainheaderComponent } from '../onboarding-mainheader/onboarding-mainheader.component';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-past-offers',
  templateUrl: './past-offers.component.html',
  styleUrls: ['./past-offers.component.scss'],
  standalone: true,
  imports: [OnboardingMainheaderComponent, IonicModule]
})
export class PastOffersComponent implements OnInit {

  constructor( private router: Router) { }

  ngOnInit() { }
  onboard() {
    this.router.navigate(['./preonboarding-setup']);
  }
  org() {
    this.router.navigate(['./pre-onboarding-cards']);
  }
}
