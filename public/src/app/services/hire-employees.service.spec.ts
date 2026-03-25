import { TestBed } from '@angular/core/testing';

import { HireEmployeesService } from './hire-employees.service';

describe('HireEmployeesService', () => {
  let service: HireEmployeesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HireEmployeesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
