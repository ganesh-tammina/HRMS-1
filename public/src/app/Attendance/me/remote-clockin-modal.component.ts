import { Component } from '@angular/core';
import { ModalController, IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { WorkFromHomeService } from 'src/app/services/work-from-home.service';
import { AttendanceApiService } from 'src/app/services/attendance-api.service';

@Component({
    selector: 'app-remote-clockin-modal',
    templateUrl: './remote-clockin-modal.component.html',
    styleUrls: ['./remote-clockin-modal.component.scss'],
    standalone: true,
    imports: [IonicModule, CommonModule, FormsModule],
})
export class RemoteClockinModalComponent {
    reason: string = '';
    loading = false;
    existingWFHRequests: any[] = [];
    isCheckingConflicts = false;

    constructor(
        private modalCtrl: ModalController,
        private http: HttpClient,
        private toastCtrl: ToastController,
        private wfhService: WorkFromHomeService,
        private attendanceApi: AttendanceApiService
    ) {
        this.loadExistingWFHRequests();
    }

    async submit() {
        if (!this.reason.trim()) return;

        // Check for existing WFH requests for today
        const today = new Date().toISOString().split('T')[0];
        if (this.hasWFHConflictForToday(today)) {
            this.showToast('You already have a pending or approved WFH request for today. Cannot submit remote clock-in.', 'warning');
            return;
        }

        this.loading = true;
        try {
            // Use WFH endpoint but with work_mode: 'Remote'
            await this.wfhService.remote({
                date: today,
                reason: this.reason
            }).toPromise();

            // Only punch in if not already clocked in
            const isClockedIn = this.attendanceApi.getClockState();
            if (!isClockedIn) {
                await this.attendanceApi.apiPunchIn({
                    work_mode: 'Remote',
                    location: 'Remote',
                    notes: 'Remote Clock-In: ' + this.reason
                }).toPromise();
                // Force UI refresh and set work mode to Remote
                this.attendanceApi.setClockState(true); // ensure clocked in
            }

            this.loading = false;
            await this.modalCtrl.dismiss({ success: true, reason: this.reason, forceRemote: true });
        } catch (err: any) {
            this.loading = false;
            this.showToast(err?.error?.error || 'Failed to submit request', 'danger');
        }
    }

    private loadExistingWFHRequests() {
        this.isCheckingConflicts = true;
        this.wfhService.getAllWFHRequests().subscribe({
            next: (requests: any[]) => {
                // Filter for WFH requests that are NOT rejected or cancelled
                this.existingWFHRequests = (requests || []).filter((req: any) => {
                    if (req.leave_type !== 'WFH') {
                        return false;
                    }
                    const blockingStatuses = ['PENDING', 'APPROVED', 'pending', 'approved'];
                    return blockingStatuses.includes(req.status);
                });
                this.isCheckingConflicts = false;
                console.log('🔍 Existing WFH requests for remote modal:', this.existingWFHRequests);
            },
            error: (err: any) => {
                this.isCheckingConflicts = false;
                console.error('Failed to load WFH requests:', err);
            }
        });
    }

    private hasWFHConflictForToday(today: string): boolean {
        return this.existingWFHRequests.some(req => {
            const reqStart = req.start_date.split('T')[0];
            const reqEnd = req.end_date.split('T')[0];
            return today >= reqStart && today <= reqEnd;
        });
    }

    async close() {
        await this.modalCtrl.dismiss();
    }

    async showToast(message: string, color: 'success' | 'warning' | 'danger') {
        const toast = await this.toastCtrl.create({
            message,
            duration: 2500,
            position: 'top',
            color,
        });
        await toast.present();
    }
}
