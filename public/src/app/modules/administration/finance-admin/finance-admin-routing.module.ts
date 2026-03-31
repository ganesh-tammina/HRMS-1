import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FinanceAdminPage } from './finance-admin.page';

const routes: Routes = [
  {
    path: '',
    component: FinanceAdminPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FinanceAdminPageRoutingModule {}
