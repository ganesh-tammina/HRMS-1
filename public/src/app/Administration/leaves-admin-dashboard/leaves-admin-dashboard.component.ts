import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { LeavePlanService } from 'src/app/services/leave-plans.service';
import { LeaveTypeService } from 'src/app/services/leavetype.service';
import { EmployeeLeaveAllocationComponent } from './employee-leave-allocation/employee-leave-allocation.component';
import { LeavesAllocationComponent } from './leaves-allocation/leaves-allocation.component';

@Component({
  selector: 'app-leaves-admin-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './leaves-admin-dashboard.component.html',
  styleUrls: ['./leaves-admin-dashboard.component.scss'],
})
export class LeavesAdminDashboardComponent {

  /* 🔒 STATIC COUNTS */
  totalLeaveTypes: number = 0;
  totalLeavePlans: number = 0;
  totalEmployees = 0;
  loadingPlans: any;
  leavePlans: any
  listLoading: any;
  leaveTypes: any;

  constructor(private router: Router, private leavePlanService: LeavePlanService, private leaveTypesService: LeaveTypeService, private modalCtrl: ModalController,) { }

  ngOnInit() {
    this.loadLeavePlans();
    this.loadLeaveTypes();
  }

  ionViewWillEnter(): void {
    this.loadLeavePlans();
    this.loadLeaveTypes();
  }

  goTo(path: string) {
    console.log(path);
    this.router.navigate([path]);
  }
  loadLeavePlans(): void {
    this.loadingPlans = true;

    this.leavePlanService.getLeavePlans().subscribe({
      next: (res) => {
        this.leavePlans = res;
        this.totalLeavePlans = res.length
        this.loadingPlans = false;
        console.log('Leave Plans:', res);
      },
      error: () => (this.loadingPlans = false),
    });
  }
  loadLeaveTypes(): void {
    this.listLoading = true;

    this.leaveTypesService.getLeaveTypes().subscribe({
      next: (res) => {
        this.leaveTypes = res || [];
        this.totalLeaveTypes = res.length
        this.listLoading = false;
      },
      error: () => {
        this.listLoading = false;
      },
    });
  }

  async leavesallocation() {
    // this.router.navigate(['/leaves_allocation']);
        const modal = await this.modalCtrl.create({
      component: LeavesAllocationComponent,
      cssClass: 'side-custom-popup checkinInfo-popup',
      backdropDismiss: false,
    });
    await modal.present();
  }
  // employeeallocation() {
  //   this.router.navigate(['/employee_lEAVE_allocation']);
  // }
  adminManagement() {
    this.router.navigate(['./admin']);
  }
  async employeeallocation() {
    const modal = await this.modalCtrl.create({
      component: EmployeeLeaveAllocationComponent,
      cssClass: 'side-custom-popup checkinInfo-popup',
      backdropDismiss: false,
    });
    await modal.present();
  }
}
