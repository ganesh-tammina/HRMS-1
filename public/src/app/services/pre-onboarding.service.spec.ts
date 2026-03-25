import { TestBed } from '@angular/core/testing';

import { PreOnboardingService } from './pre-onboarding.service';

describe('PreOnboardingService', () => {
  let service: PreOnboardingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PreOnboardingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
