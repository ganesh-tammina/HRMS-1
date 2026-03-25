import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { PayrollService } from '../payroll-service.service';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { EmployeeService } from 'src/app/services/employee.service';

@Component({
  selector: 'app-payroll-structure',
  templateUrl: './payroll-structure.component.html',
  styleUrls: ['./payroll-structure.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ReactiveFormsModule],
})
export class PayrollStructureComponent implements OnInit {
  structures: any[] = [];
  loading = true;
  activeCount = 0;
  inactiveCount = 0;

  isModalOpen = false;
  structureForm!: FormGroup;
  employees: any[] = [];
  filteredEmployees: any[] = [];
  availableComponents: any[] = [];
  selectedComponents: any[] = [];
  employeeSearchTerm: string = '';
  isEditMode = false;
  selectedStructureId: number | null = null;

  constructor(
    private payrollService: PayrollService,
    private router: Router,
    private fb: FormBuilder,
    private employeeService: EmployeeService
  ) { }

  ngOnInit() {
    this.initForm();
    this.fetchStructures();
    this.fetchEmployees();
    this.fetchComponents();
  }

  initForm() {
    this.structureForm = this.fb.group({
      employee_id: [null, Validators.required],
      structure_name: ['', Validators.required],
      ctc_amount: [0, [Validators.required, Validators.min(0)]],
      effective_from: [new Date().toISOString().split('T')[0], Validators.required],
      effective_to: [null],
      is_active: [true],
      notes: [''],
    });
  }

  fetchStructures() {
    this.loading = true;
    this.payrollService.getPayrollstructures().subscribe({
      next: (res: any) => {
        this.structures = Array.isArray(res) ? res : (res.data || []);
        this.activeCount = this.structures.filter(s => s.is_active).length;
        this.inactiveCount = this.structures.filter(s => !s.is_active).length;
        this.loading = false;
        console.log('📦 Payroll Structures:', this.structures);
      },
      error: (err: any) => {
        console.error('Failed to load structures:', err);
        this.loading = false;
      }
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
    this.structureForm.patchValue({ employee_id: emp.id });
    this.employeeSearchTerm = emp.FullName;
    this.filteredEmployees = []; // Hide list after selection
  }

  fetchComponents() {
    this.payrollService.getPayrollComponents().subscribe((res: any) => {
      this.availableComponents = Array.isArray(res) ? res : (res.data || []);
    });
  }

  addComponent(comp: any) {
    if (!this.selectedComponents.find(c => c.id === comp.id)) {
      this.selectedComponents.push(comp);
    }
  }

  removeComponent(index: number) {
    this.selectedComponents.splice(index, 1);
  }

  openCreateModal() {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.selectedStructureId = null;
    this.selectedComponents = [];
    this.employeeSearchTerm = '';
    this.filteredEmployees = this.employees;
    this.structureForm.reset({
      employee_id: null,
      structure_name: '',
      ctc_amount: 0,
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: null,
      is_active: true,
      notes: '',
    });
  }

  editStructure(struct: any) {
    if (!struct) return;
    this.isModalOpen = true;
    this.isEditMode = true;
    this.selectedStructureId = struct.id || struct.structure_id;

    // 1. Populate immediately with available data from the list
    const emp = this.employees.find(e => e.id === struct.employee_id);
    this.employeeSearchTerm = emp ? emp.FullName : '';
    this.structureForm.patchValue({
      employee_id: struct.employee_id,
      structure_name: struct.structure_name,
      ctc_amount: struct.ctc_amount,
      effective_from: struct.effective_from ? (typeof struct.effective_from === 'string' && struct.effective_from.includes('T') ? struct.effective_from.split('T')[0] : struct.effective_from) : '',
      effective_to: struct.effective_to ? (typeof struct.effective_to === 'string' && struct.effective_to.includes('T') ? struct.effective_to.split('T')[0] : struct.effective_to) : null,
      is_active: !!struct.is_active,
      notes: struct.notes,
    });
    this.selectedComponents = struct.components || [];

    // 2. Fetch full details (which returns { structure, components })
    this.payrollService.getPayrollStructureById(this.selectedStructureId!).subscribe({
      next: (res: any) => {
        const fullData = res.data || res;
        // The API returns { structure: {...}, components: [...] }
        const mainInfo = fullData.structure || fullData;
        const comps = fullData.components || [];

        if (mainInfo) {
          const empFull = this.employees.find(e => e.id === mainInfo.employee_id);
          this.employeeSearchTerm = empFull ? empFull.FullName : this.employeeSearchTerm;

          this.structureForm.patchValue({
            employee_id: mainInfo.employee_id,
            structure_name: mainInfo.structure_name,
            ctc_amount: mainInfo.ctc_amount,
            effective_from: mainInfo.effective_from ? (typeof mainInfo.effective_from === 'string' && mainInfo.effective_from.includes('T') ? mainInfo.effective_from.split('T')[0] : mainInfo.effective_from) : '',
            effective_to: mainInfo.effective_to ? (typeof mainInfo.effective_to === 'string' && mainInfo.effective_to.includes('T') ? mainInfo.effective_to.split('T')[0] : mainInfo.effective_to) : null,
            is_active: !!mainInfo.is_active,
            notes: mainInfo.notes,
          });
          this.selectedComponents = comps;
        }
      },
      error: (err) => {
        console.error('Error fetching full structure details:', err);
      }
    });
  }

  deleteStructure(id: number) {
    if (confirm('Are you sure you want to delete this payroll structure?')) {
      this.payrollService.deletePayrollStructure(id).subscribe({
        next: () => {
          this.fetchStructures();
        },
        error: (err) => {
          console.error('Error deleting structure:', err);
          alert('Failed to delete structure');
        }
      });
    }
  }

  saveStructure() {
    if (this.structureForm.invalid) return;

    const formValue = this.structureForm.value;
    const payload = {
      ...formValue,
      employee_id: Number(formValue.employee_id),
      ctc_amount: Number(formValue.ctc_amount),
      created_by: Number(localStorage.getItem('employee_id')) || 1,
      components: this.selectedComponents.map(c => ({
        code: c.code,
        name: c.name,
        component_type: c.component_type,
        calculation_type: c.calculation_type,
        value: Number(c.value),
        percentage_of_code: c.percentage_of_code,
        taxable: !!c.taxable,
        prorated: !!c.prorated,
        sequence: Number(c.sequence),
        notes: c.notes
      }))
    };

    const request = this.isEditMode && this.selectedStructureId
      ? this.payrollService.updatePayrollStructure(this.selectedStructureId, payload)
      : this.payrollService.createPayrollStructure(payload);

    request.subscribe({
      next: () => {
        this.isModalOpen = false;
        this.fetchStructures();
      },
      error: (err) => {
        console.error('Error saving structure:', err);
        alert('Failed to save structure: ' + (err.error?.message || err.message));
      }
    });
  }

  formatCurrency(amount: string | number): string {
    const num = Number(amount);
    if (isNaN(num)) return '-';
    return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  getStatusLabel(isActive: number): string {
    return isActive ? 'Active' : 'Inactive';
  }

  viewDetails(structureId: number) {
    this.router.navigate(['/structure-composition', structureId]);
  }

  goBack() {
    this.router.navigate(['/masterpayroll']);
  }

  trackById(index: number, item: any) {
    return item.id || index;
  }
}
