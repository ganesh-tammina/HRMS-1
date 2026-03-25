import { WeeklyOffPolicyService, WeeklyOffPolicy } from 'src/app/services/weekly-off-policy.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { UploadService } from '../../../services/uploads.service';
import { EmployeeService } from 'src/app/services/employee.service';
import { IonicModule, IonModal, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ShiftPolicyService, ShiftPolicy } from 'src/app/services/shift-policy.service';
import { AttendancePolicyService, AttendancePolicy } from 'src/app/services/attendance-policy.service';
import { LeavePlanService, LeavePlan } from 'src/app/services/leave-plan.service';
import { AdminSetup } from 'src/app/services/admin-setup.service';

@Component({
  selector: 'app-employee-list',
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
})
export class EmployeeListComponent implements OnInit {
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
    DepartmentId: null
  };
  shiftPolicies: ShiftPolicy[] = [];
  attendancePolicies: AttendancePolicy[] = [];
  leavePlans: LeavePlan[] = [];
  weeklyOffPolicies: WeeklyOffPolicy[] = [];
  departments: any[] = [];
  allEmployees: any[] = []; // For reporting manager selection
  filteredManagers: any[] = []; // Filtered list for searchable dropdown
  managerSearchTerm: string = '';
  managerDropdownOpen: boolean = false;
  /* ================= EMPLOYEES ================= */
  allCandidates: any[] = [];
  pagedCandidates: any[] = [];

  pageSize = 20;        // 20 records per page (matching backend)
  currentPage = 1;
  totalPages = 1;
  totalEmployees = 0;

  EmployeeselectedFile: File | null = null;
  isUploading = false; // Loading state for upload
  @ViewChild(IonModal) modal!: IonModal;

  constructor(
    private uploadService: UploadService,
    private employeeService: EmployeeService,
    private shiftPolicyService: ShiftPolicyService,
    private attendancePolicyService: AttendancePolicyService,
    private leavePlanService: LeavePlanService,
    private weeklyOffPolicyService: WeeklyOffPolicyService,
    private adminSetupService: AdminSetup,
    private router: Router,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.userRole = (localStorage.getItem('role') || '').toLowerCase();
    this.isHR = this.userRole === 'hr';
    this.loadEmployees(); // ✅ initial load
    this.loadShiftPolicies();
    this.loadAttendancePolicies();
    this.loadLeavePlans();
    this.loadWeeklyOffPolicies();
    this.loadDepartments();
  }

  loadDepartments() {
    this.adminSetupService.getDepartments().subscribe(deps => {
      this.departments = deps || [];
    });
  }

  /* ================= SEARCHABLE MANAGER DROPDOWN ================= */
  toggleManagerDropdown() {
    this.managerDropdownOpen = !this.managerDropdownOpen;
    if (this.managerDropdownOpen) {
      this.managerSearchTerm = '';
      this.filteredManagers = [...this.allEmployees];
    }
  }

  filterManagers() {
    const term = (this.managerSearchTerm || '').toLowerCase().trim();
    this.filteredManagers = term
      ? this.allEmployees.filter(e => (e.FullName || '').toLowerCase().includes(term))
      : [...this.allEmployees];
  }

  selectManager(id: number | null) {
    this.updateData.reporting_manager_id = id;
    this.managerDropdownOpen = false;
    this.managerSearchTerm = '';
  }

  getManagerName(id: number | null): string {
    if (!id) return 'Select Reporting Manager';
    const found = this.allEmployees.find(e => e.id === id);
    return found ? found.FullName : 'Select Reporting Manager';
  }

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
  /* ================= LOAD EMPLOYEES (SERVER-SIDE PAGINATION) ================= */
  loadEmployees() {
    this.employeeService.getAllEmployees(this.currentPage, this.pageSize, this.searchTerm).subscribe((res: any) => {
      // Backend returns { data: [...], pagination: { page, limit, total, pages } }
      this.allCandidates = res.data || [];
      this.allEmployees = [...this.allCandidates]; 
      this.filteredManagers = [...this.allCandidates];
      this.pagedCandidates = [...this.allCandidates];
      if (res.pagination) {
        this.currentPage = res.pagination.page;
        this.totalPages = res.pagination.pages;
        this.totalEmployees = res.pagination.total;
      }
      
      this.pagedCandidates = [...this.allCandidates]; // Entire server response slice is paged candidates
      console.log('Employees loaded paginated:', this.allCandidates);
    });
  }

  /* ================= SORT EMPLOYEES BY ID ================= */
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
      DepartmentId: emp.DepartmentId || null
    };
  }

  updateEmployeeProfile() {
    if (!this.selectedEmployee) return;

    // Build payload: only include fields that have a real (non-null, non-undefined) value
    const payload: any = {};
    if (this.updateData.reporting_manager_id !== null && this.updateData.reporting_manager_id !== undefined) {
      payload.reporting_manager_id = this.updateData.reporting_manager_id;
    }
    if (this.updateData.leave_plan_id !== null && this.updateData.leave_plan_id !== undefined) {
      payload.leave_plan_id = this.updateData.leave_plan_id;
    }
    if (this.updateData.shift_policy_id !== null && this.updateData.shift_policy_id !== undefined) {
      payload.shift_policy_id = this.updateData.shift_policy_id;
    }
    if (this.updateData.attendance_policy_id !== null && this.updateData.attendance_policy_id !== undefined) {
      payload.attendance_policy_id = this.updateData.attendance_policy_id;
    }
    if (this.updateData.weekly_off_policy_id !== null && this.updateData.weekly_off_policy_id !== undefined) {
      payload.weekly_off_policy_id = this.updateData.weekly_off_policy_id;
    }
    if (this.updateData.PayGradeId !== null && this.updateData.PayGradeId !== undefined) {
      payload.PayGradeId = this.updateData.PayGradeId;
    }
    if (this.updateData.DepartmentId !== null && this.updateData.DepartmentId !== undefined) {
      payload.DepartmentId = this.updateData.DepartmentId;
    }

    console.log('[updateEmployeeProfile] Sending payload:', JSON.stringify(payload));

    this.employeeService.updateEmployeeProfile(this.selectedEmployee.id, payload).subscribe({
      next: (res: any) => {
        console.log('[updateEmployeeProfile] Server response:', res);
        this.presentToast('Employee profile updated successfully', 'success');
        this.selectedEmployee = null;
        this.loadEmployees();
      },
      error: (err: any) => {
        console.error('[updateEmployeeProfile] Error:', err);
        this.presentToast('Failed to update employee profile: ' + (err?.error?.error || err?.message || 'Unknown error'), 'danger');
      }
    });
  }

  /* ================= FILE SELECT ================= */
  EmployeeSelected(event: any) {
    this.EmployeeselectedFile = event.target.files[0];
  }

  /* ================= UPLOAD EMPLOYEES ================= */
  EmployeesUpload() {
    if (!this.EmployeeselectedFile) {
      this.presentToast('Please select an Excel file', 'warning');
      return;
    }

    this.isUploading = true; // Show loading spinner
    this.modal.dismiss(); // Immediately close modal

    this.uploadService.uploadEmployees(this.EmployeeselectedFile).subscribe({
      next: () => {
        this.isUploading = false; // Hide loading spinner
        this.presentToast('Employees uploaded successfully', 'success');
        this.EmployeeselectedFile = null;
        // ✅ IMMEDIATE REFRESH (NO PAGE RELOAD)
        this.loadEmployees();
      },
      error: () => {
        this.isUploading = false; // Hide loading spinner
        this.presentToast('Employee upload failed', 'danger');
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
      this.loadEmployees();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadEmployees();
    }
  }
  adminManagement() {
    this.router.navigate(['/admin']);
  }

  async presentToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'top'
    });
    toast.present();
  }
}
