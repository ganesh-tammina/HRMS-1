import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ClientTimesheetPopoverComponent } from './client-timesheet-popover.component';

describe('ClientTimesheetPopoverComponent', () => {
  let component: ClientTimesheetPopoverComponent;
  let fixture: ComponentFixture<ClientTimesheetPopoverComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ClientTimesheetPopoverComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ClientTimesheetPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
