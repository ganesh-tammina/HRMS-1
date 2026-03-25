import { Component, Input, OnInit } from '@angular/core';
import { IonicModule, PopoverController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-employee-select-popover',
  standalone: true,
  imports: [IonicModule, CommonModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Select Employee</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>

      <ion-searchbar
        placeholder="Search employee by name or ID"
        (ionInput)="onSearch($event)">
      </ion-searchbar>

      <ion-list>
        <ion-item
          button
          *ngFor="let emp of filteredEmployees"
          (click)="selectEmployee(emp)">
          {{ emp.FirstName }} ({{ emp.EmployeeNumber }})
        </ion-item>
      </ion-list>

    </ion-content>
  `,
})
export class EmployeeSelectPopoverComponent implements OnInit {

  @Input() employees: any[] = [];
  filteredEmployees: any[] = [];

  constructor(private popoverCtrl: PopoverController) {}

  ngOnInit() {
    this.filteredEmployees = this.employees;
  }

  onSearch(event: any) {
    const value = (event.target?.value ?? '').toLowerCase();

    this.filteredEmployees = this.employees.filter(emp =>
      emp.FirstName?.toLowerCase().includes(value) ||
      emp.EmployeeNumber?.toLowerCase().includes(value)
    );
  }

  selectEmployee(emp: any) {
    this.popoverCtrl.dismiss(emp);
  }
}

