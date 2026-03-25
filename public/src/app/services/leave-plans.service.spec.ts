import { TestBed } from '@angular/core/testing';

import { LeavePlansService } from './leave-plans.service';

describe('LeavePlansService', () => {
  let service: LeavePlansService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LeavePlansService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
