import { TestBed } from '@angular/core/testing';

import { AdminSetupService } from './admin-setup.service';

describe('AdminSetupService', () => {
  let service: AdminSetupService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminSetupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
