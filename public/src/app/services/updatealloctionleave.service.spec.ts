import { TestBed } from '@angular/core/testing';

import { UpdatealloctionleaveService } from './updatealloctionleave.service';

describe('UpdatealloctionleaveService', () => {
  let service: UpdatealloctionleaveService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UpdatealloctionleaveService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
