import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PayrollService } from '../../payroll-service.service';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-payroll-templates',
  templateUrl: './payroll-templates.component.html',
  styleUrls: ['./payroll-templates.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ReactiveFormsModule],
})
export class PayrollTemplatesComponent implements OnInit {
  templates: any[] = [];
  isModalOpen = false;
  isEditMode = false;
  selectedTemplateId: number | null = null;
  templateForm!: FormGroup;

  constructor(
    private payrollService: PayrollService,
    private router: Router,
    private fb: FormBuilder
  ) { }

  ngOnInit() {
    this.initForm();
    this.fetchTemplates();
  }

  initForm() {
    this.templateForm = this.fb.group({
      template_name: ['', Validators.required],
      description: [''],
      is_active: [true],
    });
  }

  fetchTemplates() {
    this.payrollService.getPayrollTempletes().subscribe((res: any) => {
      this.templates = Array.isArray(res) ? res : (res.data || []);
    });
  }

  viewComposition(templateId: number) {
    this.router.navigate(['/template-composition', templateId]);
  }

  goBack() {
    this.router.navigate(['/masterpayroll']);
  }

  openCreateModal() {
    this.isEditMode = false;
    this.selectedTemplateId = null;
    this.isModalOpen = true;
    this.templateForm.reset({
      template_name: '',
      description: '',
      is_active: true
    });
  }

  editTemplate(temp: any) {
    this.isEditMode = true;
    this.selectedTemplateId = temp.template_id || temp.id;
    this.isModalOpen = true;
    this.templateForm.patchValue({
      template_name: temp.template_name || temp.name,
      description: temp.description,
      is_active: !!temp.is_active
    });
  }

  saveTemplate() {
    if (this.templateForm.invalid) return;

    const formValue = this.templateForm.value;
    const payload = {
      template_name: formValue.template_name,
      description: formValue.description,
      created_by: Number(localStorage.getItem('employee_id')) || 1
    };

    if (this.isEditMode && this.selectedTemplateId) {
      this.payrollService.updateTemplate(this.selectedTemplateId, payload).subscribe({
        next: () => {
          this.isModalOpen = false;
          this.fetchTemplates();
        },
        error: (err) => alert('Failed to update template')
      });
    } else {
      this.payrollService.createTemplate(payload).subscribe({
        next: () => {
          this.isModalOpen = false;
          this.fetchTemplates();
        },
        error: (err) => alert('Failed to create template')
      });
    }
  }

  deleteTemplate(id: number) {
    if (confirm('Are you sure you want to delete this template?')) {
      this.payrollService.deleteTemplate(id).subscribe((res: any) => {
        this.fetchTemplates();
      });
    }
  }
}
