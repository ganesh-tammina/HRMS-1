import { TestBed } from '@angular/core/testing';

import { WorkTrackService } from './work-track.service';

describe('WorkTrackService', () => {
  let service: WorkTrackService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkTrackService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
