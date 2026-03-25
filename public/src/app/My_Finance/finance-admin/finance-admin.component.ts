import { WeeklyOffPolicyService, WeeklyOffPolicy } from 'src/app/services/weekly-off-policy.service';
import { PayrollUploadService } from 'src/app/services/payroll-upload.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { EmployeeService } from 'src/app/services/employee.service';
import { IonicModule, IonModal } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ShiftPolicyService, ShiftPolicy } from 'src/app/services/shift-policy.service';
import { AttendancePolicyService, AttendancePolicy } from 'src/app/services/attendance-policy.service';
import { LeavePlanService, LeavePlan } from 'src/app/services/leave-plan.service';

@Component({
  selector: 'app-finance-admin',
  templateUrl: './finance-admin.component.html',
  styleUrls: ['./finance-admin.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
})
export class FinanceAdminComponent implements OnInit {
  userRole: string | null = null;
  isHR: boolean = false;
  searchTerm: string = '';
  selectedEmployee: any = null;

  updateData: any = {
    reporting_manager_id: null,
    leave_plan_id: null,
    shift_policy_id: null,
    attendance_policy_id: null,
    PayGradeId: null,
    lpa: null
  };

  shiftPolicies: ShiftPolicy[] = [];
  attendancePolicies: AttendancePolicy[] = [];
  leavePlans: LeavePlan[] = [];
  weeklyOffPolicies: WeeklyOffPolicy[] = [];

  /* ================= EMPLOYEES ================= */
  allCandidates: any[] = [];
  pagedCandidates: any[] = [];

  pageSize = 5;
  currentPage = 1;
  totalPages = 1;

  EmployeeselectedFile: File | null = null;
  payrollFile: File | null = null;

  payrollMonth: number = new Date().getMonth() + 1;
  payrollYear: number = new Date().getFullYear();
  payrollUploading: boolean = false;

  /* ================= PAYROLL GENERATE STATE ================= */
  generatePayrollLoading: boolean = false;
  generatePayrollMessage: string = '';

  isUploading = false;

  @ViewChild(IonModal) modal!: IonModal;

  constructor(
    private employeeService: EmployeeService,
    private shiftPolicyService: ShiftPolicyService,
    private attendancePolicyService: AttendancePolicyService,
    private leavePlanService: LeavePlanService,
    private weeklyOffPolicyService: WeeklyOffPolicyService,
    private payrollUploadService: PayrollUploadService,
    private router: Router
  ) { }

  ngOnInit() {
    this.userRole = (localStorage.getItem('role') || '').toLowerCase();
    this.isHR = this.userRole === 'hr';
    this.loadEmployees();
    this.loadShiftPolicies();
    this.loadAttendancePolicies();
    this.loadLeavePlans();
    this.loadWeeklyOffPolicies();
  }

  /* ================= GENERATE PAYROLL ================= */
  generatePayroll() {
    this.generatePayrollLoading = true;
    this.generatePayrollMessage = '';

    const token = localStorage.getItem('token') || '';

    fetch('http://localhost:3000/api/payroll/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        month: this.payrollMonth,
        year: this.payrollYear
      })
    })
      .then(response =>
        response.json().then(result => ({ ok: response.ok, result }))
      )
      .then(({ ok, result }) => {
        if (ok) {
          this.generatePayrollMessage = 'Payroll generated successfully!';
        } else {
          this.generatePayrollMessage =
            result?.error || 'Payroll generation failed.';
        }
      })
      .catch(() => {
        this.generatePayrollMessage = 'Error generating payroll.';
      })
      .finally(() => {
        this.generatePayrollLoading = false;
      });
  }

  /* ================= PAYROLL FILE SELECT ================= */
  payrollFileSelected(event: any) {
    this.payrollFile = event.target.files[0];
  }

  /* ================= PAYROLL UPLOAD ================= */
  uploadPayroll() {
    if (!this.payrollFile) {
      alert('Please select a payroll Excel file');
      return;
    }

    this.payrollUploading = true;
    const token = localStorage.getItem('token') || '';

    this.payrollUploadService.uploadPayroll(
      this.payrollFile,
      this.payrollMonth,
      this.payrollYear,
      token
    ).subscribe({
      next: () => {
        this.payrollUploading = false;
        alert('Payroll uploaded successfully');
        this.payrollFile = null;
      },
      error: () => {
        this.payrollUploading = false;
        alert('Payroll upload failed');
      }
    });
  }

  /* ================= LOAD POLICIES ================= */
  loadWeeklyOffPolicies() {
    this.weeklyOffPolicyService.getWeeklyOffPolicies().subscribe((policies: WeeklyOffPolicy[]) => {
      this.weeklyOffPolicies = policies || [];
    });
  }

  loadLeavePlans() {
    this.leavePlanService.getLeavePlans().subscribe((plans: LeavePlan[]) => {
      this.leavePlans = plans || [];
    });
  }

  loadAttendancePolicies() {
    this.attendancePolicyService.getAttendancePolicies().subscribe((policies: AttendancePolicy[]) => {
      this.attendancePolicies = policies || [];
    });
  }

  loadShiftPolicies() {
    this.shiftPolicyService.getShiftPolicies().subscribe((policies: ShiftPolicy[]) => {
      this.shiftPolicies = policies || [];
    });
  }

  /* ================= LOAD EMPLOYEES ================= */
  loadEmployees() {
    this.employeeService.getAllEmployees().subscribe((res: any[]) => {
      this.allCandidates = res.filter((emp: any) => emp.EmploymentStatus === 'Working');
      this.sortEmployeesById();
      this.applySearch();
      this.currentPage = 1;
      this.calculatePagination();
      this.updatePagedCandidates();
    });
  }

  sortEmployeesById() {
    this.allCandidates.sort((a, b) => a.id - b.id);
    this.updatePagedCandidates();
  }

  applySearch() {
    if (this.searchTerm && this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      this.allCandidates = this.allCandidates.filter(emp =>
        (emp.FullName || '').toLowerCase().includes(term) ||
        (emp.id + '').includes(term) ||
        (emp.WorkEmail || '').toLowerCase().includes(term) ||
        (emp.department_name || '').toLowerCase().includes(term)
      );
    }
  }

  selectEmployee(emp: any) {
    this.selectedEmployee = emp;
    this.updateData = {
      reporting_manager_id: emp.reporting_manager_id || null,
      leave_plan_id: emp.leave_plan_id || null,
      shift_policy_id: emp.shift_policy_id || null,
      attendance_policy_id: emp.attendance_policy_id || null,
      weekly_off_policy_id: emp.weekly_off_policy_id || null,
      PayGradeId: emp.PayGradeId || null,
      lpa: emp.lpa
    };
  }

  updateEmployeeProfile() {
    if (!this.selectedEmployee) return;

    this.employeeService.updateEmployeeProfile(
      this.selectedEmployee.id,
      this.updateData
    ).subscribe({
      next: () => {
        alert('Employee profile updated successfully');
        this.selectedEmployee = null;
        this.loadEmployees();
      },
      error: () => {
        alert('Failed to update employee profile');
      }
    });
  }

  /* ================= PAGINATION ================= */
  calculatePagination() {
    this.totalPages = Math.ceil(this.allCandidates.length / this.pageSize);
    if (this.totalPages === 0) {
      this.totalPages = 1;
    }
  }

  updatePagedCandidates() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedCandidates = this.allCandidates.slice(start, end);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagedCandidates();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagedCandidates();
    }
  }

  adminManagement() {
    this.router.navigate(['/admin']);
  }

  goToAdminDashboard() {
    this.router.navigate(['/admin']);
  }

  masterpayroll() {
    this.router.navigate(['/masterpayroll']);
  }
}
