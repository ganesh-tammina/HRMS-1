import { TestBed } from '@angular/core/testing';

import { OrganisationStructureFlowService } from './organisation-structure-flow.service';

describe('OrganisationStructureFlowService', () => {
  let service: OrganisationStructureFlowService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OrganisationStructureFlowService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
