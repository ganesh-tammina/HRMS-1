import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { LeavesAdminPage } from './leaves-admin.page';
import { ReactiveFormsModule } from '@angular/forms';
import { LeaveAllocationModal } from './modals/leave-allocation-modal.component';
import { LeaveInitializeModal } from './modals/leave-initialize-modal.component';

const routes: Routes = [
  {
    path: '',
    component: LeavesAdminPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [
    LeavesAdminPage,
    LeaveAllocationModal,
    LeaveInitializeModal
  ]
})
export class LeavesAdminPageModule {}
