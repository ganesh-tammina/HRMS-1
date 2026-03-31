import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-timesheet-preview',
    standalone: true,
    imports: [IonicModule, CommonModule],
    template: `
    <ion-header>
    <ion-toolbar>
      <ion-title>Work Log</ion-title>
      <ion-buttons slot="end">
        <ion-button fill="clear" (click)="close()">
          <ion-icon name="close-outline"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  
    <div class="date-strip">
    <p>{{ data.date | date }}</p> <p>Total Hours: {{ data.total_hours }} hrs</p>
    </div>
  </ion-header>

    <ion-content class="work-log-content">

      <ion-list class="timeline" lines="none">
        <ion-item class="log-item" *ngFor="let b of data.hours_breakdown">
        <div class="timeline-col">
          <span class="dot"></span>
          <span class="line"></span>
        </div>

        <div class="log-card">
        <div class="log-header">
          <span class="time">{{ b.hour }}</span>
          <span class="badge">{{ b.hours }}h</span>
        </div>

        <div class="desc">{{ b.task }}</div>
      </div>
        
        </ion-item>
      </ion-list>

    </ion-content>
  `,
})
export class TimesheetPreviewComponent {
    @Input() data: any;

    constructor(private modalCtrl: ModalController) { }

    close() {
        this.modalCtrl.dismiss();
    }
}
