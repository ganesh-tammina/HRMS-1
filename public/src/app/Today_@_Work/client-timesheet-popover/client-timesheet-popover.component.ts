import { Component, Input, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-client-timesheet-modal',
  templateUrl: './client-timesheet-popover.component.html',
  styleUrls: ['./client-timesheet-popover.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, ReactiveFormsModule]
})
export class ClientTimesheetPopoverComponent {

  @Input() data: any;
  sheetForm: FormGroup;
  daysArray: number[] = Array.from({ length: 31 }, (_, i) => i + 1);

  API_URL: string = 'https://30.0.0.78:3562/api/timesheet';

  formattedDate: string = '';
  formattedDate1: string = '';
  formattedDate2: string = '';
  @ViewChild('dateModal', { static: false }) dateModal: any;
  @ViewChild('dateModal1', { static: false }) dateModal1: any;
  @ViewChild('dateModal2', { static: false }) dateModal2: any;
  
  constructor(
    private modalCtrl: ModalController,
    private fb: FormBuilder,
    private http: HttpClient
  ) {

    // FORM GROUP
    this.sheetForm = this.fb.group({
      time_sheet_month: ['', Validators.required],
      project_name: ['', Validators.required],
      consultant_name: ['', Validators.required],
      consultant_temp_id: ['', Validators.required],
      manager_name: ['', Validators.required],
      business_unit: ['', Validators.required],
      location: ['', Validators.required],
      start_date_of_consultant: ['', Validators.required],

      // Generate day1–day31 with default "P"
      ...Array.from({ length: 31 }, (_, i) => i + 1).reduce((acc: any, day) => {
        acc[`day${day}`] = ['P'];
        return acc;
      }, {}),

      days_worked: [{ value: 0, disabled: true }],
      leaves: [{ value: 0, disabled: true }],
      comp_offs: [{ value: 0, disabled: true }],
      holidays: [{ value: 0, disabled: true }],
      weekends: [{ value: 0, disabled: true }],
      total_pay: [0],
      remarks: [''],

      // SIGNATURE FIELDS
      consultant_signature: ['', Validators.required],
      consultant_sign_date: ['', Validators.required],
      manager_signature: ['', Validators.required],
      manager_sign_date: ['', Validators.required]
    });

    // Recalculate totals whenever a day changes
    this.daysArray.forEach(day => {
      this.sheetForm.get(`day${day}`)?.valueChanges.subscribe(() => this.calculateTotals());
    });

    this.calculateTotals();
  }

  // Convert ionic datetime → MYSQL yyyy-mm-dd or null
  formatDateOrNull(date: any) {
    return date ? new Date(date).toISOString().split('T')[0] : null;
  }

  // Daily calculation logic
  calculateTotals() {
    let worked = 0, leave = 0, compOff = 0, holiday = 0, weekends = 0;

    this.daysArray.forEach(day => {
      const value = this.sheetForm.get(`day${day}`)?.value;
      switch (value) {
        case 'P': worked++; break;
        case 'L': leave++; break;
        case 'C': compOff++; break;
        case 'H': holiday++; break;
        case 'V': weekends++; break;
      }
    });

    this.sheetForm.patchValue({
      days_worked: worked,
      leaves: leave,
      comp_offs: compOff,
      holidays: holiday,
      weekends: weekends
    }, { emitEvent: false });
  }

  close(data?: any) {
    this.modalCtrl.dismiss(data);
  }

  // Submit to API
  submit() {
    this.sheetForm.markAllAsTouched();
    if (this.sheetForm.invalid) return;

    const raw = this.sheetForm.getRawValue();

    const finalData = {
      ...raw,

      // Convert to MySQL format
      start_date_of_consultant: this.formatDateOrNull(raw.start_date_of_consultant),
      consultant_sign_date: this.formatDateOrNull(raw.consultant_sign_date),
      manager_sign_date: this.formatDateOrNull(raw.manager_sign_date),
    };

    console.log("📤 Final POST Body:", finalData);

    this.http.post(this.API_URL, finalData).subscribe({
      next: (response) => {
        console.log("✅ Success:", response);
        this.close(finalData);  // close modal after success
      },
      error: (err) => {
        console.error("❌ Error:", err);
        alert("Error submitting timesheet!");
      }
    });
  }

  openDatePicker() {
    this.dateModal.present();
  }
  openDatePicker1() {
    this.dateModal1.present();
  }
  openDatePicker2() {
    this.dateModal2.present();
  }
  
  dateChanged(event: any) {
    const value = event.detail.value; // raw ISO value
    const date = new Date(value);
  
    // Format: DD-MM-YYYY
    this.formattedDate =
      date.getDate().toString().padStart(2, '0') + '-' +
      (date.getMonth() + 1).toString().padStart(2, '0') + '-' +
      date.getFullYear();
  
    this.dateModal.dismiss();
  }
  dateChanged1(event: any) {
    const value = event.detail.value; // raw ISO value
    const date = new Date(value);
  
    // Format: DD-MM-YYYY
    this.formattedDate1 =
      date.getDate().toString().padStart(2, '0') + '-' +
      (date.getMonth() + 1).toString().padStart(2, '0') + '-' +
      date.getFullYear();
  
    this.dateModal.dismiss();
  }
  dateChanged2(event: any) {
    const value = event.detail.value; // raw ISO value
    const date = new Date(value);
  
    // Format: DD-MM-YYYY
    this.formattedDate2 =
      date.getDate().toString().padStart(2, '0') + '-' +
      (date.getMonth() + 1).toString().padStart(2, '0') + '-' +
      date.getFullYear();
  
    this.dateModal.dismiss();
  }
}
