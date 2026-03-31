import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { EmployeeService } from '../../../../../core/services/employee.service';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-reporting-team',
  templateUrl: './reporting-team.component.html',
  styleUrls: ['./reporting-team.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ReportingTeamComponent implements OnInit {
  @Input() currentEmployee: any;
  team: any[] = [];
  teamCount: number = 0;

  constructor(private employeeService: EmployeeService) { }

  ngOnInit() {
    if (this.currentEmployee?.employee_id) {
      this.loadReportingTeam(this.currentEmployee.employee_id);
    }
  }

  loadReportingTeam(id: number) {
    this.employeeService.getReportingEmployees(id).subscribe({
      next: (res: any) => {
        this.team = Array.isArray(res) ? res : (res.data || []);
        this.teamCount = this.team.length;
      },
      error: (err) => console.error("Error loading reporting team:", err),
    });
  }
}
