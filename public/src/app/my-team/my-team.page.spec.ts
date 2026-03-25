import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyTeamPage } from './my-team.page';

describe('MyTeamPage', () => {
  let component: MyTeamPage;
  let fixture: ComponentFixture<MyTeamPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MyTeamPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
