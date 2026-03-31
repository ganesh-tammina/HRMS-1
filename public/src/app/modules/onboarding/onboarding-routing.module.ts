import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OnboardingDashboardComponent } from './onboarding-dashboard/onboarding-dashboard.component';
import { PreonboardingListComponent } from './preonboarding-list/preonboarding-list.component';
import { PreonboardingDetailComponent } from './preonboarding-detail/preonboarding-detail.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';

const routes: Routes = [
  {
    path: '',
    component: OnboardingDashboardComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { role: ['admin', 'hr'] }
  },
  {
    path: 'preonboarding',
    component: PreonboardingListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { role: ['admin', 'hr'] }
  },
  {
    path: 'preonboarding/:candidateId',
    component: PreonboardingDetailComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { role: ['admin', 'hr'] }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OnboardingRoutingModule { }
