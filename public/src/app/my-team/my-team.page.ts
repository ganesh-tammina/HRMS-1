import { ManagerTimesheetApprovalsPage } from './../manager-timesheet-approvals/manager-timesheet-approvals.page';
import { AttendanceApiService } from '../services/attendance-api.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { EmployeeService } from '../services/employee.service';
import { RouteGuardService } from '../services/route-guard/route-service/route-guard.service';
import { environment } from 'src/environments/environment';
import { Subject, takeUntil } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ManagerLeaveApprovalsPage } from '../manager-leave-approvals/manager-leave-approvals.page';
import { ManagerWfhApprovalsPage } from '../manager-wfh-approvals/manager-wfh-approvals.page';

@Component({
  selector: 'app-my-team',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './my-team.page.html',
  styleUrls: ['./my-team.page.scss'],
})
export class MyTeamPage implements OnInit, OnDestroy {
  // Handler for On Leave card click (fix for TS2339/TS2663)
  onOnLeaveCardClick() {
    this.showOnLeaveList = !this.showOnLeaveList;
  }
  // Toggle for showing on-leave employees list
  showOnLeaveList: boolean = false;
  // List of employees on leave today (from backend)
  onLeaveToday: any[] = [];

  searchText = '';
  teamMembers: any[] = [];
  filteredMembers: any[] = [];
  loading = true;
  env: string = '';
  userRole: string | null = null;

  // Attendance data
  selectedDate: string = new Date().toISOString().split('T')[0];
  attendanceData: any = null;
  attendanceSummary: any = null;
  showAttendance = false;
  attendanceFilter: string = 'all'; // all, present, absent, on_leave

  private destroy$ = new Subject<void>();
  private profileImageCache = new Map<number, string>();

  // Real-time attendance status tracking
  employeeStatusMap: { [key: number]: { status: string; work_mode: string | null; last_punch_time: string | null } } = {};
  statusRefreshInterval: any = null;


  // Manager Remote Clock-In Requests
  pendingRemoteClockinRequests: any[] = [];
  isManager: boolean = false;
  remoteDecisionLoading: { [id: number]: boolean } = {};

