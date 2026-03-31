import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavController, ModalController } from '@ionic/angular';
import { EmployeeService } from '../../../core/services/employee.service';
import { AttendanceApiService } from '../../../core/services/attendance-api.service';
import { environment } from 'src/environments/environment';
import { ManagerLeaveApprovalsComponent } from './manager-leave-approvals/manager-leave-approvals.component';
import { ManagerTimesheetApprovalsComponent } from './manager-timesheet-approvals/manager-timesheet-approvals.component';
import { ManagerWfhApprovalsComponent } from './manager-wfh-approvals/manager-wfh-approvals.component';
import { TeamReportComponent } from './team-report/team-report.component';

@Component({
  selector: 'app-my-team',
  templateUrl: './my-team.page.html',
  styleUrls: ['./my-team.page.scss'],
  standalone: false
})
export class MyTeamPage implements OnInit, OnDestroy {
  teamMembers: any[] = [];
  filteredTeam: any[] = [];
  isLoading = false;

  attendanceStatuses: { [key: number]: any } = {};
  pollingInterval: any;

  searchTerm: string = '';
  isManager = false;
  userRole: string | null = null;
  teamAttendanceSummary: any = null;

  selectedDate: string = new Date().toISOString();
  maxDate: string = new Date().toISOString();
  currentFilter: string = 'all';
  counts = {
    total: 0,
    present: 0,
    absent: 0,
    onLeave: 0,
    notPunched: 0
  };

  constructor(
    private employeeService: EmployeeService,
    private attendanceService: AttendanceApiService,
    private navCtrl: NavController,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    this.updateRole();
    this.loadTeamMembers();
  }

  /* ===================== ROLE ===================== */
  private updateRole() {
    this.userRole = (localStorage.getItem('role') || '').toLowerCase();
    this.isManager = (this.userRole === 'manager' || this.userRole === 'hr');
  }

  setFilter(status: string) {
    this.currentFilter = status;
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.teamMembers];

