import { Component, OnInit } from '@angular/core';
import { OnboardingMainheaderComponent } from '../onboarding-mainheader/onboarding-mainheader.component';
import { IonicModule } from '@ionic/angular';
@Component({
  selector: 'app-task-templates',
  templateUrl: './task-templates.component.html',
  styleUrls: ['./task-templates.component.scss'],
  standalone: true,
  imports: [OnboardingMainheaderComponent, IonicModule]
})
export class TaskTemplatesComponent implements OnInit {

  constructor() { }

  ngOnInit() { }

}
