import { Component, OnInit } from '@angular/core';
import { OnboardingMainheaderComponent } from '../onboarding-mainheader/onboarding-mainheader.component';
import { IonicModule } from '@ionic/angular';
@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
  standalone: true,
  imports: [OnboardingMainheaderComponent, IonicModule]
})
export class SetupComponent implements OnInit {

  constructor() { }

  ngOnInit() { }

}
