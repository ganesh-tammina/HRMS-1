import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';

import { ProjectService } from 'src/app/services/project.service';
import { EmployeeService } from 'src/app/services/employee.service';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, FormsModule],
  templateUrl: './project-details.component.html',
  styleUrls: ['./project-details.component.scss'],
})
export class ProjectDetailsComponent implements OnInit, OnDestroy {

  projectId!: number;

  project: any = null;
  shifts: any[] = [];
  assignments: any[] = [];

  shiftForm!: FormGroup;
  assignForm!: FormGroup;

  loading = true;
  errorMessage = '';

  showShiftModal = false;
  showAssignModal = false;
  submittingShift = false;
  submittingAssignment = false;
  
  editingShiftId: number | null = null;
  editingAssignmentId: number | null = null;

  allEmployees: any[] = [];
  filteredEmployees: any[] = [];
  searchTerm = '';
  selectedEmployee: any = null;
  shiftIcons: any = {
    day: '../../../../assets/Icons/day-blue.svg',
    night: '../../../../assets/Icons/night-blue.svg',
    evening: '../../../../assets/Icons/evening-blue.svg'
  };

  // Attendance status tracking
  employeeStatusMap: { [key: number]: { status: string; work_mode: string | null } } = {};
  statusRefreshInterval: any = null;

  constructor(
    private route: ActivatedRoute,
    private projectService: ProjectService,
    private employeeService: EmployeeService,
    private fb: FormBuilder,
    private toastCtrl: ToastController,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (!idParam) {
      this.loading = false;
      this.errorMessage = 'Project ID missing';
      return;
    }

    this.projectId = +idParam;

    this.initForms();
    this.loadAll();
    this.loadEmployees();

    // Refresh attendance status every 2 minutes
    this.statusRefreshInterval = setInterval(() => {
      this.loadEmployeeAttendanceStatus();
    }, 120000);
  }

  ngOnDestroy(): void {
    if (this.statusRefreshInterval) {
      clearInterval(this.statusRefreshInterval);
    }
  }

  /* ================= FORMS ================= */
  initForms() {
    this.shiftForm = this.fb.group({
      shift_type: ['day', Validators.required],
      shift_name: ['', Validators.required],
      start_time: ['', Validators.required],
      end_time: ['', Validators.required],
      timezone: ['UTC', Validators.required]
    });

    this.assignForm = this.fb.group({
      employee_id: ['', Validators.required],
      role_in_project: ['', Validators.required],
      allocation_percentage: [100, Validators.required],
      shift_id: ['', Validators.required],
      assignment_start_date: ['', Validators.required],
      assignment_end_date: ['', Validators.required]
    });
  }

  /* ================= LOAD ALL ================= */
  loadAll() {
    this.loading = true;

    this.projectService.getProjectById(this.projectId).subscribe({
      next: (res: any) => {
        // Handle nested response structure
        if (res.success && res.project) {
          this.project = res.project;
          this.shifts = res.project.shifts || [];
          this.assignments = res.project.assignments || [];
        } else if (Array.isArray(res)) {
          this.project = res[0];
        } else {
          this.project = res;
        }
        this.loading = false;

        // Reload shifts and assignments separately to ensure data is fresh
        this.loadShifts();
        this.loadAssignments();
      },
      error: () => {
        this.errorMessage = 'Failed to load project';
        this.loading = false;
      }
    });
  }

  /* ================= MODAL CONTROLS ================= */
  openShiftModal(shift?: any): void {
    if (shift) {
      this.editingShiftId = shift.id;
      this.shiftForm.patchValue({
        shift_type: shift.shift_type,
        shift_name: shift.shift_name,
        start_time: shift.start_time,
        end_time: shift.end_time,
        timezone: shift.timezone || 'UTC'
      });
    } else {
      this.editingShiftId = null;
      this.shiftForm.reset({ shift_type: 'day', timezone: 'UTC' });
    }
    this.showShiftModal = true;
  }

  closeShiftModal(): void {
    this.showShiftModal = false;
    this.editingShiftId = null;
    this.shiftForm.reset({ shift_type: 'day', timezone: 'UTC' });
  }

