import { Component } from '@angular/core';
import { ModalController, IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkFromHomeService } from '../../../../core/services/work-from-home.service';
import { AttendanceApiService } from '../../../../core/services/attendance-api.service';

@Component({
  selector: 'app-remote-clockin-modal',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-title>Remote Clock-In Request</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="modal-wrapper">
        <div class="info-banner">
          <ion-icon name="information-circle-outline"></ion-icon>
          <p>This request will be sent to your manager for approval.</p>
        </div>

        <div class="form-container">
          <div class="input-group">
            <label>Reason / Note</label>
            <ion-textarea 
              [(ngModel)]="reason" 
              placeholder="Explain why you are clocking in remotely..." 
              rows="6"
              class="custom-textarea"
              [disabled]="loading">
            </ion-textarea>
          </div>

          <div class="submit-action ion-margin-top">
            <ion-button 
              expand="block" 
              class="primary-btn" 
              (click)="submit()" 
              [disabled]="loading || !reason.trim()">
              <ion-spinner *ngIf="loading" name="crescent" slot="start"></ion-spinner>
              {{ loading ? 'Submitting...' : 'Submit Request' }}
            </ion-button>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .modal-wrapper {
      padding: 10px 0;
    }
    .info-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #f0f7ff;
      border-radius: 12px;
      margin-bottom: 24px;
      color: #0c66e4;
      ion-icon { font-size: 24px; }
      p { margin: 0; font-size: 14px; line-height: 1.4; }
    }
    .input-group {
      label {
        display: block;
        font-weight: 500;
        color: #444;
        margin-bottom: 12px;
        font-size: 14px;
      }
    }
    .custom-textarea {
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 16px;
      --padding-bottom: 16px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .primary-btn {
      --background: #1870B9;
      --border-radius: 12px;
      --height: 52px;
      height: 52px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
  `],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class RemoteClockinModalComponent {
  reason: string = '';
  loading = false;
  existingWFHRequests: any[] = [];

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private wfhService: WorkFromHomeService,
    private attendanceApi: AttendanceApiService
  ) {
    this.loadExistingWFHRequests();
  }

  private loadExistingWFHRequests() {
    this.wfhService.getAllWFHRequests().subscribe({
      next: (requests: any[]) => {
        this.existingWFHRequests = (requests || []).filter((req: any) => {
          const blockingStatuses = ['PENDING', 'APPROVED', 'pending', 'approved'];
          return blockingStatuses.includes(req.status);
        });
      },
      error: (err: any) => console.error('Failed to load WFH requests:', err)
    });
  }

  private hasWFHConflictForToday(today: string): boolean {
    return this.existingWFHRequests.some(req => {
      const reqStart = (req.start_date || req.from_date || '').split('T')[0];
      const reqEnd = (req.end_date || req.to_date || reqStart).split('T')[0];
      return today >= reqStart && today <= reqEnd;
    });
  }

  async submit() {
    if (!this.reason.trim()) return;

    const today = new Date().toISOString().split('T')[0];
    if (this.hasWFHConflictForToday(today)) {
      this.showToast('Conflict: You already have a WFH request for today.', 'warning');
      return;
    }

    this.loading = true;
    this.wfhService.remote({
      date: today,
      reason: this.reason
    }).subscribe({
      next: () => {
        // Punches in with Remote mode if not already clocked in
        if (!this.attendanceApi.getClockState()) {
          this.attendanceApi.apiPunchIn({
            work_mode: 'Remote',
            location: 'Remote',
            notes: 'Remote Clock-In: ' + this.reason
          }).subscribe({
            next: () => this.finalize(true),
            error: (err) => {
              this.loading = false;
              this.showToast(err?.error?.message || 'Remote Punch-In failed', 'danger');
            }
          });
        } else {
          this.finalize(true);
        }
      },
      error: (err) => {
        this.loading = false;
        this.showToast(err?.error?.error || 'Failed to submit remote request', 'danger');
      }
    });
  }

  private finalize(success: boolean) {
    this.loading = false;
    if (success) {
      this.showToast('Remote Clock-In request submitted successfully!', 'success');
      this.modalCtrl.dismiss({ success: true, reason: this.reason });
    }
  }

  close() {
    this.modalCtrl.dismiss();
  }

  async showToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'top',
      color,
      cssClass: 'custom-toast'
    });
    await toast.present();
  }
}
