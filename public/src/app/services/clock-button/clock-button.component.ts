import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';

import { AttendanceApiService } from '../attendance-api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-clock-button',
  styleUrls: ['clock-button.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `

  <div class="ion-text-left">
    <!-- Clock In Button (Web only) -->
    <div class="row-center" *ngIf="!isClockedIn && currentUrl !== '/Me'">
      <ion-button class="btn-clockin" (click)="clockIn('Office')">Web Clock-In</ion-button>
    </div>

    <!-- Clock In Button for /Me page (Web only) -->
    <div *ngIf="!isClockedIn && currentUrl == '/Me'">
      <ion-button fill="clear" class="clear" (click)="clockIn('Office')">
        <img src="../../assets/Icons/attendance-icons/Web clockin.svg" width="16" height="16" />
        Web Clock-In
      </ion-button>
    </div>

    <!-- Clock Out Button - Office -->
    <div class="row-center" *ngIf="isClockedIn && workMode === 'Office' && currentUrl !== '/Me'">
      <ion-button class="btn-clockout" (click)="clockOut()">Web Clock-Out</ion-button>
    </div>

    <!-- Clock Out Button - Remote -->
    <div class="row-center" *ngIf="isClockedIn && workMode === 'Remote' && currentUrl !== '/Me'">
      <ion-button class="btn-clockout remote-clockout" (click)="remoteClockOut()">Remote Clock-Out</ion-button>
    </div>

    <!-- Clock Out Button - WFH -->
    <div class="row-center" *ngIf="isClockedIn && workMode === 'WFH' && currentUrl !== '/Me'">
      <ion-button class="btn-clockout wfh-clockout" (click)="clockOut()">WFH Clock-Out</ion-button>
    </div>

    <!-- Clock Out Buttons for /Me page -->
    <ion-button *ngIf="isClockedIn && currentUrl == '/Me' && workMode === 'Office'" class="btn-clockout me-clock-out" (click)="clockOut()">Web Clock-Out</ion-button>
    <ion-button *ngIf="isClockedIn && currentUrl == '/Me' && workMode === 'Remote'" class="btn-clockout me-clock-out remote-clockout" (click)="remoteClockOut()">Remote Clock-Out</ion-button>
    <ion-button *ngIf="isClockedIn && currentUrl == '/Me' && workMode === 'WFH'" class="btn-clockout me-clock-out wfh-clockout" (click)="clockOut()">WFH Clock-Out</ion-button>
  </div>
  `,
})
export class ClockButtonComponent implements OnInit, OnDestroy {
  currentUrl: any;
  /* kept only to avoid template errors */
  @Input() record: any;
  @Output() statusChanged = new EventEmitter<any>();

  /** true → show Clock-Out */
  isClockedIn = false;
  workMode: string = 'Office'; // Track work mode: Office, WFH, Remote
  remoteActive = false; // Track if remote clock-in is active
  loading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private attendanceApi: AttendanceApiService,
    private toastCtrl: ToastController
  ) { }

  ngOnInit(): void {
    this.currentUrl = this.router.url;
    console.log('🔔 Clock button initialized on:', this.currentUrl);

    // Subscribe to shared clock state
    this.subscribeToClockState();

    // Load initial state
    this.loadLastPunch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ================= SUBSCRIBE TO CLOCK STATE ================= */
  private subscribeToClockState(): void {
    this.attendanceApi.clockState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isClockedIn: boolean) => {
        this.isClockedIn = isClockedIn;
        // Check persisted remoteActive flag
        this.remoteActive = localStorage.getItem('remoteActive') === 'true';
        // If remoteActive, force workMode to Remote
        if (this.remoteActive) {
          this.workMode = 'Remote';
        }
      });
  }

  /* ======================
   * GET LAST PUNCH OBJECT
   * ====================== */
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
        // Save punches to localStorage for clock state subscription
        localStorage.setItem('todayPunches', JSON.stringify(punches));
        // If last punch is remote and clocked in, set remoteActive
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
        localStorage.removeItem('remoteActive');
      }
    });
  }

  /* ================= CLOCK IN ================= */
  clockIn(mode: 'Office' | 'Remote' | 'WFH'): void {
    if (this.isClockedIn) {
      return;
    }
    this.loading = true;
    let work_mode = mode;
    let location = 'Mumbai Office';
    let notes = 'Morning shift';
    if (mode === 'Remote') {
      location = 'Remote';
      notes = 'Remote Clock-In';
      this.workMode = 'Remote';
      this.remoteActive = true;
    } else if (mode === 'WFH') {
      location = 'Home';
      notes = 'WFH Clock-In';
      this.workMode = 'WFH';
    } else {
      this.workMode = 'Office';
    }
    // Update UI state immediately for instant feedback
    this.isClockedIn = true;
    this.statusChanged.emit({ punch_type: 'in', work_mode });
    this.attendanceApi.apiPunchIn({
      work_mode,
      location,
      notes,
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.success) {
          this.showToast(res?.message || 'Clocked in successfully', 'success');
          // Always emit statusChanged after API success to trigger log refresh
          this.statusChanged.emit({ punch_type: 'in', work_mode });
          if (work_mode === 'Remote') {
            this.workMode = 'Remote';
            this.remoteActive = true;
            this.isClockedIn = true;
          }
          if (work_mode === 'WFH') {
            this.workMode = 'WFH';
            this.isClockedIn = true;
          }
          if (work_mode === 'Office') {
            this.workMode = 'Office';
            this.isClockedIn = true;
          }
          console.log('✅ Clocked In successfully on', this.currentUrl);
        }
      },
      error: (err: any) => {
        this.loading = false;
        if (err?.error?.message?.includes('active punch-in')) {
          this.showToast('You already have an active punch-in. Please clock out first.', 'warning');
          this.isClockedIn = true;
        } else {
          this.showToast(err?.error?.message || 'Clock-In failed. Please try again.', 'danger');
        }
      },
    });
  }

  /* ================= CLOCK OUT ================= */
  clockOut(): void {
    this.loading = true;
    this.isClockedIn = false;
    this.statusChanged.emit({ punch_type: 'out', work_mode: this.workMode });
    const wasWFH = this.workMode === 'WFH';
    this.attendanceApi.apiPunchOut({
      notes: wasWFH ? 'WFH Clock-Out' : 'Going for lunch',
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.success) {
          this.showToast(res?.message || 'Clocked out successfully', 'success');
          // Always emit statusChanged after API success to trigger log refresh
          this.statusChanged.emit({ punch_type: 'out', work_mode: this.workMode });
          if (wasWFH) {
            this.workMode = 'Office';
          }
          console.log('✅ Clocked Out successfully on', this.currentUrl);
        }
      },
      error: (err) => {
        this.loading = false;
        this.showToast((err as any)?.error?.message || 'Clock-Out failed. Please try again.', 'danger');
      },
    });
  }

  /* =============== REMOTE CLOCK OUT =============== */
  remoteClockOut(): void {
    this.loading = true;
    this.isClockedIn = false;
    this.remoteActive = false;
    this.workMode = 'Office';
    localStorage.removeItem('remoteActive');
    this.statusChanged.emit({ punch_type: 'out', work_mode: 'Remote' });
    this.attendanceApi.apiPunchOut({
      notes: 'Remote Clock-Out',
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.success) {
          this.showToast(res?.message || 'Remote clocked out successfully', 'success');
          // Always emit statusChanged after API success to trigger log refresh
          this.statusChanged.emit({ punch_type: 'out', work_mode: 'Remote' });
        }
      },
      error: (err) => {
        this.loading = false;
        this.showToast((err as any)?.error?.message || 'Remote Clock-Out failed. Please try again.', 'danger');
      },
    });
  }

  /* ================= TOAST HELPER ================= */
  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'top',
      color,
    });
    await toast.present();
  }
}
