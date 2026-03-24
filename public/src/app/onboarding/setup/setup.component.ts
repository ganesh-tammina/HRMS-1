import { Component, OnInit } from '@angular/core';
import { OnboardingMainheaderComponent } from '../onboarding-mainheader/onboarding-mainheader.component';
import { HeaderComponent } from 'src/app/shared/header/header.component';
import { IonicModule } from '@ionic/angular';
@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
  standalone: true,
  imports: [OnboardingMainheaderComponent, IonicModule, HeaderComponent]
})
export class SetupComponent implements OnInit {

  constructor() { }

  ngOnInit() { }

}
