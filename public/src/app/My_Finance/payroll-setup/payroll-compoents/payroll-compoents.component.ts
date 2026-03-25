import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PayrollService } from '../../payroll-service.service';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-payroll-compoents',
  templateUrl: './payroll-compoents.component.html',
  styleUrls: ['./payroll-compoents.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
})
export class PayrollCompoentsComponent implements OnInit {
  components: any[] = [];
  componentForm!: FormGroup;
  token = '';
  isModalOpen = false;
  isEditMode = false;
  selectedComponentId: number | null = null;
  structures: any[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private payrollService: PayrollService
  ) { }

  ngOnInit() {
    this.token = localStorage.getItem('token') || '';
    this.componentForm = this.fb.group({
      structure_id: [1, Validators.required],
      code: ['', Validators.required],
      name: ['', Validators.required],
      component_type: ['EARNING', Validators.required],
      calculation_type: ['FIXED', Validators.required],
      value: [0, [Validators.required, Validators.min(0)]],
      percentage_of_code: ['BASIC'],
      taxable: [true],
      prorated: [false],
      sequence: [10, Validators.required],
      notes: ['']
    });
    this.fetchComponents();
    this.fetchStructures();
  }

  fetchStructures() {
    this.payrollService.getPayrollstructures().subscribe((res: any) => {
      this.structures = Array.isArray(res) ? res : (res.data || []);
      console.log(this.structures);
      if (this.structures.length > 0) {
        this.componentForm.patchValue({ structure_id: this.structures[0].id });
      }
    });
  }

  fetchComponents() {
    this.payrollService.getPayrollComponents().subscribe((res: any) => {
      this.components = Array.isArray(res) ? res : (res.data || []);
    });
  }

  openCreateModal() {
    this.isEditMode = false;
    this.selectedComponentId = null;
    this.componentForm.reset({
      structure_id: this.structures.length > 0 ? this.structures[0].id : 1,
      component_type: 'EARNING',
      calculation_type: 'FIXED',
      percentage_of_code: 'BASIC',
      taxable: true,
      prorated: false,
      sequence: 10,
      value: 0
    });
    this.isModalOpen = true;
  }

  editComponent(comp: any) {
    this.isEditMode = true;
    this.selectedComponentId = comp.id;
    this.componentForm.patchValue({
      structure_id: comp.structure_id,
      code: comp.code,
      name: comp.name,
      component_type: comp.component_type,
      calculation_type: comp.calculation_type,
      value: comp.value,
      percentage_of_code: comp.percentage_of_code,
      taxable: comp.taxable,
      prorated: comp.prorated,
      sequence: comp.sequence,
      notes: comp.notes
    });
    this.isModalOpen = true;
  }

  deleteComponent(id: number) {
    if (confirm('Are you sure you want to delete this component?')) {
      this.payrollService.deletePayrollComponent(id).subscribe(() => {
        this.fetchComponents();
      });
    }
  }

  saveComponent() {
    if (!this.token || this.componentForm.invalid) return;
    const formValue = this.componentForm.value;
    const payload = {
      ...formValue,
      value: Number(formValue.value),
      sequence: Number(formValue.sequence),
      structure_id: Number(formValue.structure_id)
    };

    if (payload.calculation_type === 'FIXED') {
      delete payload.percentage_of_code;
    }

    if (this.isEditMode && this.selectedComponentId) {
      this.payrollService.updatePayrollComponent(this.selectedComponentId, payload).subscribe(() => {
        this.closeModal();
        this.fetchComponents();
      });
    } else {
      this.payrollService.createPayrollComponent(payload).subscribe(() => {
        this.closeModal();
        this.fetchComponents();
      });
    }
  }

  closeModal() {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.selectedComponentId = null;
  }

  getTotal() {
    return this.components.reduce((sum, c) => sum + Number(c.value), 0);
  }
  goBack() {
    this.router.navigate(['/masterpayroll']);
  }
}
