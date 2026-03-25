import { TestBed } from '@angular/core/testing';

import { WorkFromHomeService } from './work-from-home.service';

describe('WorkFromHomeService', () => {
  let service: WorkFromHomeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkFromHomeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
