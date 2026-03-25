import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { IncometaxComponent } from './incometax.component';

describe('IncometaxComponent', () => {
  let component: IncometaxComponent;
  let fixture: ComponentFixture<IncometaxComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [IncometaxComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IncometaxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
