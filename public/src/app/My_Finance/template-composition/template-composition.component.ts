import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PayrollService } from '../payroll-service.service';
import { IonicModule } from '@ionic/angular';
import { forkJoin } from 'rxjs';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmployeeService } from 'src/app/services/employee.service';

@Component({
  selector: 'app-template-composition',
  templateUrl: './template-composition.component.html',
  styleUrls: ['./template-composition.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink, ReactiveFormsModule]
})
export class TemplateCompositionComponent implements OnInit {
  templateId: number | null = null;
  templateInfo: any = null;
  compositionData: any[] = [];
  loading: boolean = false;
  totalEarnings: number = 0;
  totalDeductions: number = 0;

  isModalOpen = false;
  isEditMode = false;
  selectedCompositionId: number | null = null;
  compositionForm!: FormGroup;
  availableComponents: any[] = [];
  employees: any[] = [];
  filteredEmployees: any[] = [];
  employeeSearchTerm: string = '';

  constructor(
    private route: ActivatedRoute,
    private payrollService: PayrollService,
    private fb: FormBuilder,
    private employeeService: EmployeeService
  ) { }

  trackById(index: number, item: any) {
    return item.composition_id || item.component_id || index;
  }

  ngOnInit() {
    this.initForm();
    this.fetchEmployees();
    this.fetchAvailableComponents();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.templateId = +id;
        this.fetchTemplateDetails();
        this.fetchComposition();
      }
    });
  }

  initForm() {
    this.compositionForm = this.fb.group({
      component_id: [null, Validators.required],
      formula_or_value: ['', Validators.required],
      created_by: [Number(localStorage.getItem('employee_id')) || 1, Validators.required]
    });
  }

  fetchEmployees() {
    this.employeeService.getAllEmployees().subscribe(res => {
      this.employees = res;
      this.filteredEmployees = res;
    });
  }

  filterEmployees(event: any) {
    const term = event.target.value.toLowerCase();
    this.employeeSearchTerm = term;
    if (!term) {
      this.filteredEmployees = this.employees;
      return;
    }
    this.filteredEmployees = this.employees.filter(emp =>
      emp.FullName.toLowerCase().includes(term) ||
      emp.EmployeeNumber?.toLowerCase().includes(term)
    );
  }

  selectEmployee(emp: any) {
    this.compositionForm.patchValue({ created_by: emp.id });
    this.employeeSearchTerm = emp.FullName;
    this.filteredEmployees = []; // Hide list after selection
  }

  fetchAvailableComponents() {
    this.payrollService.getPayrollComponents().subscribe((res: any) => {
      this.availableComponents = Array.isArray(res) ? res : (res.data || []);
    });
  }

  openAddModal() {
    this.isEditMode = false;
    this.selectedCompositionId = null;
    this.isModalOpen = true;
    this.employeeSearchTerm = '';
    this.filteredEmployees = this.employees;
    this.compositionForm.reset({
      component_id: null,
      formula_or_value: '',
      created_by: Number(localStorage.getItem('employee_id')) || 1
    });
  }

  editComposition(comp: any) {
    this.isEditMode = true;
    this.selectedCompositionId = comp.composition_id;
    this.isModalOpen = true;

    // Set search term for employee
    const creator = this.employees.find(e => e.id === comp.created_by);
    this.employeeSearchTerm = creator ? creator.FullName : `User #${comp.created_by}`;
    this.filteredEmployees = [];

    this.compositionForm.patchValue({
      component_id: comp.component_id,
      formula_or_value: comp.formula_or_value,
      created_by: comp.created_by
    });
  }

  deleteComposition(compositionId: number) {
    if (!this.templateId) return;
    if (confirm('Are you sure you want to remove this component from the template?')) {
      this.payrollService.deleteTemplateComposition(this.templateId, compositionId).subscribe({
        next: () => {
          this.fetchComposition();
        },
        error: (err) => {
          console.error('Error deleting composition:', err);
          alert('Failed to delete component');
        }
      });
    }
  }

  saveComposition() {
    if (this.compositionForm.invalid || !this.templateId) return;

    const payload = {
      ...this.compositionForm.value,
      component_id: Number(this.compositionForm.value.component_id),
      created_by: Number(this.compositionForm.value.created_by)
    };

    if (this.isEditMode && this.selectedCompositionId) {
      this.payrollService.updateTemplateComposition(this.templateId, this.selectedCompositionId, payload).subscribe({
        next: () => {
          this.isModalOpen = false;
          this.fetchComposition();
        },
        error: (err) => {
          console.error('Error updating component in template:', err);
          alert('Failed to update component');
        }
      });
    } else {
      this.payrollService.addComponentToTemplate(this.templateId, payload).subscribe({
        next: () => {
          this.isModalOpen = false;
          this.fetchComposition();
        },
        error: (err) => {
          console.error('Error adding component to template:', err);
          alert('Failed to add component');
        }
      });
    }
  }

  fetchTemplateDetails() {
    if (!this.templateId) return;
    this.payrollService.getTemplateById(this.templateId).subscribe({
      next: (res: any) => {
        this.templateInfo = res.data || res;
      },
      error: (err) => console.error('Error fetching template details:', err)
    });
  }

  fetchComposition() {
    if (!this.templateId) return;
    this.loading = true;

    this.payrollService.getTemplateComposition(this.templateId).subscribe({
      next: (res: any) => {
        const rawComposition = Array.isArray(res) ? res : (res.data || []);
        console.log('Raw Composition Data:', rawComposition);

        if (rawComposition.length === 0) {
          this.compositionData = [];
          this.loading = false;
          return;
        }

        const componentRequests = rawComposition.map((item: any) =>
          this.payrollService.getComponentById(item.component_id)
        );

        (forkJoin(componentRequests) as any).subscribe({
          next: (componentResults: any[]) => {
            this.compositionData = rawComposition.map((item: any, index: number) => {
              const component = componentResults[index];
              const compData = Array.isArray(component) ? component[0] : (component?.data || component);
              return {
                ...item,
                component_name: compData?.name || compData?.component_name || `Component #${item.component_id}`,
                component_code: compData?.code || compData?.component_code || '-',
                component_type: compData?.type || compData?.component_type || '-',
                calculation_type: compData?.calculation_type || '-',
                percentage_of_code: compData?.percentage_of_code || compData?.base_code || null,
                value: item.formula_or_value || compData?.value || 0,
                is_taxable: compData?.taxable ?? compData?.is_taxable ?? false,
                is_prorated: compData?.prorated ?? compData?.is_prorated ?? false,
                sequence: compData?.sequence || 0,
                notes: compData?.notes || ''
              };
            });

            this.calculateTotals();
            this.loading = false;
          },
          error: (err: any) => {
            console.error('Error fetching component details:', err);
            this.compositionData = rawComposition;
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Error fetching composition:', err);
        this.loading = false;
      }
    });
  }

  calculateTotals() {
    this.totalEarnings = this.compositionData
      .filter(c => (c.component_type)?.toLowerCase() === 'earning')
      .reduce((sum, c) => {
        const val = parseFloat(c.value);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

    this.totalDeductions = this.compositionData
      .filter(c => (c.component_type)?.toLowerCase() === 'deduction')
      .reduce((sum, c) => {
        const val = parseFloat(c.value);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
  }
}
