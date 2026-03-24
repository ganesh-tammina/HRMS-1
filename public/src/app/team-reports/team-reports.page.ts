import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, LoadingController, ModalController } from '@ionic/angular';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EmployeeService } from '../services/employee.service';
import { TimesheetService } from '../services/timesheets.service';
import { LeaveService } from '../services/leave.service';
import { LeaverequestService } from '../services/leaverequest.service';
import { environment } from 'src/environments/environment';
import { TimesheetPreviewComponent } from '../Today_@_Work/work-track/timesheet-preview.component';

@Component({
    selector: 'app-team-reports',
    templateUrl: './team-reports.page.html',
    styleUrls: ['./team-reports.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule]
})
export class TeamReportsPage implements OnInit {

    reportType: 'timesheet' | 'leave' | 'attendance' | 'client-timesheet' = 'attendance';
    startDate: string = '';
    endDate: string = '';

    reportData: any[] = [];
    teamBalances: any[] = [];
    loading = false;
    leaveView: 'history' | 'balances' = 'history';

    // Stats for the selected report
    stats = {
        total: 0,
        present: 0,
        absent: 0,
        onLeave: 0,
        pending: 0,
        approved: 0,
        rejected: 0
    };

    statusFilter: string = 'ALL';

    selectedMonth: number = new Date().getMonth();
    selectedYear: number = new Date().getFullYear();
    months = [
        { name: 'January', value: 0 },
        { name: 'February', value: 1 },
        { name: 'March', value: 2 },
        { name: 'April', value: 3 },
        { name: 'May', value: 4 },
        { name: 'June', value: 5 },
        { name: 'July', value: 6 },
        { name: 'August', value: 7 },
        { name: 'September', value: 8 },
        { name: 'October', value: 9 },
        { name: 'November', value: 10 },
        { name: 'December', value: 11 }
    ];
    years: number[] = [];

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private employeeService: EmployeeService,
        private timesheetService: TimesheetService,
        private leaveService: LeaveService,
        private leaveRequestService: LeaverequestService,
        private toastCtrl: ToastController,
        private loadingCtrl: LoadingController,
        private modalCtrl: ModalController,
        private location: Location
    ) {
        const currentYear = new Date().getFullYear();
        for (let i = 0; i < 5; i++) {
            this.years.push(currentYear - i);
        }
    }

    ngOnInit() {
        // Check for query parameter to set report type
        this.route.queryParams.subscribe(params => {
            if (params['type'] && ['timesheet', 'leave', 'attendance', 'client-timesheet'].includes(params['type'])) {
                this.reportType = params['type'] as any;
            }
        });

        this.updateDatesFromMonthYear();
    }

    updateDatesFromMonthYear() {
        const start = new Date(this.selectedYear, this.selectedMonth, 1);
        const end = new Date(this.selectedYear, this.selectedMonth + 1, 0);

        const formatDate = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        this.startDate = formatDate(start);
        this.endDate = formatDate(end);
        this.fetchReport();
    }

    onReportTypeChange() {
        this.statusFilter = 'ALL';
        this.fetchReport();
    }

    onFiltersChange() {
        if (this.startDate && this.endDate) {
            this.statusFilter = 'ALL'; // Reset filter when date changes
            this.fetchReport();
        }
    }

    setFilter(status: string) {
        this.statusFilter = status;
    }

    goBack() {
        this.location.back();
    }

    get filteredReportData() {
        if (this.statusFilter === 'ALL') {
            return this.reportData;
        }

        // Normalize status for comparison
        return this.reportData.filter(item => {
            const status = (item.status || '').toUpperCase();
            return status === this.statusFilter;
        });
    }

    async fetchReport() {
        this.loading = true;
        this.reportData = [];
        this.teamBalances = [];

        try {
            if (this.reportType === 'attendance') {
                this.fetchAttendanceReport();
            } else if (this.reportType === 'leave') {
                this.fetchLeaveReport();
            } else if (this.reportType === 'timesheet') {
                this.fetchTimesheetReport();
            } else if (this.reportType === 'client-timesheet') {
                this.fetchClientTimesheetReport();
            }
        } catch (error) {
            console.error('Error fetching report:', error);
            this.showToast('Failed to load report data', 'danger');
            this.loading = false;
        }
    }

    private fetchAttendanceReport() {
        this.loading = true;
        this.employeeService.getTeamAttendanceReportByRange(this.startDate, this.endDate).subscribe({
            next: (data: any[]) => {
                this.reportData = (data || []).map(a => ({
                    ...a,
                    employee_name: a.FullName || `${a.FirstName} ${a.LastName}`,
                    status: (a.status || 'ABSENT').toUpperCase()
                }));

                // Calculate Stats
                this.stats.total = this.reportData.length;
                this.stats.present = this.reportData.filter(a => a.status === 'PRESENT').length;
                this.stats.absent = this.reportData.filter(a => a.status === 'ABSENT').length;
                this.stats.onLeave = this.reportData.filter(a => a.status === 'ON-LEAVE').length;

                this.loading = false;
            },
            error: (err) => {
                console.error('Attendance Report Error:', err);
                this.showToast('Error loading attendance report', 'danger');
                this.loading = false;
            }
        });
    }

    private fetchLeaveReport() {
        this.loading = true;
        this.reportData = [];
        this.teamBalances = [];

        // Fetch all team leaves (Pending, Approved, Rejected) in one call
        this.leaveRequestService.getTeamLeaveReport(this.startDate, this.endDate).subscribe({
            next: (leaves: any[]) => {
                this.reportData = (leaves || []).map((l: any) => ({
                    ...l,
                    FirstName: l.FirstName || l.FullName?.split(' ')[0] || 'Employee',
                    LastName: l.LastName || l.FullName?.split(' ').slice(1).join(' ') || '',
                    applied_at: l.applied_at || l.created_at || l.applied_on,
                    total_days: l.total_days || l.days || 1,
                    leave_type: l.leave_type || l.type_name || 'Leave',
                    status: (l.status || 'PENDING').toUpperCase()
                }));

                this.updateLeaveStats(this.reportData);

                // Fetch team list only for balances (non-blocking for history)
                this.employeeService.getMyTeamList().subscribe({
                    next: (members: any[]) => {
                        if (members && members.length > 0) {
                            this.fetchLeaveBalances(members);
                        }
                    }
                });

                this.loading = false;
            },
            error: (err) => {
                console.error('Team Leave Report Error:', err);
                this.showToast('Error loading leave report', 'danger');
                this.loading = false;
            }
        });
    }

    private fetchLeaveBalances(members: any[]) {
        members.forEach((m: any) => {
            this.leaveService.getLeaveBalance(m.employee_id || m.id).pipe(
                catchError(() => of(null))
            ).subscribe((b: any) => {
                if (b) {
                    const employeeId = m.employee_id || m.id;
                    const existing = this.teamBalances.find(tb => (tb.employee_id || tb.id) === employeeId);
                    if (!existing) {
                        this.teamBalances.push({
                            ...m,
                            annual: b.annual_leave || 0,
                            casual: b.casual_leave || 0,
                            sick: b.sick_leave || 0,
                            used: b.used_leaves || 0,
                            remaining: b.remaining_leaves || 0
                        });
                    }
                }
            });
        });
    }


    private updateLeaveStats(data: any[]) {
        this.stats.pending = data.filter(l => (l.status || '').toUpperCase() === 'PENDING' || !l.status).length;
        this.stats.approved = data.filter(l => (l.status || '').toUpperCase() === 'APPROVED').length;
        this.stats.rejected = data.filter(l => (l.status || '').toUpperCase() === 'REJECTED').length;
    }

    private updateTimesheetStats(data: any[]) {
        this.stats.pending = data.filter(t => (t.status || '').toUpperCase() === 'PENDING').length;
        this.stats.approved = data.filter(t => (t.status || '').toUpperCase() === 'APPROVED').length;
        this.stats.rejected = data.filter(t => (t.status || '').toUpperCase() === 'REJECTED').length;
    }

    private fetchTimesheetReport() {
        this.loading = true;
        this.timesheetService.getTeamTimesheetReport(this.startDate, this.endDate).subscribe({
            next: (data: any[]) => {
                this.reportData = (data || []).map(t => {
                    let status = (t.status || 'PENDING').toUpperCase();
                    if (status === 'SUBMITTED') status = 'PENDING';
                    if (status === 'VERIFIED') status = 'APPROVED';

                    return {
                        ...t,
                        status: status,
                        FirstName: t.FirstName || t.FullName?.split(' ')[0],
                        LastName: t.LastName || t.FullName?.split(' ').slice(1).join(' ')
                    };
                });
                this.updateTimesheetStats(this.reportData);
                this.loading = false;
            }
        });
    }

    private fetchClientTimesheetReport() {
        this.loading = true;
        // The API month is 1-12, but selectedMonth is 0-11
        this.timesheetService.getClientTimesheetReport(this.selectedMonth + 1, this.selectedYear).subscribe({
            next: (data: any[]) => {
                this.reportData = (data || []).map(r => ({
                    ...r,
                    status: (r.validation_status || 'PENDING').toUpperCase()
                }));
                this.stats.total = this.reportData.length;
                this.stats.pending = this.reportData.filter(r => r.status === 'PENDING_VALIDATION' || r.status === 'PENDING').length;
                this.stats.approved = this.reportData.filter(r => r.status === 'VALIDATED' || r.status === 'APPROVED').length;
                this.stats.rejected = this.reportData.filter(r => r.status === 'REJECTED').length;
                this.loading = false;
            },
            error: (err) => {
                console.error('Client Timesheet Report Error:', err);
                this.showToast('Error loading client timesheet report', 'danger');
                this.loading = false;
            }
        });
    }

    downloadReport() {
        if (!this.reportData || this.reportData.length === 0) {
            this.showToast('No data to download', 'warning');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";

        if (this.reportType === 'attendance') {
            csvContent += "Employee,Email,Status,Date,Work Mode\n";
            this.reportData.forEach((row: any) => {
                csvContent += `${row.employee_name},${row.email},${row.status},${row.date},${row.work_mode || '-'}\n`;
            });
        } else if (this.reportType === 'leave') {
            csvContent += "Employee,Type,From,To,Days,Status\n";
            this.reportData.forEach((row: any) => {
                csvContent += `${row.FirstName} ${row.LastName},${row.type_name || row.leave_type},${row.start_date},${row.end_date},${row.total_days},${row.status}\n`;
            });
        } else {
            csvContent += "Employee,Project,Date,Hours,Status\n";
            this.reportData.forEach((row: any) => {
                csvContent += `${row.FirstName} ${row.LastName},${row.project_name || 'Regular'},${row.date},${row.total_hours},${row.status}\n`;
            });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Team_${this.reportType}_Report_${this.startDate}_to_${this.endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        this.showToast('Report downloaded as CSV', 'success');
    }

    async viewTimesheet(timesheet: any) {
        const modal = await this.modalCtrl.create({
            component: TimesheetPreviewComponent,
            cssClass: 'side-custom-popup view-work-log',
            componentProps: { data: timesheet },
        });
        await modal.present();
    }

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
            <html>
            <head><meta charset="UTF-8" /></head>
            <body>
                <table border="1">
                    <tr><td>Employee</td><td colspan="3">${timesheet.FirstName} ${timesheet.LastName}</td></tr>
                    <tr><td>Date</td><td colspan="3">${formattedDate}</td></tr>
                    <tr><th>S.No</th><th>Time</th><th>Task</th><th>Hours</th></tr>
                    ${tableRows}
                    <tr><td>Note</td><td colspan="3">${timesheet.notes || '-'}</td></tr>
                    <tr><td>Total</td><td colspan="3">${timesheet.total_hours}</td></tr>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Timesheet_${timesheet.FirstName}_${formattedDate}.xls`;
        link.click();
        URL.revokeObjectURL(link.href);
        this.showToast('Timesheet downloaded successfully', 'success');
    }

    private formatDateDDMMYYYY(date: Date): string {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }

    getProfileImage(row: any): string {
        if (row?.profile_image) {
            let path = row.profile_image.replace(/\\/g, '/');
            if (!path.startsWith('/')) path = '/' + path;
            return `http://${environment.apiURL}${path}?t=${Date.now()}`;
        }
        return 'assets/user.svg';
    }

    viewClientFile(item: any) {
        if (!item.client_file) return;
        const filePath = item.client_file.replace(/\\/g, '/');
        const url = `http://${environment.apiURL}/${filePath}`;
        window.open(url, '_blank');
    }

    downloadClientFile(item: any) {
        if (!item.client_file) return;
        const filePath = item.client_file.replace(/\\/g, '/');
        const url = `http://${environment.apiURL}/${filePath}`;
        
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        // Extract filename from path
        const fileName = filePath.split('/').pop() || 'client_timesheet';
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async showToast(msg: string, color: string = 'dark') {
        const toast = await this.toastCtrl.create({
            message: msg,
            duration: 2000,
            color: color,
            position: 'top'
        });
        toast.present();
    }
}
