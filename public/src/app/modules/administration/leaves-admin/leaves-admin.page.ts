import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { AdminService } from '../../../core/services/admin.service';
import { LeaveTypeService } from '../../../core/services/leavetype.service';
import { LeaveAllocationModal } from './modals/leave-allocation-modal.component';
import { LeaveInitializeModal } from './modals/leave-initialize-modal.component';

@Component({
  selector: 'app-leaves-admin',
  templateUrl: './leaves-admin.page.html',
  styleUrls: ['./leaves-admin.page.scss'],
  standalone: false
})
export class LeavesAdminPage implements OnInit {
  totalLeaveTypes: number = 0;
  totalLeavePlans: number = 0;
  loading: boolean = false;

  constructor(
    private router: Router,
    private adminService: AdminService,
    private leaveTypesService: LeaveTypeService,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    this.loadStats();
  }

  ionViewWillEnter() {
    this.loadStats();
  }

  loadStats() {
    this.loading = true;
    this.adminService.getLeavePlans().subscribe({
      next: (plans: any[]) => {
        this.totalLeavePlans = plans?.length || 0;
      }
    });

    this.leaveTypesService.getLeaveTypes().subscribe({
      next: (types: any[]) => {
        this.totalLeaveTypes = types?.length || 0;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  async openAllocationModal() {
    const modal = await this.modalCtrl.create({
      component: LeaveAllocationModal
    });
    return await modal.present();
  }

  async openInitializeModal() {
    const modal = await this.modalCtrl.create({
      component: LeaveInitializeModal
    });
    return await modal.present();
  }

  async showToast(message: string) {
    // Simple placeholder for toast or alert
    console.log(message);
  }
}
