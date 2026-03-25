import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { OnboardingMainheaderComponent } from '../onboarding-mainheader/onboarding-mainheader.component';
import { Router } from '@angular/router';
@Component({
  selector: 'app-onboarding-tasks',
  templateUrl: './onboarding-tasks.component.html',
  styleUrls: ['./onboarding-tasks.component.scss'],
  standalone: true,
  imports: [IonicModule, OnboardingMainheaderComponent]
})
export class OnboardingTasksComponent implements OnInit {

  constructor( private router: Router) { }

  ngOnInit() { }
    onboard() {
    this.router.navigate(['./preonboarding-setup']);
  }
  org() {
    this.router.navigate(['./pre-onboarding-cards']);
  }
}
