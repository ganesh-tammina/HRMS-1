import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PreOnboardingCardsComponent } from './pre-onboarding-cards.component';

describe('PreOnboardingCardsComponent', () => {
  let component: PreOnboardingCardsComponent;
  let fixture: ComponentFixture<PreOnboardingCardsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PreOnboardingCardsComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(PreOnboardingCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
