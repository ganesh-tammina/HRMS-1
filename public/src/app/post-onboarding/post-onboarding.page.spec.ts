import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostOnboardingPage } from './post-onboarding.page';

describe('PostOnboardingPage', () => {
  let component: PostOnboardingPage;
  let fixture: ComponentFixture<PostOnboardingPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PostOnboardingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
