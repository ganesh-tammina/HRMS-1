import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { singleGuardGuard } from './single-guard.guard';

describe('singleGuardGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => singleGuardGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
