import { OrgTreeComponent } from './Administration/org-tree.component';
import { Routes } from '@angular/router';
import { AdminComponent } from './Administration/admin/admin.component';
import { OrganisationInfoComponent } from './Administration/organisation-info/organisation-info.component';
import { LeavesComponent } from './Attendance/me/leaves/leaves.component';
import { MePage } from './Attendance/me/me.page';
import { CandidateOfferLetterComponent } from './candidate-offer-letter/candidate-offer-letter.component';
import { CandidateStatusComponent } from './candidate-status/candidate-status.component';
import { HomePage } from './home/home.page';
import { LoginPage } from './login/login.page';
import { MyTeamPage } from './my-team/my-team.page';
import { ManagerTimesheetApprovalsPage } from './manager-timesheet-approvals/manager-timesheet-approvals.page';
import { ManagerLeaveApprovalsPage } from './manager-leave-approvals/manager-leave-approvals.page';
import { ManagerWfhApprovalsPage } from './manager-wfh-approvals/manager-wfh-approvals.page';
import { CandiateCreateComponent } from './onboarding/candiate-create/candiate-create.component';
import { CompensationComponent } from './onboarding/compensation/compensation.component';
import { CreateOfferComponent } from './onboarding/create-offer/create-offer.component';
import { NewJoinerComponent } from './onboarding/new-joiner/new-joiner.component';
import { OfferDetailsComponent } from './onboarding/offer-details/offer-details.component';
import { OnboardingTasksComponent } from './onboarding/onboarding-tasks/onboarding-tasks.component';
import { PastOffersComponent } from './onboarding/past-offers/past-offers.component';
import { PreOnboardingCardsComponent } from './onboarding/pre-onboarding-cards/pre-onboarding-cards.component';
import { PostPage } from './onboarding/pre.page';
import { PreonboardingComponent } from './onboarding/preonboarding/preonboarding.component';
import { PreviewSendComponent } from './onboarding/preview-send/preview-send.component';
import { SetupComponent } from './onboarding/setup/setup.component';
import { StartOnboardingComponent } from './onboarding/start-onboarding/start-onboarding.component';
import { TaskTemplatesComponent } from './onboarding/task-templates/task-templates.component';
import { OnboardingPage } from './post-onboarding/post-onboarding.page';
import { ProfilePageComponent } from './profile-page/profile-page.component';
import { salaryStaructureComponent } from './salary-staructure/salary-staructure.component';
import { AuthGuard } from './services/route-guard/auth/single-guard.guard';
import { roleHandlerGuard } from './services/route-guard/role-handler.ts/role-handler.guard';
import { adminFunctionalityComponent } from './Administration/admin-functionality/admin-functionality.component';
import { LeaveRequestsComponent } from './leave-requests/leave-requests.component';
import { LeavesAdminDashboardComponent } from './Administration/leaves-admin-dashboard/leaves-admin-dashboard.component';
import { LeavetypesComponent } from './Administration/leaves-admin-dashboard/leavetypes/leavetypes.component';
import { LeaveplansComponent } from './Administration/leaves-admin-dashboard/leaveplans/leaveplans.component';
import { LeavesAllocationComponent } from './Administration/leaves-admin-dashboard/leaves-allocation/leaves-allocation.component';
import { EmployeeLeaveAllocationComponent } from './Administration/leaves-admin-dashboard/employee-leave-allocation/employee-leave-allocation.component';
import { MasterAdminSetupComponent } from './Administration/master-admin-setup/master-admin-setup.component';
import { PreonboardSubItemsComponent } from './onboarding/preonboard-sub-items/preonboard-sub-items.component';
import { CreateProjectComponent } from './Administration/organisation-info/create-project/create-project.component';
import { ProjectAssignComponent } from './Administration/organisation-info/project-assign/project-assign.component';
import { RouteGuardService } from './services/route-guard/route-service/route-guard.service';
import { ClientWorkTrackComponent } from './Today_@_Work/client-work-track/client-work-track.component';
import { PayslipsComponent } from './My_Finance/payslips/payslips.component';
import { WorkTrackComponent } from './Today_@_Work/work-track/work-track.component';
import { h } from 'ionicons/dist/types/stencil-public-runtime';
import { EmployeeListComponent } from './Administration/admin/employee-list/employee-list.component';
import { FinanceAdminComponent } from './My_Finance/finance-admin/finance-admin.component';
import { PayrollSetupComponent } from './My_Finance/payroll-setup/payroll-setup.component';
import { PayrollTemplatesComponent } from './My_Finance/payroll-setup/payroll-templates/payroll-templates.component';
import { PayrollCompoentsComponent } from './My_Finance/payroll-setup/payroll-compoents/payroll-compoents.component';
import { TemplateCompositionComponent } from './My_Finance/template-composition/template-composition.component';
import { PayrollStructureComponent } from './My_Finance/payroll-structure/payroll-structure.component';
import { StructureCompoentsComponent } from './My_Finance/payroll-structure/structure-compoents/structure-compoents.component';
import { TeamReportsPage } from './team-reports/team-reports.page';
export const routes: Routes = [
  {
    path: 'org-tree',
    component: OrgTreeComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['employee', 'manager', 'hr'] }
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'Home',
    component: HomePage,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['employee', 'manager', 'hr'] },
  },
  {
    path: 'Me',
    component: MePage,
    canActivate: [AuthGuard],
  },
  {
    path: 'MyTeam',
    component: MyTeamPage,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['manager', 'hr', 'employee'] },
  },
  {
    path: 'ManagerTimesheetApprovals',
    component: ManagerTimesheetApprovalsPage,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['manager', 'admin', 'hr'] },
  },
  {
    path: 'ManagerLeaveApprovals',
    component: ManagerLeaveApprovalsPage,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['manager', 'admin', 'hr'] },
  },
  {
    path: 'ManagerWfhApprovals',
    component: ManagerWfhApprovalsPage,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['manager', 'admin', 'hr'] },
  },
  { path: 'login', component: LoginPage },
  {
    path: 'settings',
    component: PostPage,
    canActivate: [AuthGuard],
  },
  {
    path: 'preOnboarding',
    component: PreonboardingComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'NewJoiner',
    component: NewJoinerComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'pastOffers',
    component: PastOffersComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'onboarding_Tasks',
    component: OnboardingTasksComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'CandiateCreate',
    component: CandiateCreateComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'Startonboardingitem',
    component: StartOnboardingComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'CreateOffer/:id',
    component: CreateOfferComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'leaves',
    component: LeavesComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'pre-onboarding-cards',
    component: PreOnboardingCardsComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'pre_onboarding',
    component: PostPage,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'post-onboarding',
    component: OnboardingPage,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'Task_Template',
    component: TaskTemplatesComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'setup',
    component: SetupComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'Compensation/:id/:',
    component: CompensationComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'salaryStaructure/:id/:FirstName',
    component: salaryStaructureComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'OfferDetailsComponent/:id/:FirstName',
    component: OfferDetailsComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'preview_send/:id/:FirstName',
    component: PreviewSendComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'candidate_status/:id',
    component: CandidateStatusComponent
  },
  {
    path: 'candidate-offer-letter/:id',
    component: CandidateOfferLetterComponent
  },
  {
    path: 'profile-page',
    component: ProfilePageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'workTrack',
    component: WorkTrackComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['employee', 'manager', 'hr'] },
  },
  {
    path: 'ClientWorkTrack',
    component: ClientWorkTrackComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['employee', 'manager', 'hr'] },
  },

  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'employee-list',
    component: EmployeeListComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'organisation_info',
    component: OrganisationInfoComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['hr', 'admin'] },
  },
  {
    path: 'admin-department',
    component: adminFunctionalityComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'MyPay',
    component: PayslipsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'finance-admin',
    component: FinanceAdminComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'approve-reject-leave',
    component: LeaveRequestsComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr', 'manager'] },
  },
  {
    path: 'admin-leaves',
    component: LeavesAdminDashboardComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'leave-types',
    component: LeavetypesComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'leave-plans',
    component: LeaveplansComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'leaves_allocation',
    component: LeavesAllocationComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'employee_lEAVE_allocation',
    component: EmployeeLeaveAllocationComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'admin-setup',
    component: MasterAdminSetupComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'preonboarding-setup',
    component: PreonboardSubItemsComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'CreateProject',
    component: CreateProjectComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'createProject_shifts',
    component: ProjectAssignComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] },
  },
  {
    path: 'project-details/:id',
    loadComponent: () =>
      import('./Administration/organisation-info/project-details/project-details.component')
        .then(m => m.ProjectDetailsComponent),
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] }
  },
  {
    path: 'masterpayroll',
    component: PayrollSetupComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] }
  },
  {
    path: 'payroll-components',
    component: PayrollCompoentsComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] }
  },
  {
    path: 'payroll-templates',
    component: PayrollTemplatesComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] }
  },
  {
    path: 'template-composition/:id',
    component: TemplateCompositionComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] }
  },
  {
    path: 'payroll-structure',
    component: PayrollStructureComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] }
  },
  {
    path: 'structure-composition/:id',
    component: StructureCompoentsComponent,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['admin', 'hr'] }
  },
  {
    path: 'TeamReports',
    component: TeamReportsPage,
    canActivate: [AuthGuard, roleHandlerGuard],
    data: { role: ['manager', 'hr', 'admin'] }
  },

];