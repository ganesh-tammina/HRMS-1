import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { HomePage } from './home.page';
import { ClockButtonComponent } from '../../../shared/components/clock-button/clock-button.component';

const routes: Routes = [
  {
    path: '',
    component: HomePage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    ClockButtonComponent  // Standalone component — imported here
  ],
  declarations: [HomePage]
})
export class HomePageModule { }
