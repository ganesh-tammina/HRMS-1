import { Component, Output, EventEmitter, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { AttendanceApiService } from '../../../core/services/attendance-api.service';

@Component({
  selector: 'app-clock-button',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
  <div class="ion-text-left">
    <!-- Clock In Button (Web only) -->
    <div class="row-center" *ngIf="!isClockedIn && currentUrl !== '/Me'">
      <ion-button class="btn-clockin" (click)="clockIn('Office')">Web Clock-In</ion-button>
    </div>

    <!-- Clock In Button for /Me page -->
    <div *ngIf="!isClockedIn && currentUrl == '/Me'">
      <ion-button fill="clear" class="clear" (click)="clockIn('Office')">
        Web Clock-In
      </ion-button>
    </div>

    <!-- Clock Out Button - Office -->
    <div class="row-center" *ngIf="isClockedIn && workMode === 'Office' && currentUrl !== '/Me'">
      <ion-button class="btn-clockout" (click)="clockOut()">Web Clock-Out</ion-button>
    </div>

    <!-- Clock Out Button - Remote -->
    <div class="row-center" *ngIf="isClockedIn && workMode === 'Remote' && currentUrl !== '/Me'">
      <ion-button class="btn-clockout" color="warning" (click)="remoteClockOut()">Remote Clock-Out</ion-button>
    </div>

    <!-- Clock Out Button - WFH -->
    <div class="row-center" *ngIf="isClockedIn && workMode === 'WFH' && currentUrl !== '/Me'">
      <ion-button class="btn-clockout" color="secondary" (click)="clockOut()">WFH Clock-Out</ion-button>
    </div>

    <!-- /Me page buttons -->
    <ion-button *ngIf="isClockedIn && currentUrl == '/Me' && workMode === 'Office'" class="btn-clockout" (click)="clockOut()">Web Clock-Out</ion-button>
    <ion-button *ngIf="isClockedIn && currentUrl == '/Me' && workMode === 'Remote'" class="btn-clockout" color="warning" (click)="remoteClockOut()">Remote Clock-Out</ion-button>
    <ion-button *ngIf="isClockedIn && currentUrl == '/Me' && workMode === 'WFH'" class="btn-clockout" color="secondary" (click)="clockOut()">WFH Clock-Out</ion-button>
  </div>
  `,
  styles: [`
    .btn-clockin {
      --background: #1F74BB;
      --border-radius: 76px;
      --padding-end: 20px;
      --padding-start: 20px;
      font-weight: 600;
    }
    .btn-clockout {
      --background: #dc2626;
      --border-radius: 76px;
      --padding-end: 20px;
      --padding-start: 20px;
      font-weight: 600;
    }
  `]
})
export class ClockButtonComponent implements OnInit, OnDestroy {
  currentUrl: any;
  @Input() record: any;
  @Output() statusChanged = new EventEmitter<any>();

  isClockedIn = false;
  workMode: string = 'Office';
  remoteActive = false;
  loading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private attendanceApi: AttendanceApiService,
    private toastCtrl: ToastController
  ) { }

  ngOnInit(): void {
    this.currentUrl = this.router.url;

    this.attendanceApi.clockState$.pipe(takeUntil(this.destroy$)).subscribe((isClockedIn: boolean) => {
      this.isClockedIn = isClockedIn;
      this.remoteActive = localStorage.getItem('remoteActive') === 'true';
      if (this.remoteActive) this.workMode = 'Remote';
    });

    this.loadLastPunch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadLastPunch(): void {
    this.attendanceApi.getTodayAttendance().subscribe({
      next: (res) => {
        const punches = res?.punches || [];
        if (!punches.length) {
          this.isClockedIn = false;
          this.workMode = 'Office';
          this.remoteActive = false;
          localStorage.removeItem('remoteActive');
          return;
        }
        const lastPunch = punches[punches.length - 1];
        this.isClockedIn = lastPunch.punch_type === 'in';
        this.workMode = lastPunch.work_mode || 'Office';
        localStorage.setItem('todayPunches', JSON.stringify(punches));
        if (this.isClockedIn && this.workMode === 'Remote') {
          this.remoteActive = true;
          localStorage.setItem('remoteActive', 'true');
        } else {
          this.remoteActive = false;
          localStorage.removeItem('remoteActive');
        }
      },
      error: () => {
        this.isClockedIn = false;
        this.workMode = 'Office';
        this.remoteActive = false;
      }
    });
  }

  clockIn(mode: 'Office' | 'Remote' | 'WFH'): void {
    if (this.isClockedIn) return;
    this.loading = true;
    let location = 'Mumbai Office';
    let notes = 'Morning shift';
    if (mode === 'Remote') { location = 'Remote'; notes = 'Remote Clock-In'; this.workMode = 'Remote'; this.remoteActive = true; }
    else if (mode === 'WFH') { location = 'Home'; notes = 'WFH Clock-In'; this.workMode = 'WFH'; }
    else { this.workMode = 'Office'; }

    this.isClockedIn = true;
    this.statusChanged.emit({ punch_type: 'in', work_mode: mode });

    this.attendanceApi.apiPunchIn({ work_mode: mode, location, notes }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.success) {
          this.showToast(res?.message || 'Clocked in successfully', 'success');
          this.statusChanged.emit({ punch_type: 'in', work_mode: mode });
        }
      },
      error: (err: any) => {
        this.loading = false;
        if (err?.error?.message?.includes('active punch-in')) {
          this.showToast('You already have an active punch-in. Please clock out first.', 'warning');
          this.isClockedIn = true;
        } else {
          this.showToast(err?.error?.message || 'Clock-In failed. Please try again.', 'danger');
          this.isClockedIn = false;
        }
      }
    });
  }

  clockOut(): void {
    this.loading = true;
    this.isClockedIn = false;
    this.statusChanged.emit({ punch_type: 'out', work_mode: this.workMode });
    const wasWFH = this.workMode === 'WFH';

    this.attendanceApi.apiPunchOut({ notes: wasWFH ? 'WFH Clock-Out' : 'Going for lunch' }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.success) {
          this.showToast(res?.message || 'Clocked out successfully', 'danger');
          this.statusChanged.emit({ punch_type: 'out', work_mode: this.workMode });
          if (wasWFH) this.workMode = 'Office';
        }
      },
      error: (err) => {
        this.loading = false;
        this.showToast((err as any)?.error?.message || 'Clock-Out failed. Please try again.', 'danger');
      }
    });
  }

  remoteClockOut(): void {
    this.loading = true;
    this.isClockedIn = false;
    this.remoteActive = false;
    this.workMode = 'Office';
    localStorage.removeItem('remoteActive');
    this.statusChanged.emit({ punch_type: 'out', work_mode: 'Remote' });
    this.attendanceApi.apiPunchOut({ notes: 'Remote Clock-Out' }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.success) {
          this.showToast(res?.message || 'Remote clocked out successfully', 'danger');
          this.statusChanged.emit({ punch_type: 'out', work_mode: 'Remote' });
        }
      },
      error: (err) => {
        this.loading = false;
        this.showToast((err as any)?.error?.message || 'Remote Clock-Out failed.', 'danger');
      }
    });
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastCtrl.create({ message, duration: 3000, position: 'top', color });
    await toast.present();
  }
}
