import { TestBed } from '@angular/core/testing';

import { LeaveInitializeService } from './leave-initialize.service';

describe('LeaveInitializeService', () => {
  let service: LeaveInitializeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LeaveInitializeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
