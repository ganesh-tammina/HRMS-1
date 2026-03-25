import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { EmployeeLeaveAllocationComponent } from './employee-leave-allocation.component';

describe('EmployeeLeaveAllocationComponent', () => {
  let component: EmployeeLeaveAllocationComponent;
  let fixture: ComponentFixture<EmployeeLeaveAllocationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ EmployeeLeaveAllocationComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeLeaveAllocationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
