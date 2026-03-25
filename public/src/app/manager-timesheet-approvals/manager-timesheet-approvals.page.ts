import { Component, OnInit } from '@angular/core';
import { IonicModule, AlertController, ToastController, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimesheetService } from '../services/timesheets.service';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { TimesheetPreviewComponent } from '../Today_@_Work/work-track/timesheet-preview.component';

@Component({
    selector: 'app-manager-timesheet-approvals',
    standalone: true,
    imports: [IonicModule, CommonModule, FormsModule],
    templateUrl: './manager-timesheet-approvals.page.html',
    styleUrls: ['./manager-timesheet-approvals.page.scss'],
})
export class ManagerTimesheetApprovalsPage implements OnInit {

    pendingTimesheets: any[] = [];
    filteredTimesheets: any[] = [];
    loading = false;
    searchText = '';

    // Team statistics
    teamSize: number = 0;
    submittedCount: number = 0;
    notSubmittedCount: number = 0;
    pendingApprovalsCount: number = 0;
    statisticsLoading = false;

    // Date tracking
    currentDate: string = '';

    // Filter options
    filterType: string = 'all'; // all, regular, project
    startDate: string = '';
    endDate: string = '';

    constructor(
        private timesheetService: TimesheetService,
        private alertController: AlertController,
        private toastController: ToastController,
        private router: Router,
        private modalCtrl: ModalController
    ) { }

    ngOnInit() {
        this.currentDate = new Date().toISOString().split('T')[0];
        this.loadPendingTimesheets();
        this.loadTeamStatistics();
    }

    /* ================= LOAD TEAM STATISTICS ================= */

    loadTeamStatistics() {
        this.statisticsLoading = true;

        const filters: any = {};
        if (this.startDate) filters.start_date = this.startDate;
        if (this.endDate) filters.end_date = this.endDate;

        console.log('🔍 Loading team statistics with filters:', filters);

        this.timesheetService.getManagerTeamStatistics(filters).subscribe({
            next: (res: any) => {
                console.log('✅ Team Statistics Response:', res);
                console.log('📊 Team Size:', res.team_size);
                console.log('✅ Submitted:', res.submitted_count);
                console.log('❌ Not Submitted:', res.not_submitted_count);
                console.log('⏳ Pending:', res.pending_approvals);

                this.teamSize = res.team_size || 0;
                this.submittedCount = res.submitted_count || 0;
                this.notSubmittedCount = res.not_submitted_count || 0;
                this.pendingApprovalsCount = res.pending_approvals || 0;
                this.statisticsLoading = false;
            },
            error: (err) => {
                console.error('❌ Error fetching team statistics:', err);
                console.error('❌ Error details:', err.error);
                this.showToast('Error loading team statistics', 'danger');
                this.statisticsLoading = false;
            }
        });
    }

    /* ================= LOAD PENDING TIMESHEETS ================= */

    loadPendingTimesheets() {
        this.loading = true;

        const filters: any = {};
        if (this.startDate) filters.start_date = this.startDate;
        if (this.endDate) filters.end_date = this.endDate;
        if (this.filterType !== 'all') filters.timesheet_type = this.filterType;

        this.timesheetService.getManagerPendingTimesheets(filters).subscribe({
            next: (res: any[]) => {
                console.log('✅ Pending Timesheets:', res);
                this.pendingTimesheets = res || [];
                this.filteredTimesheets = [...this.pendingTimesheets];
                this.loading = false;
            },
            error: (err) => {
                console.error('❌ Error fetching pending timesheets:', err);
                this.loading = false;
            }
        });
    }

    /* ================= APPROVE TIMESHEET ================= */

    async approveTimesheet(timesheet: any) {
        const confirm = await this.showConfirmDialog(
            'Approve Timesheet',
            `Approve timesheet for ${timesheet.FirstName} ${timesheet.LastName}?`
        );

        if (!confirm) return;

        this.loading = true;
        this.timesheetService.approveTimesheet(timesheet.id).subscribe({
            next: (res) => {
                console.log('✅ Timesheet approved:', res);
                this.showToast('Timesheet approved successfully', 'success');
                this.loadPendingTimesheets();
            },
            error: (err) => {
                console.error('❌ Error approving timesheet:', err);
                this.showToast(err.error?.error || 'Error approving timesheet', 'danger');
                this.loading = false;
            }
        });
    }

    /* ================= REJECT TIMESHEET ================= */

    async rejectTimesheet(timesheet: any) {
        const reason = await this.showReasonDialog(
            'Reject Timesheet',
            `Reject timesheet for ${timesheet.FirstName} ${timesheet.LastName}?`
        );

        if (!reason) return;

        this.loading = true;
        this.timesheetService.rejectTimesheet(timesheet.id, reason).subscribe({
            next: (res) => {
                console.log('✅ Timesheet rejected:', res);
                this.showToast('Timesheet rejected', 'success');
                this.loadPendingTimesheets();
            },
            error: (err) => {
                console.error('❌ Error rejecting timesheet:', err);
                this.showToast(err.error?.error || 'Error rejecting timesheet', 'danger');
                this.loading = false;
            }
        });
    }

    /* ================= VIEW TIMESHEET ================= */

    async viewTimesheet(timesheet: any) {
        const modal = await this.modalCtrl.create({
            component: TimesheetPreviewComponent,
            cssClass: 'side-custom-popup view-work-log',
            componentProps: { data: timesheet },
        });
        await modal.present();
    }

    /* ================= DOWNLOAD EXCEL ================= */

