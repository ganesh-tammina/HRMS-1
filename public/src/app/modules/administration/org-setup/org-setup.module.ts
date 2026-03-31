import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { OrgSetupPage } from './org-setup.page';

const routes: Routes = [
  {
    path: '',
    component: OrgSetupPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [OrgSetupPage]
})
export class OrgSetupPageModule {}