  constructor(
    private employeeService: EmployeeService,
    private routeGuardService: RouteGuardService,
    private router: Router,
    private http: HttpClient,
    private attendanceApi: AttendanceApiService,
    private modalCtrl: ModalController
  ) {
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateRole();
      }
    });
  }


  ngOnInit() {
    console.log('🚀 My Team Component Initialized');
    console.log('⏰ Setting up 30-second auto-refresh for attendance status');
    this.subscribeToProfileImageUpdates();
    this.updateRole();

    if (this.isManager) {
      this.loadPendingRemoteClockinRequests();
    }
    this.loadTeamData();

    // Refresh attendance status every 30 seconds for real-time updates
    this.statusRefreshInterval = setInterval(() => {
      this.loadEmployeeAttendanceStatus();
    }, 30000); // Changed from 120000 (2 min) to 30000 (30 sec)
  }

  /** MANAGER: Load pending remote clock-in requests for approval */
  loadPendingRemoteClockinRequests() {
    this.attendanceApi.getPendingRemoteClockinRequests().subscribe({
      next: (res) => {
        this.pendingRemoteClockinRequests = res || [];
      },
      error: (err) => {
        this.pendingRemoteClockinRequests = [];
        console.error('Error loading pending remote clock-in requests:', err);
      }
    });
  }

  /** MANAGER: Approve/Reject remote clock-in request */
  decideRemoteClockinRequest(id: number, decision: 'approved' | 'rejected', rejected_reason?: string) {
    this.remoteDecisionLoading[id] = true;
    this.attendanceApi.decideRemoteClockinRequest(id, decision, rejected_reason).subscribe({
      next: () => {
        this.pendingRemoteClockinRequests = this.pendingRemoteClockinRequests.filter(r => r.id !== id);
        this.remoteDecisionLoading[id] = false;
      },
      error: (err) => {
        this.remoteDecisionLoading[id] = false;
        alert('Failed to process request: ' + (err?.error?.error || err.message));
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.statusRefreshInterval) {
      clearInterval(this.statusRefreshInterval);
    }
  }

  /* ================= PROFILE IMAGE SUBSCRIPTION ================= */

  subscribeToProfileImageUpdates() {
    this.employeeService.profileImageUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe((imageUrl: string | null) => {
        if (imageUrl) {
          console.log('📸 My Team: Profile image update received:', imageUrl);
          // Refresh team data to get updated images
          if (this.showAttendance) {
            this.loadAttendanceData();
          } else {
            this.loadTeamData();
          }
        }
      });
  }

  /* ================= LOAD TEAM DATA ================= */

  loadTeamData() {
    this.loading = true;
    this.env = environment.apiURL.startsWith('http') ? environment.apiURL : `http://${environment.apiURL}`;

    // Get user role from RouteGuardService
    this.userRole = this.routeGuardService.userRole?.toLowerCase() || null;

    console.log('🔍 Loading Team Data - User Role:', this.userRole);

    // Use getMyTeamList for ALL roles - server handles manager vs employee logic
    this.employeeService.getMyTeamList().subscribe({
      next: (res: any) => {

        // Handle different response formats
        if (res?.team) {
          this.teamMembers = res.team;
          console.log('✅ My Team API Response:', this.teamMembers);

        } else if (Array.isArray(res)) {
          this.teamMembers = res;
        } else {
          this.teamMembers = [];
        }

        this.filteredMembers = [...this.teamMembers];
        console.log('✅ Team Members:', this.filteredMembers);
        console.log('✅ Team Members Count:', this.teamMembers.length);
        console.log('✅ Team Type:', res?.type || 'unknown');

        // Load real-time attendance status for regular view
        if (this.teamMembers.length > 0) {
          this.loadEmployeeAttendanceStatus();
        }

        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error fetching team list:', err);
        console.error('❌ Error details:', err.error);
        this.loading = false;
      }
    });
  }

  /* ================= LOAD ATTENDANCE DATA ================= */

  loadAttendanceData() {
    this.showAttendance = true;
    this.loading = true;

    this.employeeService.getTeamAttendanceReport(this.selectedDate).subscribe({
      next: (res: any) => {
        console.log('✅ Full Attendance Report Response:', res);

        const teamMembersData = res.team_members || [];
        this.attendanceData = res.attendance || [];
        this.attendanceSummary = res.summary || null;
        this.onLeaveToday = res.on_leave || [];
        this.showOnLeaveList = false; // Reset on new load

        console.log('✅ Team Members Count:', teamMembersData.length);
        console.log('✅ Attendance Records Count:', this.attendanceData.length);
        console.log('✅ On Leave Today:', this.onLeaveToday);
        console.log('✅ Summary:', this.attendanceSummary);

        // Merge attendance data into existing team members (preserves all original fields like location_name, department_name, etc.)
        this.teamMembers = this.teamMembers.map((member: any) => {
          const memberId = member.id || member.employee_id;
          const attendanceRecord = this.attendanceData.find((att: any) => att.employee_id === memberId || att.id === memberId);
          const leaveRecord = this.onLeaveToday.find((leave: any) => leave.employee_id === memberId || leave.id === memberId);

          if (leaveRecord) {
            return {
              ...member,
              attendance: {
                status: 'on_leave',
                attendance: { leave_type: leaveRecord.type_name || leaveRecord.leave_type || 'Leave' }
              }
            };
          }

          return {
            ...member,
            attendance: attendanceRecord ? {
              status: attendanceRecord.status || 'present',
              attendance: {
                check_in: attendanceRecord.first_check_in,
                check_out: attendanceRecord.last_check_out,
                total_hours: attendanceRecord.gross_hours || attendanceRecord.total_work_hours,
                work_mode: attendanceRecord.work_mode,
                location: attendanceRecord.location,
                total_punches: attendanceRecord.total_punches
              }
            } : {
              status: 'absent',
              attendance: null
            }
          };
        });

        console.log('✅ Mapped Team Members:', this.teamMembers.length);
        console.log('✅ First mapped member:', this.teamMembers[0]);

        this.applyAttendanceFilter();
        console.log('✅ Filtered Members after filter:', this.filteredMembers.length);
        console.log('✅ Current filter:', this.attendanceFilter);

        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error fetching attendance report:', err);
        this.loading = false;
      }
    });
  }

  /* ================= DATE CHANGE ================= */

  onDateChange(event: any) {
    this.selectedDate = event.detail.value.split('T')[0];
    this.loadAttendanceData();
  }

  /* ================= TOGGLE ATTENDANCE VIEW ================= */

  toggleAttendanceView() {
    if (!this.showAttendance) {
      this.loadAttendanceData();
    } else {
      this.showAttendance = false;
      this.attendanceFilter = 'all';
      // Reload original team members
      this.ngOnInit();
    }
  }

  /* ================= FILTER ATTENDANCE ================= */

  setAttendanceFilter(filter: string) {
    this.attendanceFilter = filter;
    this.applyAttendanceFilter();
  }

  applyAttendanceFilter() {
    if (this.attendanceFilter === 'all') {
      this.filteredMembers = [...this.teamMembers];
    } else {
      this.filteredMembers = this.teamMembers.filter((member: any) => {
        const status = this.getAttendanceStatus(member);
        return status === this.attendanceFilter;
      });
    }
  }

  /* ================= GET ATTENDANCE STATUS ================= */

  getAttendanceStatus(member: any): string {

    return member?.attendance?.status || 'absent';
  }

  getAttendanceBadgeColor(status: string): string {
    switch (status) {
      case 'present': return 'success';
      case 'on_leave': return 'warning';
      case 'absent': return 'danger';
      default: return 'medium';
    }
  }

  getAttendanceIcon(status: string): string {
    switch (status) {
      case 'present': return 'checkmark-circle';
      case 'on_leave': return 'calendar-outline';
      case 'absent': return 'close-circle';
      default: return 'help-circle';
    }
  }

  formatTime(time: string | null): string {
    if (!time) return '--:--';
    const date = new Date(time);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  formatHours(hours: number | null): string {
    if (!hours) return '0h 0m';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  }

  /* ================= PROFILE IMAGE ================= */

  getProfileImage(member: any): string {
    if (member?.profile_image) {
      // Use cached URL if available, otherwise construct with cache-buster
      const employeeId = member.id || member.employee_id;
      if (this.profileImageCache.has(employeeId)) {
        return this.profileImageCache.get(employeeId)!;
      }

      const imageUrl = `http://${environment.apiURL}${member.profile_image}?t=${Date.now()}`;
      this.profileImageCache.set(employeeId, imageUrl);
      return imageUrl;
    }
    return 'assets/user.svg';
  }

  /* ================= SEARCH ================= */

  filterTeam() {
    const text = this.searchText.toLowerCase();

    this.filteredMembers = this.teamMembers.filter(m =>
      m.FullName?.toLowerCase().includes(text) ||
      m.WorkEmail?.toLowerCase().includes(text) ||
      m.department_name?.toLowerCase().includes(text)
    );
  }

  /* ================= REAL-TIME ATTENDANCE STATUS ================= */

  loadEmployeeAttendanceStatus() {
    console.log('📡 loadEmployeeAttendanceStatus() called');

    if (!this.teamMembers || this.teamMembers.length === 0) {
      console.log('⚠️ No team members to check status for');
      return;
    }

    const employeeIds = this.teamMembers
      .map(m => m.id)
      .filter(id => id != null);

    console.log('👥 Team Members:', this.teamMembers.length);
    console.log('🆔 Employee IDs to check:', employeeIds);

    if (employeeIds.length === 0) {
      console.log('⚠️ No valid employee IDs found');
      return;
    }

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });

    const apiUrl = `http://${environment.apiURL}/api/attendance/bulk-status`;
    console.log('🌐 API URL:', apiUrl);
    console.log('📤 Sending request with employee_ids:', employeeIds);

    this.http.post<any>(apiUrl, { employee_ids: employeeIds }, { headers }).subscribe({
      next: (response) => {
        console.log('📊 Bulk Status API Response:', response);
        console.log('📅 Response Date:', response.date);
        console.log('✅ Response Success:', response.success);
        console.log('📋 Number of statuses received:', response.statuses?.length || 0);

        if (response.success && response.statuses) {
          this.employeeStatusMap = {};
          console.log('🔄 Building employee status map...');

          response.statuses.forEach((s: any, index: number) => {
            console.log(`\n--- Employee ${index + 1}/${response.statuses.length} ---`);
            console.log(`  Employee ID: ${s.employee_id}`);
            console.log(`  Status: ${s.status}`);
            console.log(`  Has Attendance: ${s.has_attendance}`);
            console.log(`  Work Mode: ${s.work_mode}`);
            console.log(`  Last Punch Time: ${s.last_punch_time}`);
            console.log(`  Attendance Status: ${s.attendance_status}`);

            this.employeeStatusMap[s.employee_id] = {
              status: s.status,
              work_mode: s.work_mode,
              last_punch_time: s.last_punch_time
            };
          });

          console.log('\n✅ Final Employee Status Map:', JSON.stringify(this.employeeStatusMap, null, 2));
          console.log('📊 Total employees in map:', Object.keys(this.employeeStatusMap).length);
        } else {
          console.log('⚠️ Invalid response format or unsuccessful');
        }
      },
      error: (err) => {
        console.error('❌ Error loading real-time attendance status:', err);
      }
    });
  }

  getEmployeePunchStatus(employeeId: number): { status: string; work_mode: string | null; last_punch_time: string | null } {
    const statusData = this.employeeStatusMap[employeeId] || { status: 'out', work_mode: null, last_punch_time: null };
    console.log(`🔍 getEmployeePunchStatus(${employeeId}):`, statusData);
    return statusData;
  }

  getPunchStatusBgColor(status: string): string {
    return status === 'in' ? '#d4edda' : '#ffe6e6';
  }

  formatPunchTime(timestamp: string | null): string {
    if (!timestamp) return '—';

    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return '—';
    }
  }

  /* ================= MANUAL REFRESH ================= */

  refreshAttendanceStatus() {
    console.log('\n🔄 ========== MANUAL REFRESH TRIGGERED ==========');
    console.log('📅 Current Date/Time:', new Date().toISOString());
    console.log('👥 Team Members Count:', this.teamMembers.length);
    console.log('🗺️ Current Status Map:', this.employeeStatusMap);

    if (this.teamMembers.length > 0) {
      this.loadEmployeeAttendanceStatus();
    } else {
      console.log('⚠️ No team members to refresh status for');
    }
  }

  /* ================= NAVIGATE TO APPROVALS PAGES ================= */
  async navigateToTimesheetApprovals() {
    const modal = await this.modalCtrl.create({
      component: ManagerTimesheetApprovalsPage,
      cssClass: 'side-custom-popup timesheet-popup',
      backdropDismiss: false,
    });
    await modal.present();
  }

  onReportTypeSelect(event: any) {
    const type = event.detail.value;
    if (type) {
      this.router.navigate(['/TeamReports'], { queryParams: { type: type } });
    }
  }

  // navigateToTimesheetApprovals() {
  //   this.router.navigate(['/ManagerTimesheetApprovals']);
  // }

  async navigateToLeaveApprovals() {
    const modal = await this.modalCtrl.create({
      component: ManagerLeaveApprovalsPage,
      cssClass: 'side-custom-popup team-popup',
      backdropDismiss: false,
    });
    await modal.present();
  }
  // navigateToLeaveApprovals() {
  //   this.router.navigate(['/ManagerLeaveApprovals']);
  // }
  async navigateToWfhApprovals() {
    const modal = await this.modalCtrl.create({
      component: ManagerWfhApprovalsPage,
      cssClass: 'side-custom-popup team-popup',
      backdropDismiss: false,
    });
    await modal.present();
  }
  // navigateToWfhApprovals() {
  //   this.router.navigate(['/ManagerWfhApprovals']);
  // }

  private updateRole() {
    this.userRole = this.routeGuardService.userRole?.toLowerCase() || null;
    // Treat HR as manager for UI purposes
    this.isManager = this.userRole === 'manager' || this.userRole === 'hr';
  }
}
