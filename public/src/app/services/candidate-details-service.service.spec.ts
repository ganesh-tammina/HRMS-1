import { TestBed } from '@angular/core/testing';

import { CandidateDetailsServiceService } from './candidate-details-service.service';

describe('CandidateDetailsServiceService', () => {
  let service: CandidateDetailsServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CandidateDetailsServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
