import { TestBed } from '@angular/core/testing';

import { EmployeeLeavesService } from './employee-leaves.service';

describe('EmployeeLeavesService', () => {
  let service: EmployeeLeavesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EmployeeLeavesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
