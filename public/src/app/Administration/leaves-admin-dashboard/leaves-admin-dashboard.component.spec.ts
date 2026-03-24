import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { LeavesAdminDashboardComponent } from './leaves-admin-dashboard.component';

describe('LeavesAdminDashboardComponent', () => {
  let component: LeavesAdminDashboardComponent;
  let fixture: ComponentFixture<LeavesAdminDashboardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ LeavesAdminDashboardComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(LeavesAdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
