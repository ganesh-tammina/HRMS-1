import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ReportingTeamComponent } from '../reporting-team/reporting-team.component';

@Component({
  selector: 'app-about-tab',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    ReportingTeamComponent
  ]
})
export class AboutTabComponent implements OnChanges {
  @Input() currentEmployee: any | null = null;
  IsSummary = false;
  IsOrg = false;
  viewEditor = false;

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentEmployee']?.currentValue) {
      console.log('✅ AboutTabComponent received employee:', this.currentEmployee);
    }
  }

  isEditSummary(): void {
    this.IsSummary = !this.IsSummary;
    this.viewEditor = this.IsSummary;
  }

  isEditOrg(): void {
    this.IsOrg = !this.IsOrg;
  }
}
