import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MyTeamPage } from './my-team.page';
import { RouterModule, Routes } from '@angular/router';
import { TeamReportComponent } from './team-report/team-report.component';

const routes: Routes = [
  {
    path: '',
    component: MyTeamPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [MyTeamPage, TeamReportComponent]
})
export class MyTeamPageModule {}
