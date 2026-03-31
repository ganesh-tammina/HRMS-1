import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { LeavesPage } from './leaves.page';
import { RouterModule, Routes } from '@angular/router';
import { LeaveRequestComponent } from '../../../shared/components/leave-request/leave-request.component';

const routes: Routes = [
  {
    path: '',
    component: LeavesPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    LeaveRequestComponent,
  ],
  declarations: [LeavesPage]
})
export class LeavesPageModule {}