  openAssignModal(assignment?: any): void {
    if (assignment) {
      this.editingAssignmentId = assignment.id;
      this.assignForm.patchValue({
        employee_id: assignment.employee_id,
        role_in_project: assignment.role_in_project,
        allocation_percentage: assignment.allocation_percentage,
        shift_id: assignment.shift_id,
        assignment_start_date: assignment.assignment_start_date ? assignment.assignment_start_date.split('T')[0] : '',
        assignment_end_date: assignment.assignment_end_date ? assignment.assignment_end_date.split('T')[0] : ''
      });
      // Pre-select employee for UI
      this.selectedEmployee = {
        id: assignment.employee_id,
        FirstName: assignment.employee_name ? assignment.employee_name.split(' ')[0] : '',
        LastName: assignment.employee_name ? assignment.employee_name.split(' ').slice(1).join(' ') : '',
        EmployeeNumber: ''
      };
      this.searchTerm = assignment.employee_name;
    } else {
      this.editingAssignmentId = null;
      this.searchTerm = '';
      this.selectedEmployee = null;
      this.assignForm.reset({ allocation_percentage: 100 });
    }
    this.filteredEmployees = [];
    this.showAssignModal = true;
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.editingAssignmentId = null;
    this.searchTerm = '';
    this.filteredEmployees = [];
    this.selectedEmployee = null;
    this.assignForm.reset({ allocation_percentage: 100 });
  }

  /* ================= EMPLOYEE SEARCH ================= */
  loadEmployees(): void {
    console.log('Loading employees...');

    this.employeeService.getAllEmployees().subscribe({
      next: (response: any) => {
        console.log('Employee response:', response);
        // Handle different response formats
        if (Array.isArray(response)) {
          this.allEmployees = response;
        } else if (response.employees) {
          this.allEmployees = response.employees;
        } else if (response.data) {
          this.allEmployees = response.data;
        } else {
          this.allEmployees = [];
        }
        console.log('Loaded employees:', this.allEmployees.length);
      },
      error: (err:any) => {
        console.error('Error loading employees:', err);
        // Fallback: try search endpoint
        this.employeeService.searchEmployees('').subscribe({
          next: (employees:any) => {
            console.log('Loaded via search:', employees);
            this.allEmployees = employees || [];
          },
          error: (err2:any) => {
            console.error('Error with search fallback:', err2);
          }
        });
      }
    });
  }

  onEmployeeSearch(event: any) {
    const query = event.detail.value?.toLowerCase() || '';
    this.searchTerm = query;

    if (query.length < 2) {
      this.filteredEmployees = [];
      return;
    }

    this.filteredEmployees = this.allEmployees.filter(emp =>
      emp.FirstName?.toLowerCase().includes(query) ||
      emp.LastName?.toLowerCase().includes(query) ||
      emp.EmployeeNumber?.toLowerCase().includes(query) ||
      emp.WorkEmail?.toLowerCase().includes(query) ||
      `${emp.FirstName} ${emp.LastName}`.toLowerCase().includes(query)
    ).slice(0, 10); // Limit to 10 results
  }

  selectEmployee(employee: any) {
    this.selectedEmployee = employee;
    this.searchTerm = `${employee.FirstName} ${employee.LastName} (${employee.EmployeeNumber})`;
    this.assignForm.patchValue({ employee_id: employee.id });
    this.filteredEmployees = [];
  }

  clearEmployeeSelection() {
    this.selectedEmployee = null;
    this.searchTerm = '';
    this.assignForm.patchValue({ employee_id: '' });
    this.filteredEmployees = [];
  }

  /* ================= SHIFTS ================= */
  createShift() {
    if (this.shiftForm.invalid) {
      this.showToast('Please fill all required fields', 'danger');
      return;
    }

    this.submittingShift = true;

    if (this.editingShiftId) {
      this.projectService
        .updateProjectShift(this.editingShiftId, this.shiftForm.value)
        .subscribe({
          next: () => {
            this.showToast('Shift updated successfully', 'success');
            this.submittingShift = false;
            this.closeShiftModal();
            this.loadShifts();
          },
          error: () => {
            this.showToast('Shift update failed', 'danger');
            this.submittingShift = false;
          }
        });
    } else {
      this.projectService
        .createProjectShift(this.projectId, this.shiftForm.value)
        .subscribe({
          next: () => {
            this.showToast('Shift created successfully', 'success');
            this.submittingShift = false;
            this.closeShiftModal();
            this.loadShifts();
          },
          error: () => {
            this.showToast('Shift creation failed', 'danger');
            this.submittingShift = false;
          }
        });
    }
  }

