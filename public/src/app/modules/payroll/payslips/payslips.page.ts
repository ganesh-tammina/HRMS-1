import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoadingController } from '@ionic/angular';
import { EmployeeService } from '../../../core/services/employee.service';
import { PayrollService } from '../../../core/services/payroll.service';

@Component({
  selector: 'app-payslips',
  templateUrl: './payslips.page.html',
  styleUrls: ['./payslips.page.scss'],
  standalone: false,
})
export class PayslipsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentTab: string = 'payslips';
  currentEmployee: any;
  loading = true;

  // Salary data
  monthlySalary: number | null = null;
  earnings: any[] = [];
  contributions: any[] = [];
  taxes: any[] = [];
  
  totalEarnings: number = 0;
  totalContributions: number = 0;
  totalTaxes: number = 0;
  totalDeductions: number = 0;
  netSalary: number = 0;
  netSalaryInWords: string = '';

  constructor(
    private employeeService: EmployeeService,
    private payrollService: PayrollService,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.loading = true;
    const loader = await this.loadingController.create({ message: 'Fetching salary details...' });
    await loader.present();

    this.employeeService.getMyProfile().pipe(takeUntil(this.destroy$)).subscribe({
      next: (emp) => {
        this.currentEmployee = emp;
        if (!emp?.id) {
          loader.dismiss();
          this.loading = false;
          return;
        }

        this.payrollService.getPayrollstructures().pipe(takeUntil(this.destroy$)).subscribe({
          next: (res: any) => {
            const allStructures = Array.isArray(res) ? res : (res.data || []);
            const activeStructure = allStructures.find((s: any) => s.employee_id === emp.id && s.is_active);

            if (activeStructure) {
              this.payrollService.getPayrollStructureById(activeStructure.id).pipe(takeUntil(this.destroy$)).subscribe({
                next: (details: any) => {
                  const structure = details.structure || details;
                  const components = details.components || details.salary_components || [];
                  this.calculateSalary(structure, components);
                  loader.dismiss();
                  this.loading = false;
                },
                error: () => { loader.dismiss(); this.loading = false; }
              });
            } else {
              loader.dismiss();
              this.loading = false;
            }
          },
          error: () => { loader.dismiss(); this.loading = false; }
        });
      },
      error: () => { loader.dismiss(); this.loading = false; }
    });
  }

  private calculateSalary(structure: any, components: any[]) {
    const ctc = Number(structure.ctc_amount);
    const calculatedAmts: any = { 'CTC': ctc };
    const sortedComps = [...components].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

    // Passes for formula calculation (Simplified from original for demo)
    sortedComps.forEach(c => {
      if (c.calculation_type === 'FIXED') {
        calculatedAmts[c.code] = Number(c.value) || 0;
      } else if (c.calculation_type === 'PERCENTAGE') {
        const baseField = c.percentage_of_code === 'CTC' ? ctc : (calculatedAmts[c.percentage_of_code] || 0);
        calculatedAmts[c.code] = (baseField * (Number(c.value) || 0)) / 100;
      }
    });

    this.earnings = [];
    this.contributions = [];
    this.taxes = [];
    this.totalEarnings = 0;
    this.totalContributions = 0;
    this.totalTaxes = 0;

    sortedComps.forEach(c => {
      const code = (c.code || '').toUpperCase();
      const isER = code.includes('EMPLOYER') || code.includes('ER');
      if (isER) return;

      const monthlyAmt = Math.round((calculatedAmts[c.code] || 0) / 12);
      const compObj = { name: c.name, amount: monthlyAmt };

      if (c.component_type?.toUpperCase() === 'EARNING') {
        this.earnings.push(compObj);
        this.totalEarnings += monthlyAmt;
      } else if (code.includes('PF') || code.includes('ESI')) {
        this.contributions.push(compObj);
        this.totalContributions += monthlyAmt;
      } else {
        this.taxes.push(compObj);
        this.totalTaxes += monthlyAmt;
      }
    });

    this.totalDeductions = this.totalContributions + this.totalTaxes;
    this.netSalary = this.totalEarnings - this.totalDeductions;
    this.netSalaryInWords = this.numberToWords(this.netSalary);
  }

  numberToWords(num: number): string {
    // Basic implementation for demo
    return num.toLocaleString('en-IN') + ' Rupees only';
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
