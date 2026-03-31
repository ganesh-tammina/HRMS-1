import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ProfilePage } from './profile.page';
import { RouterModule, Routes } from '@angular/router';

// Standalone Tab Components
import { AboutTabComponent } from './tabs/about/about.component';
import { ProfileTabComponent } from './tabs/profile/profile.component';
import { JobTabComponent } from './tabs/job/job.component';
import { DocumentTabComponent } from './tabs/document/document.component';
import { AssetsTabComponent } from './tabs/assets/assets.component';

const routes: Routes = [
  {
    path: '',
    component: ProfilePage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    // Standard standalone component imports
    AboutTabComponent,
    ProfileTabComponent,
    JobTabComponent,
    DocumentTabComponent,
    AssetsTabComponent
  ],
  declarations: [ProfilePage]
})
export class ProfilePageModule { }
