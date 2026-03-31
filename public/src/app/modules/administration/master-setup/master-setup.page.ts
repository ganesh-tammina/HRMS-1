import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-master-setup',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="home-toolbar">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/admin"></ion-back-button>
        </ion-buttons>
        <ion-title>Master Setup</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="header-accent-bg"></div>
      
      <div class="content-wrapper">
        <ion-list lines="none" class="setup-list">
          <ion-item class="setup-item" routerLink="/admin/master-setup/departments">
            <ion-icon name="business-outline" slot="start" color="primary"></ion-icon>
            <ion-label>
              <h2>Departments</h2>
              <p>Manage organizational hierarchy</p>
            </ion-label>
            <ion-icon name="chevron-forward" slot="end" color="medium"></ion-icon>
          </ion-item>
          
          <ion-item class="setup-item" routerLink="/admin/master-setup/designations">
            <ion-icon name="id-card-outline" slot="start" color="success"></ion-icon>
            <ion-label>
              <h2>Designations</h2>
              <p>Define job roles and titles</p>
            </ion-label>
            <ion-icon name="chevron-forward" slot="end" color="medium"></ion-icon>
          </ion-item>

          <ion-item class="setup-item" routerLink="/admin/master-setup/policies">
            <ion-icon name="shield-checkmark-outline" slot="start" color="warning"></ion-icon>
            <ion-label>
              <h2>Leave Policies</h2>
              <p>Configure entitlements & rules</p>
            </ion-label>
            <ion-icon name="chevron-forward" slot="end" color="medium"></ion-icon>
          </ion-item>

          <ion-item class="setup-item" routerLink="/admin/master-setup/shifts">
            <ion-icon name="time-outline" slot="start" color="tertiary"></ion-icon>
            <ion-label>
              <h2>Shift Policies</h2>
              <p>Work hours and break times</p>
            </ion-label>
            <ion-icon name="chevron-forward" slot="end" color="medium"></ion-icon>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
  `,
  styles: [`
    .setup-list { background: transparent; padding: 10px; }
    .setup-item { 
      --background: #fff; 
      margin-bottom: 12px; 
      border-radius: 16px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.02);
      border: 1px solid #f1f5f9;
      --padding-start: 15px;
      --min-height: 72px;
    }
    h2 { font-size: 16px; font-weight: 700; color: #122E44; margin: 0 0 4px 0; }
    p { font-size: 13px; color: var(--ion-color-medium); margin: 0; }
    .header-accent-bg {
      position: absolute; top: 0; left: 0; width: 100%; height: 120px;
      background: linear-gradient(135deg, #122E44 0%, #1F74BB 100%);
      border-radius: 0 0 30px 30px;
      z-index: 0;
    }
    .content-wrapper { position: relative; z-index: 1; }
  `],
  standalone: false,
})
export class MasterSetupPage implements OnInit {
  constructor() {}
  ngOnInit() {}
}
