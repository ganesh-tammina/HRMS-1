import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PayrollService } from '../../payroll-service.service';
import { IonicModule } from '@ionic/angular';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { EmployeeService } from 'src/app/services/employee.service';

@Component({
  selector: 'app-structure-compoents',
  templateUrl: './structure-compoents.component.html',
  styleUrls: ['./structure-compoents.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink, ReactiveFormsModule]
})
export class StructureCompoentsComponent implements OnInit {
  structureId: number | null = null;
  structureInfo: any = null;
  compositionData: any[] = [];
  loading: boolean = false;
  totalEarnings: number = 0;
  totalDeductions: number = 0;
  viewMode: 'annual' | 'monthly' = 'annual';

  isModalOpen = false;
  isEditMode = false;
  selectedComponentId: number | null = null;
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

  ngOnInit() {
    this.initForm();
    this.fetchEmployees();
    this.fetchAvailableComponents();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.structureId = +id;
        this.fetchStructureDetails();
      }
    });
  }

  initForm() {
    this.compositionForm = this.fb.group({
      // Mapping fields (for Add mode)
      component_id: [null],
      formula_or_value: [''],

      // Full fields (for Edit mode / Syncing)
      code: [''],
      name: [''],
      component_type: ['EARNING'],
      calculation_type: ['FIXED'],
      value: [0],
      percentage_of_code: ['BASIC'],
      taxable: [true],
      prorated: [false],
      sequence: [10],
      notes: [''],
      created_by: [Number(localStorage.getItem('employee_id')) || 1]
    });
  }

  fetchEmployees() {
    this.employeeService.getAllEmployees().subscribe((res: any) => {
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
    this.filteredEmployees = [];
  }

  fetchAvailableComponents() {
    this.payrollService.getPayrollComponents().subscribe((res: any) => {
      const allComps = Array.isArray(res) ? res : (res.data || []);

      // Filter unique components by code to avoid duplicate entries from multiple employee structures
      const uniqueComps: any[] = [];
      const codes = new Set();

      // Priority: Master components (usually those in structures with no employee_id or MASTER_ name)
      // For now, we take the first unique instance of each code we find
      allComps.forEach((c: any) => {
        if (!codes.has(c.code)) {
          codes.add(c.code);
          uniqueComps.push(c);
        }
      });

      this.availableComponents = uniqueComps;
    });
  }

  fetchStructureDetails() {
    if (!this.structureId) return;
    this.loading = true;
    this.payrollService.getPayrollStructureById(this.structureId).subscribe({
      next: (res: any) => {
        const fullData = res.data || res;
        this.structureInfo = fullData.structure || fullData;

        // Load components into local array for editing
        this.compositionData = JSON.parse(JSON.stringify(fullData.components || fullData.salary_components || []));

        this.calculateTotals();
        this.loading = false;
        console.log('📦 Structure Details:', this.structureInfo);
      },
      error: (err) => {
        console.error('Error fetching structure details:', err);
        this.loading = false;
      }
    });
  }

  calculateTotals() {
    const ctc = Number(this.structureInfo?.ctc_amount) || 0;
    const calculatedAmts: { [code: string]: number } = { 'CTC': ctc };

    // Pass 1: Handle FIXED values and PERCENTAGE OF CTC
    this.compositionData.forEach(c => {
      if (c.calculation_type === 'FIXED') {
        calculatedAmts[c.code] = Number(c.value) || 0;
      } else if (c.calculation_type === 'PERCENTAGE' && (c.percentage_of_code === 'CTC' || !c.percentage_of_code)) {
        calculatedAmts[c.code] = (ctc * (Number(c.value) || 0)) / 100;
      }
    });

    // Pass 2: Handle PERCENTAGE OF other components (e.g., HRA as % of BASIC)
    // We do one pass which assumes BASIC is calculated in Pass 1
    this.compositionData.forEach(c => {
      if (c.calculation_type === 'PERCENTAGE' && c.percentage_of_code && c.percentage_of_code !== 'CTC') {
        const baseAmt = calculatedAmts[c.percentage_of_code] || 0;
        calculatedAmts[c.code] = (baseAmt * (Number(c.value) || 0)) / 100;
      }
    });

    // Pass 3: Handle ESI Employer Formula: (CTC - Employer PF) * 3.25 / 103.25
    // Pass 3: Handle ESI Employer Formula: (CTC - Employer PF) * 3.25 / 103.25
    this.compositionData.forEach(c => {
      const code = (c.code || '').toUpperCase();
      const name = (c.name || '').toUpperCase();
      const isESIEmployer = code.includes('ESI') &&
        (code.includes('EMPLOYER') || code.includes('EMPLOYOR') || code.includes('ER') ||
          name.includes('EMPLOYER') || name.includes('EMPLOYOR') || name.includes('ER'));

      if (isESIEmployer) {
        let pfm = 0;
        Object.keys(calculatedAmts).forEach(k => {
          const keyUpper = k.toUpperCase();
          if (keyUpper.includes('PF') &&
            (keyUpper.includes('EMPLOYER') || keyUpper.includes('EMPLOYOR') || keyUpper.includes('ER'))) {
            pfm = calculatedAmts[k];
          }
        });
        calculatedAmts[c.code] = (ctc - pfm) * (3.25 / 103.25);
      }
    });

    // Pass 4: Handle ESI Employee Formula: (Gross - Employer PF - ESI Employer) * 0.75 / 100
    this.compositionData.forEach(c => {
      const code = (c.code || '').toUpperCase();
      const name = (c.name || '').toUpperCase();
      const isESIEmployee = code.includes('ESI') &&
        (code.includes('EMPLOYEE') || code.includes('EE') || name.includes('EMPLOYEE') || name.includes('EE')) &&
        !code.includes('EMPLOYER') && !code.includes('ER');

      if (isESIEmployee) {
        let pfm = 0;
        let esier = 0;
        Object.keys(calculatedAmts).forEach(k => {
          const keyUpper = k.toUpperCase();
          if (keyUpper.includes('PF') && (keyUpper.includes('EMPLOYER') || keyUpper.includes('EMPLOYOR') || keyUpper.includes('ER'))) {
            pfm = calculatedAmts[k];
          }
          if (keyUpper.includes('ESI') && (keyUpper.includes('EMPLOYER') || keyUpper.includes('EMPLOYOR') || keyUpper.includes('ER'))) {
            esier = calculatedAmts[k];
          }
        });
        // Base is effectively Gross (CTC - ER PF - ER ESI)
        calculatedAmts[c.code] = (ctc - pfm - esier) * (0.75 / 100);
      }
    });

    // Final Pass: Sum them up, handle balancing (Special Allowance), and attach amounts for UI
    this.totalEarnings = 0;
    this.totalDeductions = 0;

    // 1. First, identify the Special Allowance component
    const specialAllowanceComp = this.compositionData.find(c =>
      c.code?.toUpperCase() === 'SPECIAL_ALLOWANCE' ||
      c.code?.toUpperCase() === 'SPECIAL ALLOWANCE' ||
      c.name?.toUpperCase() === 'SPECIAL ALLOWANCE'
    );

    // 2. Calculate sum of ALL other components first
    let sumOfOthers = 0;
    this.compositionData.forEach(c => {
      if (c === specialAllowanceComp) return;
      sumOfOthers += calculatedAmts[c.code] || 0;
    });

    // 3. Assign the balance to Special Allowance (Special Allowance = CTC - Sum of all other components)
    if (specialAllowanceComp) {
      const balance = Math.max(0, ctc - sumOfOthers);
      calculatedAmts[specialAllowanceComp.code] = balance;
      if (specialAllowanceComp.calculation_type === 'FIXED') {
        specialAllowanceComp.value = balance;
      }
    }

    // 4. Final total calculation for UI
    this.totalEarnings = 0;
    this.totalDeductions = 0;

    this.compositionData.forEach(c => {
      const annualAmt = calculatedAmts[c.code] || 0;
      c.annual_amount = Math.round(annualAmt);
      c.monthly_amount = Math.round(annualAmt / 12);

      const currentAmt = this.viewMode === 'annual' ? c.annual_amount : c.monthly_amount;
      c.calculated_amount = currentAmt;

      if ((c.component_type)?.toUpperCase() === 'EARNING') {
        this.totalEarnings += currentAmt;
      } else if ((c.component_type)?.toUpperCase() === 'DEDUCTION' || (c.component_type)?.toUpperCase() === 'CONTRIBUTION') {
        this.totalDeductions += currentAmt;
      }
    });
  }

  toggleView(mode: 'annual' | 'monthly') {
    this.viewMode = mode;
    this.calculateTotals();
  }

  updateEmployeeCTC() {
    if (!this.structureInfo?.employee_id || !this.structureInfo?.ctc_amount) {
      alert('Employee or CTC information missing');
      return;
    }

    const payload = {
      lpa: Number(this.structureInfo.ctc_amount)
    };

    if (confirm(`Do you want to update the employee's Annual CTC to ${this.structureInfo.ctc_amount} in their profile?`)) {
      this.employeeService.updateEmployeeProfile(this.structureInfo.employee_id, payload).subscribe({
        next: () => {
          alert('Employee CTC updated successfully in profile');
        },
        error: (err: any) => {
          console.error('Error updating employee CTC:', err);
          alert('Failed to update employee CTC');
        }
      });
    }
  }

  openAddModal() {
    this.isEditMode = false;
    this.selectedComponentId = null;
    this.isModalOpen = true;
    this.employeeSearchTerm = '';
    this.filteredEmployees = this.employees;

    // Reset all validators first
    Object.keys(this.compositionForm.controls).forEach(key => {
      this.compositionForm.get(key)?.clearValidators();
    });

    this.compositionForm.reset({
      component_id: null,
      formula_or_value: '',
      component_type: 'EARNING',
      calculation_type: 'FIXED',
      percentage_of_code: 'BASIC',
      taxable: true,
      prorated: false,
      sequence: 10,
      value: 0,
      created_by: Number(localStorage.getItem('employee_id')) || 1
    });

    // Set Add-specific validators
    this.compositionForm.get('component_id')?.setValidators([Validators.required]);
    this.compositionForm.get('formula_or_value')?.setValidators([Validators.required]);
    this.compositionForm.get('created_by')?.setValidators([Validators.required]);

    this.compositionForm.updateValueAndValidity();
  }

  editComponent(comp: any) {
    this.isEditMode = true;
    this.selectedComponentId = comp.id;
    this.isModalOpen = true;

    // Clear all validators first
    Object.keys(this.compositionForm.controls).forEach(key => {
      this.compositionForm.get(key)?.clearValidators();
    });

    // Set Edit-specific validators
    this.compositionForm.get('code')?.setValidators([Validators.required]);
    this.compositionForm.get('name')?.setValidators([Validators.required]);
    this.compositionForm.get('component_type')?.setValidators([Validators.required]);
    this.compositionForm.get('calculation_type')?.setValidators([Validators.required]);
    this.compositionForm.get('value')?.setValidators([Validators.required, Validators.min(0)]);
    this.compositionForm.get('sequence')?.setValidators([Validators.required]);
    this.compositionForm.get('created_by')?.setValidators([Validators.required]);

    // Set search term for employee
    const creator = this.employees.find(e => e.id === (comp.created_by || this.structureInfo?.created_by));
    this.employeeSearchTerm = creator ? creator.FullName : '';
    this.filteredEmployees = [];

    this.compositionForm.patchValue({
      code: comp.code,
      name: comp.name,
      component_type: comp.component_type,
      calculation_type: comp.calculation_type,
      value: comp.value,
      percentage_of_code: comp.percentage_of_code,
      taxable: !!comp.taxable,
      prorated: !!comp.prorated,
      sequence: comp.sequence,
      notes: comp.notes,
      created_by: comp.created_by || this.structureInfo?.created_by || 1
    });

    this.compositionForm.updateValueAndValidity();
  }

  saveComponent() {
    if (this.compositionForm.invalid || !this.structureId) return;

    const formValue = this.compositionForm.value;
    let payload: any;

    if (this.isEditMode) {
      payload = {
        structure_id: this.structureId,
        code: formValue.code,
        name: formValue.name,
        component_type: formValue.component_type,
        calculation_type: formValue.calculation_type,
        value: Number(formValue.value),
        percentage_of_code: formValue.percentage_of_code,
        taxable: !!formValue.taxable,
        prorated: !!formValue.prorated,
        sequence: Number(formValue.sequence),
        notes: formValue.notes,
        created_by: Number(formValue.created_by)
      };

      this.payrollService.updatePayrollComponent(this.selectedComponentId!, payload).subscribe({
        next: () => {
          this.isModalOpen = false;
          this.fetchStructureDetails();
        },
        error: (err) => {
          console.error('Error updating component:', err);
          alert('Failed to update component');
        }
      });
    } else {
      const masterComp = this.availableComponents.find(c => c.id == formValue.component_id);
      if (!masterComp) {
        alert('Invalid component selected');
        return;
      }

      let fValue = formValue.formula_or_value.toString();
      let calculationType = 'FIXED';
      let numericValue = 0;

      if (fValue.includes('%')) {
        calculationType = 'PERCENTAGE';
        numericValue = parseFloat(fValue.replace('%', '').trim());
      } else {
        numericValue = parseFloat(fValue.trim());
      }

      payload = {
        structure_id: this.structureId,
        code: masterComp.code,
        name: masterComp.name,
        component_type: masterComp.component_type,
        calculation_type: calculationType,
        value: numericValue,
        percentage_of_code: masterComp.percentage_of_code || (calculationType === 'PERCENTAGE' ? 'BASIC' : null),
        taxable: !!masterComp.taxable,
        prorated: !!masterComp.prorated,
        sequence: masterComp.sequence || 10,
        notes: masterComp.notes || '',
        created_by: Number(formValue.created_by)
      };

      this.payrollService.createPayrollComponent(payload).subscribe({
        next: () => {
          this.isModalOpen = false;
          this.fetchStructureDetails();
        },
        error: (err) => {
          console.error('Error adding component:', err);
          alert('Failed to add component');
        }
      });
    }
  }

  deleteComponent(id: number) {
    if (confirm('Are you sure you want to remove this component from the structure?')) {
      this.payrollService.deletePayrollComponent(id).subscribe({
        next: () => {
          this.fetchStructureDetails();
        },
        error: (err) => {
          console.error('Error deleting component:', err);
          alert('Failed to delete component');
        }
      });
    }
  }

  goBack() {
    window.history.back();
  }
}

