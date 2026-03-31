import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-job-tab',
  templateUrl: './job.component.html',
  styleUrls: ['./job.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
  ]
})
export class JobTabComponent implements OnChanges {
  @Input() currentEmployee: any | null = null;
  IseditJob = false;

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentEmployee']?.currentValue) {
      console.log('✅ JobTabComponent received employee:', this.currentEmployee);
    }
  }

  isEditJob() { this.IseditJob = !this.IseditJob; }
}
