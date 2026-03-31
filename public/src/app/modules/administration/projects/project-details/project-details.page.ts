import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ToastController, AlertController, ModalController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectService, Project, ProjectShift, ProjectAssignment } from 'src/app/core/services/project.service';
import { EmployeeService } from 'src/app/core/services/employee.service';
import { AttendanceApiService } from 'src/app/core/services/attendance-api.service';
import { environment } from 'src/environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-project-details',
  templateUrl: './project-details.page.html',
  styleUrls: ['./project-details.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, ReactiveFormsModule]
})
export class ProjectDetailsPage implements OnInit, OnDestroy {
  projectId!: number;
  project: any = null;
  shifts: ProjectShift[] = [];
  assignments: any[] = [];

  shiftForm!: FormGroup;
  assignForm!: FormGroup;

  isLoading = true;
  showShiftModal = false;
  showAssignModal = false;
  submittingShift = false;
  submittingAssign = false;

  editingShiftId: number | null = null;
  editingAssignId: number | null = null;

  allEmployees: any[] = [];
  filteredEmployees: any[] = [];
  employeeSearchTerm = '';
  selectedEmployee: any = null;
  employeeSearching = false;
  employeesCurrentPage = 1;
  employeesLimit = 10;

  employeeStatusMap: { [key: number]: { status: string; work_mode: string | null } } = {};
  statusRefreshInterval: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private employeeService: EmployeeService,
    private fb: FormBuilder,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private http: HttpClient,
    private attendanceApiService: AttendanceApiService
  ) { }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.projectId = +id;
      this.initForms();
      this.loadProjectData();
      // Don't load all employees - search will be done via API

      this.statusRefreshInterval = setInterval(() => {
        this.loadBulkAttendanceStatus();
      }, 120000);
    } else {
      this.showToast('Invalid Project ID', 'danger');
      this.router.navigate(['/administration/projects']);
    }
  }

  ngOnDestroy() {
    if (this.statusRefreshInterval) {
      clearInterval(this.statusRefreshInterval);
    }
  }

  private initForms() {
    this.shiftForm = this.fb.group({
      shift_type: ['day', Validators.required],
      shift_name: ['', Validators.required],
      start_time: ['', Validators.required],
      end_time: ['', Validators.required],
      timezone: ['UTC', Validators.required],
      is_active: [true]
    });

    this.assignForm = this.fb.group({
      employee_id: ['', Validators.required],
      role_in_project: ['', Validators.required],
      allocation_percentage: [100, [Validators.required, Validators.min(1), Validators.max(100)]],
      shift_id: ['', Validators.required],
      assignment_start_date: ['', Validators.required],
      assignment_end_date: ['', Validators.required]
    });
  }

  async loadProjectData() {
    this.isLoading = true;
    try {
      const res: any = await this.projectService.getProjectById(this.projectId).toPromise();

      // Handle legacy nested response or array format
      if (res.success && res.project) {
        this.project = res.project;
      } else if (Array.isArray(res)) {
        this.project = res[0];
      } else {
        this.project = res;
      }

      // If project is loaded, fetch shifts and assignments
      if (this.project) {
        await Promise.all([this.loadShifts(), this.loadAssignments()]);
      }
    } catch (error) {
      this.showToast('Failed to load project details', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async loadShifts() {
    this.shifts = await this.projectService.getProjectShifts(this.projectId).toPromise() || [];
  }

  async loadAssignments() {
    this.assignments = await this.projectService.getAssignments(this.projectId).toPromise() || [];
    if (this.assignments.length > 0) {
      this.loadBulkAttendanceStatus();
    }
  }

  loadEmployees() {
    this.employeeService.getAllEmployees(1, 1000).subscribe({
      next: (res: any) => {
        this.allEmployees = res.data || [];
      }
    });
  }

  onEmployeeSearch(event: any) {
    const query = event.detail.value?.trim() || '';

    console.log('🔍 [Employee Search] Query:', query);

    // Only search if query has 3+ characters
    if (query.length < 3) {
      this.filteredEmployees = [];
      this.employeesCurrentPage = 1;
      return;
    }

    this.employeeSearching = true;
    this.employeesCurrentPage = 1;

    console.log('📡 [Employee Search] Calling API with query:', query);

    // Use the API search method (same as header component)
    this.employeeService.searchEmployees(query, this.employeesCurrentPage, this.employeesLimit).subscribe({
      next: (res: any) => {
        console.log('✅ [Employee Search] Response:', res);
        this.filteredEmployees = res.data || res.employees || [];
        this.employeeSearching = false;
        console.log('📊 [Employee Search] Found', this.filteredEmployees.length, 'employees');
      },
      error: (err: any) => {
        console.error('❌ [Employee Search] Error:', err);
        this.filteredEmployees = [];
        this.employeeSearching = false;
        this.showToast('Failed to search employees', 'danger');
      }
    });
  }

  selectEmployee(emp: any) {
    this.selectedEmployee = emp;
    this.employeeSearchTerm = `${emp.FirstName} ${emp.LastName || ''}`;
    this.assignForm.patchValue({ employee_id: emp.id });
    this.filteredEmployees = [];
    console.log('✓ [Employee Selected]:', emp.FirstName, emp.LastName, '(ID: ' + emp.id + ')');
  }

  /* ================= SHIFT ACTIONS ================= */

  openShiftModal(shift?: ProjectShift) {
    if (shift) {
      this.editingShiftId = shift.id!;
      this.shiftForm.patchValue(shift);
    } else {
      this.editingShiftId = null;
      this.shiftForm.reset({ shift_type: 'day', timezone: 'UTC', is_active: true });
    }
    this.showShiftModal = true;
  }

  async saveShift() {
    if (this.shiftForm.invalid) return;
    this.submittingShift = true;
    const action = this.editingShiftId
      ? this.projectService.updateProjectShift(this.editingShiftId, this.shiftForm.value)
      : this.projectService.createProjectShift(this.projectId, this.shiftForm.value);

    action.subscribe({
      next: () => {
        this.showToast('Shift saved successfully', 'success');
        this.showShiftModal = false;
        this.loadShifts();
        this.submittingShift = false;
      },
      error: () => {
        this.showToast('Failed to save shift', 'danger');
        this.submittingShift = false;
      }
    });
  }

  async deleteShift(shiftId: number) {
    const alert = await this.alertCtrl.create({
      header: 'Confirm Delete',
      message: 'Are you sure you want to delete this shift?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.projectService.deleteProjectShift(shiftId).subscribe({
              next: () => {
                this.showToast('Shift deleted', 'success');
                this.loadShifts();
              }
            });
          }
        }
      ]
    });
    alert.present();
  }

  /* ================= ASSIGNMENT ACTIONS ================= */

  openAssignModal(assign?: any) {
    if (assign) {
      this.editingAssignId = assign.id;
      this.assignForm.patchValue({
        employee_id: assign.employee_id,
        role_in_project: assign.role_in_project,
        allocation_percentage: assign.allocation_percentage,
        shift_id: assign.shift_id,
        assignment_start_date: this.formatDate(assign.assignment_start_date),
        assignment_end_date: this.formatDate(assign.assignment_end_date)
      });
      this.selectedEmployee = { FirstName: assign.employee_name, id: assign.employee_id };
      this.employeeSearchTerm = assign.employee_name;
    } else {
      this.editingAssignId = null;
      this.assignForm.reset({ allocation_percentage: 100 });
      this.selectedEmployee = null;
      this.employeeSearchTerm = '';
      this.filteredEmployees = [];
    }
    this.showAssignModal = true;
  }

  async saveAssignment() {
    if (this.assignForm.invalid) return;
    this.submittingAssign = true;

    let action;
    if (this.editingAssignId) {
      // For PUT, only send fields expected by the API
      const { role_in_project, allocation_percentage, shift_id, assignment_end_date } = this.assignForm.value;
      const payload = { 
        role_in_project, 
        allocation_percentage, 
        shift_id, 
        assignment_end_date: this.formatDate(assignment_end_date) 
      };
      action = this.projectService.updateAssignment(this.editingAssignId, payload);
    } else {
      action = this.projectService.assignEmployee(this.projectId, this.assignForm.value);
    }

    action.subscribe({
      next: () => {
        this.showToast(this.editingAssignId ? 'Member details updated' : 'Member assigned successfully', 'success');
        this.showAssignModal = false;
        this.loadAssignments();
        this.submittingAssign = false;
      },
      error: (err: any) => {
        console.error('Assignment error:', err);
        this.showToast('Failed to process assignment', 'danger');
        this.submittingAssign = false;
      }
    });
  }

  async deleteAssignment(assignId: number) {
    const alert = await this.alertCtrl.create({
      header: 'Remove Employee',
      message: 'Are you sure you want to remove this employee from the project?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: () => {
            this.projectService.deleteAssignment(assignId).subscribe({
              next: () => {
                this.showToast('Employee removed', 'success');
                this.loadAssignments();
              }
            });
          }
        }
      ]
    });
    alert.present();
  }

  /* ================= UTILS ================= */

  loadBulkAttendanceStatus() {
    if (this.assignments.length === 0) return;
    const ids = this.assignments.map(a => a.employee_id);
    this.attendanceApiService.bulkStatusCheck(ids).subscribe({
      next: (res: any) => {
        const statusList = res.statuses || res.data || [];
        if (statusList) {
          const newStatuses: any = {};
          statusList.forEach((status: any) => {
            newStatuses[status.employee_id] = {
              status: (status.attendance_status || status.status)?.toLowerCase(),
              work_mode: status.work_mode
            };
          });
          this.employeeStatusMap = { ...this.employeeStatusMap, ...newStatuses };
        }
      },
      error: (err: any) => console.error('Bulk status check failed', err)
    });
  }

  getRealTimeStatus(employeeId: number): any {
    return this.employeeStatusMap[employeeId] || { status: 'out' };
  }

  getDisplayStatusText(employeeId: number): string {
    const status = (this.getRealTimeStatus(employeeId).status || '').toLowerCase();
    if (status === 'in' || status === 'present' || status.includes('in') || status === 'wfh') return 'IN';
    if (status.includes('leave')) return 'On Leave';
    if (status === 'absent') return 'Absent';
    return 'OUT';
  }

  getDisplayStatusClass(employeeId: number): string {
    const status = (this.getRealTimeStatus(employeeId).status || '').toLowerCase();
    if (status === 'in' || status === 'present' || status.includes('in') || status === 'wfh') return 'active';
    if (status.includes('leave')) return 'on-leave-status'; // We can add this to SCSS if needed
    return '';
  }

  private formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'top' });
    toast.present();
  }

  goBack() {
    this.router.navigate(['/administration/projects']);
  }
}
