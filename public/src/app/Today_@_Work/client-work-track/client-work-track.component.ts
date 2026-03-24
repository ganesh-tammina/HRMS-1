import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-client-work-track',
  templateUrl: './client-work-track.component.html',
  styleUrls: ['./client-work-track.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class ClientWorkTrackComponent  implements OnInit {

  constructor() { }

  ngOnInit() {}

}
