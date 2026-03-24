import { Component, OnInit } from '@angular/core';
import { OnboardingMainheaderComponent } from '../onboarding-mainheader/onboarding-mainheader.component';
import { HeaderComponent } from 'src/app/shared/header/header.component';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-past-offers',
  templateUrl: './past-offers.component.html',
  styleUrls: ['./past-offers.component.scss'],
  standalone: true,
  imports: [OnboardingMainheaderComponent, IonicModule, HeaderComponent]
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
