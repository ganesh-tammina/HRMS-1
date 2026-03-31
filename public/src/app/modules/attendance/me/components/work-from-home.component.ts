import { Component, OnInit } from '@angular/core';
import { ModalController, IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkFromHomeService } from '../../../../core/services/work-from-home.service';

@Component({
  selector: 'app-work-from-home',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-title>Request Work from Home</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="modal-wrapper">
        <div class="calendar-card ion-margin-bottom">
          <div class="date-range-inputs">
            <div class="date-input" (click)="openPicker('from')">
              <label>From Date</label>
              <div class="value-box" [class.active]="activePicker === 'from'">
                <ion-icon name="calendar-outline"></ion-icon>
                <span>{{ fromDate | date:'mediumDate' }}</span>
              </div>
            </div>

            <div class="date-input" (click)="openPicker('to')">
              <label>To Date</label>
              <div class="value-box" [class.active]="activePicker === 'to'">
                <ion-icon name="calendar-outline"></ion-icon>
                <span>{{ toDate | date:'mediumDate' }}</span>
              </div>
            </div>
          </div>

          <div class="picker-container" *ngIf="activePicker">
            <ion-datetime 
              presentation="date" 
              [min]="minDate"
              [value]="activePicker === 'from' ? fromDate : toDate"
              (ionChange)="onDateSelected($event)">
              <div slot="title">Select {{ activePicker === 'from' ? 'Start' : 'End' }} Date</div>
            </ion-datetime>
          </div>
        </div>

        <div class="summary-info ion-margin-bottom">
          <div class="days-badge">
            <ion-icon name="time-outline"></ion-icon>
            <span>Total Duration: <strong>{{ totalDays }} {{ totalDays > 1 ? 'Days' : 'Day' }}</strong></span>
          </div>
        </div>

        <div class="form-container">
          <label class="input-label">Reason for Request</label>
          <ion-textarea 
            [(ngModel)]="reason" 
            placeholder="Please provide a brief reason for working from home..." 
            rows="4"
            class="custom-textarea">
          </ion-textarea>

          <div class="submit-action">
            <ion-button 
              expand="block" 
              class="primary-btn" 
              (click)="submit()" 
              [disabled]="loading || !reason.trim() || totalDays < 0.5">
              <ion-spinner *ngIf="loading" name="crescent" slot="start"></ion-spinner>
              {{ loading ? 'Submitting Request...' : 'Send Request' }}
            </ion-button>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .modal-wrapper { padding: 8px 0; }
    .calendar-card {
      background: #f8fafc;
      border-radius: 16px;
      padding: 16px;
      border: 1px solid #e2e8f0;
    }
    .date-range-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 12px;
    }
    .date-input {
      label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: #64748b;
        margin-bottom: 6px;
        padding-left: 4px;
      }
      .value-box {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: #fff;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        color: #1e293b;
        transition: all 0.2s;
        ion-icon { color: #1870B9; font-size: 18px; }
        span { font-size: 14px; font-weight: 600; }
        &.active {
          border-color: #1870B9;
          box-shadow: 0 0 0 3px rgba(24, 112, 185, 0.1);
        }
      }
    }
    .picker-container {
      margin-top: 16px;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      border: 1px solid #e2e8f0;
    }
    .summary-info {
      .days-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: #f1f5f9;
        border-radius: 20px;
        color: #475569;
        font-size: 14px;
        ion-icon { font-size: 18px; color: #1870B9; }
      }
    }
    .input-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
      margin-bottom: 8px;
    }
    .custom-textarea {
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 16px;
      --padding-bottom: 16px;
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      margin-bottom: 24px;
      font-size: 15px;
    }
    .primary-btn {
      --background: #1870B9;
      --border-radius: 12px;
      --height: 52px;
      height: 52px;
      font-weight: 600;
    }
  `],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class WorkFromHomeComponent implements OnInit {
  fromDate = new Date().toISOString();
  toDate = new Date().toISOString();
  minDate = new Date().toISOString();
  activePicker: 'from' | 'to' | null = null;
  reason = '';
  totalDays = 1;
  loading = false;
  existingRequests: any[] = [];

  constructor(
    private modalCtrl: ModalController,
    private wfhService: WorkFromHomeService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.calculateDays();
    this.loadExistingRequests();
  }

  loadExistingRequests() {
    this.wfhService.getAllWFHRequests().subscribe({
      next: (reqs) => this.existingRequests = reqs || [],
      error: (err) => console.error('Error loading WFH requests', err)
    });
  }

  openPicker(type: 'from' | 'to') {
    this.activePicker = this.activePicker === type ? null : type;
  }

  onDateSelected(event: any) {
    const date = event.detail.value;
    if (this.activePicker === 'from') {
      this.fromDate = date;
      // If toDate is before new fromDate, reset it
      if (new Date(this.toDate) < new Date(date)) {
        this.toDate = date;
      }
    } else {
      this.toDate = date;
    }
    this.calculateDays();
    this.activePicker = null;
  }

  calculateDays() {
    const start = new Date(this.fromDate);
    const end = new Date(this.toDate);
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    
    if (end < start) {
      this.totalDays = 0;
      return;
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    this.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  async submit() {
    if (!this.reason.trim()) return;

    this.loading = true;
    const payload = {
      start_date: this.fromDate.split('T')[0],
      end_date: this.toDate.split('T')[0],
      total_days: this.totalDays,
      work_mode: 'WFH' as const,
      reason: this.reason
    };

    this.wfhService.wfh(payload).subscribe({
      next: (res) => {
        this.loading = false;
        this.showToast('Work From Home request submitted successfully!', 'success');
        this.modalCtrl.dismiss(res, 'success');
      },
      error: (err) => {
        this.loading = false;
        this.showToast(err?.error?.error || 'Failed to submit request', 'danger');
      }
    });
  }

  close() {
    this.modalCtrl.dismiss();
  }

  async showToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'top',
      color
    });
    await toast.present();
  }
}
