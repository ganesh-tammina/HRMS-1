import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { roleHandlerGuard } from './role-handler.guard';

describe('roleHandlerGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => roleHandlerGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
