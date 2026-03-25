import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { PayrollService } from '../payroll-service.service';

@Component({
  selector: 'app-payroll-setup',
  templateUrl: './payroll-setup.component.html',
  styleUrls: ['./payroll-setup.component.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class PayrollSetupComponent implements OnInit {

  constructor(private router: Router, private payrollService: PayrollService) { }

  ngOnInit() { }

  payrollCompoents() {
    this.router.navigate(['/payroll-components']);
  }

  payrollTemplates() {
    this.router.navigate(['/payroll-templates']);
  }
  setDefaults() {
    this.payrollService.setDefaultPayroll().subscribe({
      next: (res) => {
        console.log(res);
        alert('Default Payroll Setup Created');
      },
      error: (err) => {
        console.log(err);
        alert('Error while creating default setup');
      }
    });
  }
  clearSetup() {
    this.payrollService.clearPayrollSetup().subscribe({
      next: (res) => {
        console.log(res);
        alert('Default Payroll Setup Cleared');
      },
      error: (err) => {
        console.log(err);
        alert('Error while clearing default setup');
      }
    });
  }
  payrollStructure() {
    this.router.navigate(['/payroll-structure']);
  }

}
