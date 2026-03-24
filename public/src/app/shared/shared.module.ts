import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular'; // Required for Ionic components
import { HeaderComponent } from './header/header.component';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [HeaderComponent]
})
export class SharedModule { }