    // Status Filter
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(m => {
        const stats = this.getRealTimeStatus(m.id);
        const status = (stats.status || '').toLowerCase();
        if (this.currentFilter === 'present') return status === 'in' || status === 'present' || status.includes('in') || status === 'wfh';
        if (this.currentFilter === 'absent') return status === 'absent';
        if (this.currentFilter === 'on_leave') return status.includes('leave') || status === 'on_leave';
        if (this.currentFilter === 'not_punched') return status === 'not_punched' || status === 'not_checked_in' || status === 'out' || !status;
        return true;
      });
    }

    // Search Filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(member => {
        return (
          member.FirstName?.toLowerCase().includes(term) ||
          member.LastName?.toLowerCase().includes(term) ||
          member.WorkEmail?.toLowerCase().includes(term) ||
          member.DesignationCode?.toLowerCase().includes(term)
        );
      });
    }

    this.filteredTeam = filtered;
    console.log(this.filteredTeam);
  }

  ionViewWillEnter() {
    this.startAttendancePolling();
  }

  ionViewWillLeave() {
    this.stopAttendancePolling();
  }

  ngOnDestroy() {
    this.stopAttendancePolling();
  }

  loadTeamMembers() {
    this.isLoading = true;
    const selectedDate = this.selectedDate.split('T')[0];

    this.employeeService.getTeamAttendanceReport(selectedDate).subscribe({
      next: (res: any) => {
        if (res?.team_members) {
          this.teamMembers = res.team_members;
        } else {
          if (this.teamMembers.length === 0) {
            this.fetchBaseTeamList(selectedDate);
            return;
          }
        }
        this.processAttendanceData(res);
      },
      error: (error: any) => {
        console.error('Error fetching team report:', error);
        this.fetchBaseTeamList(selectedDate);
      }
    });
  }

  fetchBaseTeamList(date: string) {
    this.employeeService.getMyTeamList().subscribe({
      next: (res: any) => {
        this.teamMembers = res?.team || (Array.isArray(res) ? res : []);
        this.employeeService.getTeamAttendanceReport(date).subscribe({
          next: (reportRes) => this.processAttendanceData(reportRes),
          error: () => this.processAttendanceData({})
        });
      },
      error: (err) => {
        console.error('Failed to load team list:', err);
        this.isLoading = false;
      }
    });
  }

  processAttendanceData(res: any) {
    const attendanceList = res.attendance || [];
    const leaveList = res.on_leave || [];
    const newStatuses: any = {};
    const isToday = this.isTodaySelected();

    this.teamMembers.forEach(m => {
      newStatuses[m.id] = {
        status: isToday ? 'not_punched' : 'absent'
      };
    });

    attendanceList.forEach((att: any) => {
      newStatuses[att.employee_id] = {
        status: att.status || (isToday ? 'in' : 'present'),
        first_in: att.first_in,
        last_out: att.last_out,
        total_hours: att.total_hours
      };
    });

    leaveList.forEach((leave: any) => {
      newStatuses[leave.employee_id] = {
        status: 'on_leave',
        leave_type: leave.leave_type
      };
    });

    this.attendanceStatuses = newStatuses;
    this.filteredTeam = [...this.teamMembers];

    if (res.summary && !isToday) {
      this.counts = {
        total: res.summary.total_team || this.teamMembers.length,
        present: res.summary.present || 0,
        absent: res.summary.absent || 0,
        onLeave: res.summary.on_leave || 0,
        notPunched: 0
      };
    } else {
      this.calculateCounts();
    }

    this.applyFilters();
    this.isLoading = false;
  }

  calculateCounts() {
    const isToday = this.isTodaySelected();
    this.counts = {
      total: this.teamMembers.length,
      present: 0,
      absent: 0,
      onLeave: 0,
      notPunched: 0
    };

    this.teamMembers.forEach(m => {
      const stats = this.getRealTimeStatus(m.id);
      const status = (stats.status || '').toLowerCase();

      if (status === 'in' || status === 'present' || status.includes('in') || status === 'wfh') {
        this.counts.present++;
      } else if (status.includes('leave') || status === 'on_leave') {
        this.counts.onLeave++;
      } else if (status === 'absent') {
        this.counts.absent++;
      } else {
        if (!isToday) {
          this.counts.absent++;
        } else {
          this.counts.notPunched++;
        }
      }
    });
  }

  getProfileImage(member: any): string {
    if (member?.profile_image) {
      if (member.profile_image.startsWith('http')) return member.profile_image;
      return `http://${environment.apiURL}${member.profile_image}?t=${Date.now()}`;
    }
    return '../../assets/Profile_Picture.png';
  }

  handleRefresh(event: any) {
    this.loadTeamMembers();
    setTimeout(() => {
      event.target.complete();
    }, 1500);
  }

  filterTeam(event: any) {
    this.searchTerm = event.target.value || '';
    this.applyFilters();
  }

  getInitials(firstName: string, lastName: string): string {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  }

  getAvatarColor(id: number): string {
    const colors = ['#E6E6FA', '#F0F8FF', '#F5FFFA', '#FFF0F5', '#FDF5E6', '#F0FFF0'];
    return colors[id % colors.length];
  }

  async navigateToLeaveApprovals() {
    const modal = await this.modalCtrl.create({
      component: ManagerLeaveApprovalsComponent,
      cssClass: 'side-custom-popup team-popup',
      backdropDismiss: false,
    });
    await modal.present();
  }

  async navigateToTimesheetApprovals() {
    const modal = await this.modalCtrl.create({
      component: ManagerTimesheetApprovalsComponent,
      cssClass: 'side-custom-popup timesheet-popup',
      backdropDismiss: false,
    });
    await modal.present();
  }

  async navigateToAttendanceApprovals() {
    const modal = await this.modalCtrl.create({
      component: ManagerWfhApprovalsComponent,
      cssClass: 'side-custom-popup team-popup',
      backdropDismiss: false,
    });
    await modal.present();
  }

  async navigateToTeamReports() {
    const modal = await this.modalCtrl.create({
      component: TeamReportComponent,
      cssClass: 'side-custom-popup team-report-popup',
      backdropDismiss: false,
    });
    await modal.present();
  }

  navigateToMyTeam() {
    this.currentFilter = 'all';
    this.resetToToday();
  }

  onDateChange(event: any) {
    if (event.detail.value) {
      this.selectedDate = event.detail.value;
      this.loadTeamMembers();
    }
  }

  resetToToday() {
    this.selectedDate = new Date().toISOString();
    this.loadTeamMembers();
  }

  isTodaySelected(): boolean {
    const today = new Date().toISOString().split('T')[0];
    const selected = this.selectedDate.split('T')[0];
    return today === selected;
  }

  startAttendancePolling() {
    this.pollingInterval = setInterval(() => {
      if (this.isTodaySelected()) {
        this.loadTeamMembers();
      }
    }, 180000);
  }

  stopAttendancePolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  getRealTimeStatus(employeeId: number): any {
    return this.attendanceStatuses[employeeId] || { status: this.isTodaySelected() ? 'not_punched' : 'absent' };
  }

  getDisplayStatusText(employeeId: number): string {
    const status = (this.getRealTimeStatus(employeeId).status || '').toLowerCase();
    if (status === 'in' || status === 'present' || status.includes('in') || status === 'wfh') return 'PRESENT';
    if (status.includes('leave') || status === 'on_leave') return 'ON LEAVE';
    if (status === 'absent') return 'ABSENT';
    if (status === 'not_punched') return 'NOT PUNCHED';
    return 'OUT';
  }

  getDisplayStatusClass(employeeId: number): string {
    const status = (this.getRealTimeStatus(employeeId).status || '').toLowerCase();
    if (status === 'in' || status === 'present' || status.includes('in') || status === 'wfh') return 'present';
    if (status.includes('leave') || status === 'on_leave') return 'leave-status';
    if (status === 'absent') return 'absent';
    return 'not-punched-status';
  }
}
