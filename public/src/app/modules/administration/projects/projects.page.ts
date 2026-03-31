import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { ProjectService, Project } from 'src/app/core/services/project.service';
import { EmployeeService } from 'src/app/core/services/employee.service';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.page.html',
  styleUrls: ['./projects.page.scss'],
  standalone: false,
})
export class ProjectsPage implements OnInit {
  projectForm!: FormGroup;
  submitting = false;
  projects: Project[] = [];
  loadingProjects = false;
  showCreateForm = false;
  isEditMode = false;
  selectedProjectId: number | null = null;

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

  ngOnInit() {
    this.initForm();
    this.getProjects();
    this.loadEmployees();
  }

  private initForm() {
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

  getProjects() {
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

  loadEmployees() {
    this.employeeService.getAllEmployees(1, 1000).subscribe({
      next: (res: any) => {
        this.allEmployees = res.data || [];
      }
    });
  }

  submit() {
    if (this.projectForm.invalid) {
      this.showToast('Please fill all required fields', 'warning');
      return;
    }

    this.submitting = true;
    const action = this.isEditMode && this.selectedProjectId
      ? this.projectService.updateProject(this.selectedProjectId, this.projectForm.value)
      : this.projectService.createProject(this.projectForm.value);

    action.subscribe({
      next: () => {
        this.showToast(this.isEditMode ? 'Project updated' : 'Project created', 'success');
        this.submitting = false;
        this.showCreateForm = false;
        this.getProjects();
        this.cancelCreate();
      },
      error: () => {
        this.showToast('Operation failed', 'danger');
        this.submitting = false;
      }
    });
  }

  openEditForm(project: Project) {
    this.isEditMode = true;
    this.selectedProjectId = project.id || null;
    this.showCreateForm = true;
    
    if (project.project_manager_id) {
       const manager = this.allEmployees.find(e => e.id === project.project_manager_id);
       if (manager) {
           this.selectedManager = manager;
           this.managerSearchTerm = `${manager.FullName}`;
       }
    }

    this.projectForm.patchValue({
      project_code: project.project_code,
      project_name: project.project_name,
      client_name: project.client_name,
      start_date: this.formatDate(project.start_date),
      end_date: this.formatDate(project.end_date),
      status: project.status,
      description: project.description,
      project_manager_id: project.project_manager_id
    });
  }

  cancelCreate() {
    this.showCreateForm = false;
    this.isEditMode = false;
    this.selectedProjectId = null;
    this.projectForm.reset({ status: 'active' });
    this.selectedManager = null;
    this.managerSearchTerm = '';
  }

  onManagerSearch(event: any) {
    const query = event.detail.value?.toLowerCase() || '';
    if (query.length < 2) {
      this.filteredManagers = [];
      return;
    }
    this.filteredManagers = this.allEmployees.filter(emp => 
      emp.FullName?.toLowerCase().includes(query) || 
      emp.id.toString().includes(query)
    ).slice(0, 10);
  }

  selectManager(emp: any) {
    this.selectedManager = emp;
    this.managerSearchTerm = emp.FullName;
    this.projectForm.patchValue({ project_manager_id: emp.id });
    this.filteredManagers = [];
  }

  clearManagerSelection() {
    this.selectedManager = null;
    this.managerSearchTerm = '';
    this.projectForm.patchValue({ project_manager_id: '' });
    this.filteredManagers = [];
  }

  navigateToDetails(project: Project) {
    if (project.id) {
      this.router.navigate(['/administration/projects/details', project.id]);
    }
  }

  private formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary' = 'primary') {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'top' });
    toast.present();
  }
}
