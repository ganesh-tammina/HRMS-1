import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-offer-template',
  templateUrl: './offer-template.component.html',
  styleUrls: ['./offer-template.component.scss'],
  standalone: true,
  imports: [IonicModule,]
})
export class OfferTemplateComponent implements OnInit {

  constructor() { }

  ngOnInit() { }

}