    downloadTimesheet(timesheet: any) {
        if (!timesheet || !timesheet.hours_breakdown?.length) {
            this.showToast('No timesheet data available to download', 'warning');
            return;
        }

        let tableRows = '';

        timesheet.hours_breakdown.forEach((b: any, index: number) => {
            tableRows += `
        <tr>
          <td>${index + 1}</td>
          <td>${b.hour || '-'}</td>
          <td>${b.task || '-'}</td>
          <td>${b.hours || '-'}</td>
        </tr>
      `;
        });

        const formattedDate = this.formatDateDDMMYYYY(new Date(timesheet.date));

        const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head>
      <meta charset="UTF-8" />
    </head>
    <body>
      <table border="1">
        <tr><td>Employee</td><td colspan="3">${timesheet.FirstName} ${timesheet.LastName}</td></tr>
        <tr><td>Date</td><td colspan="3">${formattedDate}</td></tr>
        <tr>
          <th>S.No</th><th>Time</th><th>Task</th><th>Hours</th>
        </tr>
        ${tableRows}
        <tr><td>Note</td><td colspan="3">${timesheet.notes || '-'}</td></tr>
        <tr><td>Total</td><td colspan="3">${timesheet.total_hours}</td></tr>
      </table>
    </body>
    </html>
    `;

        const blob = new Blob([html], {
            type: 'application/vnd.ms-excel;charset=utf-8;'
        });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Timesheet_${timesheet.FirstName}_${formattedDate}.xls`;
        link.click();
        URL.revokeObjectURL(link.href);
        this.showToast('Timesheet downloaded successfully', 'success');
    }

    /* ================= FILTER METHODS ================= */

    onFilterTypeChange(event: any) {
        this.filterType = event.detail.value;
        this.loadPendingTimesheets();
    }

    onDateRangeChange() {
        if (this.startDate && this.endDate) {
            this.loadPendingTimesheets();
            this.loadTeamStatistics();
        }
    }

    clearFilters() {
        this.filterType = 'all';
        this.startDate = '';
        this.endDate = '';
        this.searchText = '';
        this.loadPendingTimesheets();
        this.loadTeamStatistics();
    }

    /* ================= SEARCH ================= */

    filterTimesheets() {
        const text = this.searchText.toLowerCase();

        this.filteredTimesheets = this.pendingTimesheets.filter(t =>
            t.FirstName?.toLowerCase().includes(text) ||
            t.LastName?.toLowerCase().includes(text) ||
            t.WorkEmail?.toLowerCase().includes(text) ||
            t.project_name?.toLowerCase().includes(text)
        );
    }

    /* ================= UTILITY METHODS ================= */

    getStatusColor(status: string): string {
        switch (status) {
            case 'submitted': return 'warning';
            case 'approved': return 'success';
            case 'rejected': return 'danger';
            default: return 'medium';
        }
    }

    getTimesheetTypeIcon(type: string): string {
        return type === 'project' ? 'briefcase-outline' : 'time-outline';
    }

    formatTime(time: string | null): string {
        if (!time) return '--:--';
        const date = new Date(time);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    formatDate(date: string | null): string {
        if (!date) return '--';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    formatDateDDMMYYYY(date: Date): string {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // 0-based
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
    }

    getProfileImage(timesheet: any): string {
        if (timesheet?.profile_image) {
            return `http://${environment.apiURL}${timesheet.profile_image}?t=${Date.now()}`;
        }
        return 'assets/user.svg';
    }

    getDateRangeText(): string {
        if (this.startDate && this.endDate) {
            return `${this.formatDate(this.startDate)} - ${this.formatDate(this.endDate)}`;
        }
        return 'Current Month';
    }

    getTodayFormatted(): string {
        return this.formatDate(this.currentDate);
    }

    /* ================= DIALOG HELPERS ================= */

    private async showConfirmDialog(header: string, message: string): Promise<boolean> {
        const alert = await this.alertController.create({
            header: header,
            message: message,
            buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel'
                },
                {
                    text: 'Confirm',
                    role: 'confirm'
                }
            ]
        });

        await alert.present();
        const { role } = await alert.onDidDismiss();
        return role === 'confirm';
    }

    private async showReasonDialog(header: string, message: string): Promise<string | null> {
        const alert = await this.alertController.create({
            header: header,
            message: message,
            inputs: [
                {
                    name: 'rejection_reason',
                    type: 'textarea',
                    placeholder: 'Rejection reason (required)'
                }
            ],
            buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel'
                },
                {
                    text: 'Reject',
                    role: 'reject',
                    handler: (data) => {
                        if (!data.rejection_reason?.trim()) {
                            this.showToast('Rejection reason is required', 'warning');
                            return false;
                        }
                        return true;
                    }
                }
            ]
        });

        await alert.present();
        const { data, role } = await alert.onDidDismiss();

        if (role === 'reject' && data?.values?.rejection_reason?.trim()) {
            return data.values.rejection_reason;
        }

        return null;
    }

    private async showToast(message: string, color: string) {
        const toast = await this.toastController.create({
            message: message,
            duration: 2000,
            color: color,
            position: 'top'
        });

        await toast.present();
    }

    /* ================= REFRESH ================= */

    handleRefresh(event: any) {
        this.loadPendingTimesheets();
        this.loadTeamStatistics();
        setTimeout(() => {
            event.target.complete();
        }, 1000);
    }
    async goBack() {
        await this.modalCtrl.dismiss();
        // No alert, just close the modal
    }
}
