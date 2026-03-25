import { TestBed } from '@angular/core/testing';

import { LeaverequestService } from './leaverequest.service';

describe('LeaverequestService', () => {
  let service: LeaverequestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LeaverequestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
