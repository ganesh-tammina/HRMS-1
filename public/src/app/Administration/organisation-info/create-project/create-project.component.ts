import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

import { ProjectService, Project } from 'src/app/services/project.service';
import { EmployeeService } from 'src/app/services/employee.service';

@Component({
  selector: 'app-create-project',
  standalone: true,
  templateUrl: './create-project.component.html',
  styleUrls: ['./create-project.component.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule, FormsModule]
})
export class CreateProjectComponent implements OnInit {

  projectForm!: FormGroup;
  submitting = false;

  projects: Project[] = [];
  loadingProjects = false;

  showCreateForm = false;
  isEditMode = false;
  selectedProjectId: number | null = null;

  // Employee search for Project Manager
  allEmployees: any[] = [];
  filteredManagers: any[] = [];
  managerSearchTerm = '';
  selectedManager: any = null;

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private employeeService: EmployeeService,
    private toastCtrl: ToastController,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.getProjects();
    this.loadEmployees();
  }

  private initForm(): void {
    this.projectForm = this.fb.group({
      project_code: ['', Validators.required],
      project_name: ['', Validators.required],
      client_name: ['', Validators.required],
      start_date: ['', Validators.required],
      end_date: ['', Validators.required],
      status: ['active', Validators.required],
      description: [''],
      project_manager_id: ['', Validators.required]
    });
  }

  openCreateForm(): void {
    this.isEditMode = false;
    this.selectedProjectId = null;
    this.clearManagerSelection();
    this.showCreateForm = true;
  }

  cancelCreate(): void {
    this.showCreateForm = false;
    this.isEditMode = false;
    this.selectedProjectId = null;
    this.clearManagerSelection();
    this.projectForm.reset({ status: 'active' });
  }

  submit(): void {
    if (this.projectForm.invalid) {
      this.showToast('Please fill all required fields', 'danger');
      return;
    }

    this.submitting = true;

    const operation = this.isEditMode && this.selectedProjectId
      ? this.projectService.updateProject(this.selectedProjectId, this.projectForm.value)
      : this.projectService.createProject(this.projectForm.value);

    const successMessage = this.isEditMode ? 'Project updated successfully' : 'Project created successfully';
    const errorMessage = this.isEditMode ? 'Failed to update project' : 'Failed to create project';

    operation.subscribe({
      next: () => {
        this.showToast(successMessage, 'success');
        this.submitting = false;
        this.showCreateForm = false;
        this.isEditMode = false;
        this.selectedProjectId = null;
        this.projectForm.reset({ status: 'active' });
        this.getProjects();
      },
      error: () => {
        this.showToast(errorMessage, 'danger');
        this.submitting = false;
      }
    });
  }

  getProjects(): void {
    this.loadingProjects = true;

    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        this.projects = res.projects || res || [];
        this.loadingProjects = false;
      },
      error: () => {
        this.showToast('Failed to load projects', 'danger');
        this.loadingProjects = false;
      }
    });
  }

  openEditForm(project: Project): void {
    console.log('Opening edit form for project:', project);
    this.isEditMode = true;
    this.selectedProjectId = project.id || null;

    // Find and set the manager if exists
    if (project.project_manager_id) {
      const manager = this.allEmployees.find(emp => emp.id === project.project_manager_id);
      if (manager) {
        this.selectedManager = manager;
        this.managerSearchTerm = `${manager.FirstName} ${manager.LastName} (${manager.EmployeeNumber})`;
      }
    }

    this.projectForm.patchValue({
      project_code: project.project_code,
      project_name: project.project_name,
      client_name: project.client_name,
      start_date: this.formatDateForInput(project.start_date),
      end_date: this.formatDateForInput(project.end_date),
      status: project.status,
      description: project.description,
      project_manager_id: project.project_manager_id
    });
    this.showCreateForm = true;
  }

  private formatDateForInput(date: any): string {
    if (!date) return '';
    
    // If it's already a string starting with YYYY-MM-DD, just take that part
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
      return date.substring(0, 10);
    }
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    // Use UTC methods to avoid local timezone shifts for DATE values coming from MySQL
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  navigateToDetails(project: Project): void {
    if (project.id) {
      this.router.navigate(['/project-details', project.id]);
    }
  }

  /* ================= EMPLOYEE SEARCH FOR PROJECT MANAGER ================= */
  loadEmployees(): void {
    this.employeeService.getAllEmployees().subscribe({
      next: (response: any) => {
        if (Array.isArray(response)) {
          this.allEmployees = response;
        } else if (response.employees) {
          this.allEmployees = response.employees;
        } else if (response.data) {
          this.allEmployees = response.data;
        } else {
          this.allEmployees = [];
        }
      },
      error: (err) => {
        console.error('Error loading employees:', err);
        // Fallback: try search endpoint
        this.employeeService.searchEmployees('').subscribe({
          next: (employees) => {
            this.allEmployees = employees || [];
          },
          error: (err2) => {
            console.error('Error with search fallback:', err2);
          }
        });
      }
    });
  }

  onManagerSearch(event: any) {
    const query = event.detail.value?.toLowerCase() || '';
    this.managerSearchTerm = query;

    if (query.length < 2) {
      this.filteredManagers = [];
      return;
    }

    this.filteredManagers = this.allEmployees.filter(emp =>
      emp.FirstName?.toLowerCase().includes(query) ||
      emp.LastName?.toLowerCase().includes(query) ||
      emp.EmployeeNumber?.toLowerCase().includes(query) ||
      emp.WorkEmail?.toLowerCase().includes(query) ||
      `${emp.FirstName} ${emp.LastName}`.toLowerCase().includes(query)
    ).slice(0, 10); // Limit to 10 results
  }

  selectManager(employee: any) {
    this.selectedManager = employee;
    this.managerSearchTerm = `${employee.FirstName} ${employee.LastName} (${employee.EmployeeNumber})`;
    this.projectForm.patchValue({ project_manager_id: employee.id });
    this.filteredManagers = [];
  }

  clearManagerSelection() {
    this.selectedManager = null;
    this.managerSearchTerm = '';
    this.projectForm.patchValue({ project_manager_id: '' });
    this.filteredManagers = [];
  }

  private async showToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }
  adminManagement() {
    this.router.navigate(['./admin']);
  }
}
