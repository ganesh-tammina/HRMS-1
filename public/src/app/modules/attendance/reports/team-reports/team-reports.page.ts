import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { AttendanceApiService } from '../../../../core/services/attendance-api.service';
import { EmployeeService } from '../../../../core/services/employee.service';

@Component({
  selector: 'app-team-reports',
  templateUrl: './team-reports.page.html',
  styleUrls: ['./team-reports.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class TeamReportsPage implements OnInit {
  teamMembers: any[] = [];
  selectedEmployeeId: number | null = null;
  selectedEmployeeName = 'Select Employee';
  
  startDate: string = '';
  endDate: string = '';
  
  reportData: any[] = [];
  isLoading = false;
  hasSearched = false;

  constructor(
    private attendanceService: AttendanceApiService,
    private employeeService: EmployeeService,
    private navCtrl: NavController
  ) {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.startDate = firstDay.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.loadTeam();
  }

  loadTeam() {
    this.employeeService.getMyTeamList().subscribe({
      next: (res: any) => {
        this.teamMembers = res?.team || (Array.isArray(res) ? res : []);
      },
      error: (err) => console.error('Error loading team:', err)
    });
  }

  onEmployeeChange(event: any) {
    this.selectedEmployeeId = event.detail.value;
    const emp = this.teamMembers.find(m => m.id === this.selectedEmployeeId);
    this.selectedEmployeeName = emp ? `${emp.FirstName} ${emp.LastName}` : 'Select Employee';
  }

  generateReport() {
    if (!this.selectedEmployeeId) return;

    this.isLoading = true;
    this.hasSearched = true;

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    const params = {
      startDate: `${start.getDate()}-${start.getMonth() + 1}-${start.getFullYear()}`,
      endDate: `${end.getDate()}-${end.getMonth() + 1}-${end.getFullYear()}`,
      month: start.getMonth() + 1,
      year: start.getFullYear()
    };

    this.attendanceService.getEmployeeReport(this.selectedEmployeeId, params).subscribe({
      next: (res: any) => {
        this.reportData = res?.report || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error generating report:', err);
        this.isLoading = false;
      }
    });
  }

  getStatusColor(status: string): string {
    status = status?.toLowerCase();
    if (status === 'present' || status === 'in') return 'success';
    if (status === 'absent') return 'danger';
    if (status?.includes('leave')) return 'warning';
    if (status === 'weekend' || status === 'holiday') return 'medium';
    return 'primary';
  }

  goBack() {
    this.navCtrl.back();
  }
}
