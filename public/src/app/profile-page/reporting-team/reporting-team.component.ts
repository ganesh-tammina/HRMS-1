import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { CandidateService } from 'src/app/services/pre-onboarding.service';
import { RouteGuardService } from 'src/app/services/route-guard/route-service/route-guard.service';
import {NgxPaginationModule} from 'ngx-pagination';

@Component({
  selector: 'app-reporting-team',
  templateUrl: './reporting-team.component.html',
  styleUrls: ['./reporting-team.component.scss'],
  standalone: true,
  imports: [CommonModule, NgxPaginationModule]
})
export class ReportingTEamComponent implements OnInit {
  @Input() currentemp: any;
  one: any;
  allEmployees: any[] = [];
  employee_id: any;
  team: any;
  value: any;
  constructor(private candidateService: CandidateService, private routeGuardService: RouteGuardService) { }


  ngOnInit() {
    console.log(this.currentemp, 'all');

    if (this.routeGuardService.employeeID) {

      // this.candidateService.getEmpDet().subscribe({
      //   next: (response: any) => {
      //     this.allEmployees = response.data || [];

      //     if (this.allEmployees.length > 0) {
      //       const emp = Array.isArray(this.allEmployees[0])
      //         ? this.allEmployees[0][0]
      //         : this.allEmployees[0];

      //       this.employee_id = emp.employee_id;

      //       console.log("Employee ID Loaded:", this.employee_id);

      //       // ✅ CALL HERE (AFTER LOADING employee_id)
      //       this.loadReportingTeam(this.employee_id);
      //     }
      //   }
      // });
    }
  }

  // loadReportingTeam(id: number) {
  //   this.candidateService.getReportingTeam(id).subscribe({
  //     next: (res) => {
  //       this.team = res.data;
  //       this.value = this.team.length;
  //       console.log("Team Length:", this.value);
  //       console.log("Reporting Team:", this.team);
  //     },
  //     error: (err) => console.log("Error:", err),
  //   });
  // }

  p: number = 1;
}
