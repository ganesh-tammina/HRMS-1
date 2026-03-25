import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from 'src/app/shared/header/header.component';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-pre-onboarding-cards',
  templateUrl: './pre-onboarding-cards.component.html',
  styleUrls: ['./pre-onboarding-cards.component.scss'],
  standalone: true,
  imports: [RouterLink, CommonModule, IonicModule]

})
export class PreOnboardingCardsComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit() {

  }
  preonboard() {
    //this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['./preonboarding-setup']);
    //});
  }
}