  deleteShift(shiftId: number) {
    if (confirm('Are you sure you want to delete this shift?')) {
      this.projectService.deleteProjectShift(shiftId).subscribe({
        next: () => {
          this.showToast('Shift deleted successfully', 'success');
          this.loadShifts();
        },
        error: () => {
          this.showToast('Failed to delete shift', 'danger');
        }
      });
    }
  }

  loadShifts() {
    this.projectService
      .getProjectShifts(this.projectId)
      .subscribe(res => (this.shifts = res || []));
  }

  /* ================= ASSIGN EMPLOYEE ================= */
  assignEmployee() {
    if (this.assignForm.invalid) {
      this.showToast('Please fill all required fields', 'danger');
      return;
    }

    this.submittingAssignment = true;

    if (this.editingAssignmentId) {
       this.projectService
        .updateAssignment(this.editingAssignmentId, this.assignForm.value)
        .subscribe({
          next: () => {
            this.showToast('Employee assignment updated successfully', 'success');
            this.submittingAssignment = false;
            this.closeAssignModal();
            this.loadAssignments();
          },
          error: () => {
            this.showToast('Assignment update failed', 'danger');
            this.submittingAssignment = false;
          }
        });
    } else {
      this.projectService
        .assignEmployee(this.projectId, this.assignForm.value)
        .subscribe({
          next: () => {
            this.showToast('Employee assigned successfully', 'success');
            this.submittingAssignment = false;
            this.closeAssignModal();
            this.loadAssignments();
          },
          error: () => {
            this.showToast('Assignment failed', 'danger');
            this.submittingAssignment = false;
          }
        });
    }
  }

  deleteAssignment(assignmentId: number) {
     if (confirm('Are you sure you want to remove this employee from the project?')) {
      this.projectService.deleteAssignment(assignmentId).subscribe({
        next: () => {
          this.showToast('Employee removed successfully', 'success');
          this.loadAssignments();
        },
        error: () => {
          this.showToast('Failed to remove employee', 'danger');
        }
      });
    }
  }

  loadAssignments() {
    this.projectService
      .getAssignments(this.projectId)
      .subscribe((res:any) => {
        this.assignments = res || [];
        // Load attendance status after assignments are loaded
        if (this.assignments.length > 0) {
          this.loadEmployeeAttendanceStatus();
        }
      });
  }

  /* ================= ATTENDANCE STATUS ================= */
  loadEmployeeAttendanceStatus() {
    if (!this.assignments || this.assignments.length === 0) return;

    const employeeIds = this.assignments
      .map(a => a.employee_id)
      .filter(id => id != null);

    if (employeeIds.length === 0) return;

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });

    const apiUrl = `http://${environment.apiURL}/api/attendance/bulk-status`;

    this.http.post<any>(apiUrl, { employee_ids: employeeIds }, { headers }).subscribe({
      next: (response:any) => {
        if (response.success && response.statuses) {
          this.employeeStatusMap = {};
          response.statuses.forEach((s: any) => {
            this.employeeStatusMap[s.employee_id] = {
              status: s.status,
              work_mode: s.work_mode
            };
          });
        }
      },
      error: (err:any) => {
        console.error('Error loading attendance status:', err);
      }
    });
  }

  getEmployeeStatus(employeeId: number): { status: string; work_mode: string | null } {
    return this.employeeStatusMap[employeeId] || { status: 'out', work_mode: null };
  }

  getStatusColor(status: string): string {
    return status === 'in' ? 'success' : 'danger';
  }

  getStatusBgColor(status: string): string {
    return status === 'in' ? '#d4edda' : '#ffe6e6';
  }

  async showToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    toast.present();
  }
  adminManagement() {
    this.router.navigate(['./admin']);
  }
  projectDeails() {
    this.router.navigate(['./CreateProject']);
  }
  
}