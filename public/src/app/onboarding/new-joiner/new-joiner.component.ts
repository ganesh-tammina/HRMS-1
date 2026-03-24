import { Component, OnInit } from '@angular/core';
import { OnboardingMainheaderComponent } from '../onboarding-mainheader/onboarding-mainheader.component';
import { HeaderComponent } from 'src/app/shared/header/header.component';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { HireEmployeesService } from 'src/app/services/hire-employees.service';

@Component({
  selector: 'app-new-joiner',
  templateUrl: './new-joiner.component.html',
  styleUrls: ['./new-joiner.component.scss'],
  standalone: true,
  imports: [OnboardingMainheaderComponent, CommonModule, IonicModule, HeaderComponent]
})
export class NewJoinerComponent implements OnInit {
  hiredascandidate: any = [];
  candidateList: any = [];
  constructor(private hireEmployeeService: HireEmployeesService) { }

  ngOnInit() {
    this.hireEmployeeService.currentCandidate.subscribe(candidate => {
      this.hiredascandidate = candidate;
      this.candidateList.push(this.hiredascandidate);
      console.log('Received candidate:', this.hiredascandidate);
    });
  }

}
