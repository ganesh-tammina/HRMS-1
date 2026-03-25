import { TestBed } from '@angular/core/testing';

import { PayrollServiceService } from './payroll-service.service';

describe('PayrollServiceService', () => {
  let service: PayrollServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PayrollServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
