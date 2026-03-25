import { TestBed } from '@angular/core/testing';

import { FinanceServiceService } from './finance-service.service';

describe('FinanceServiceService', () => {
  let service: FinanceServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FinanceServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
