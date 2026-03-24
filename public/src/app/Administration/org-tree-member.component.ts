
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Component, Input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { OrganisationStructureFlowService } from '../services/organisation-structure-flow.service';

@Component({
  selector: 'app-org-tree-member',
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="org-tree-node member" [ngClass]="{'selected': isExpanded()}" style="cursor:pointer;transition:box-shadow .2s;">
      <div class="org-avatar-large">
        <img *ngIf="member.profile_image" [src]="member.profile_image.startsWith('/') ? 'http://localhost:3000' + member.profile_image : member.profile_image" alt="Profile">
        <ion-icon *ngIf="!member.profile_image" name="person-circle-outline"></ion-icon>
      </div>
      <div class="org-label">
        <h3>{{ member.FullName }}</h3>
        <p>{{ member.designation_name }}sss</p>
        <button *ngIf="member.hasTeam || subTeam.length > 0" type="button" class="expand-btn" (click)="toggleExpand(); $event.stopPropagation();" [attr.aria-expanded]="isExpanded()" [attr.aria-label]="isExpanded() ? 'Collapse team' : 'Expand team'">
          <ion-icon [name]="isExpanded() ? 'chevron-down' : 'chevron-forward'"></ion-icon>
        </button>
      </div>
    </div>
    <div *ngIf="isExpanded()" class="org-team-grid org-team-nested">
      <div *ngIf="isLoading" class="org-tree-node loading">
        <ion-spinner name="dots"></ion-spinner>
        <span>Loading...</span>
      </div>
      <ng-container *ngFor="let sub of subTeam">
        <app-org-tree-member [member]="sub" [token]="token" [orgService]="orgService"></app-org-tree-member>
      </ng-container>
      <div *ngIf="!isLoading && subTeam.length === 0" class="org-tree-node empty">
        <span>No team members</span>
      </div>
    </div>
  `,
  styles: [`
      .org-label {
        display: flex;
        align-items: center;
        gap: 0.5em;
        position: relative;
      }
      .expand-btn {
        background: none;
        border: none;
        outline: none;
        cursor: pointer;
        padding: 0.2em 0.4em;
        margin-left: 0.5em;
        display: flex;
        align-items: center;
        font-size: 1.3em;
        color: #2563eb;
        transition: color 0.2s;
        z-index: 2;
      }
      .expand-btn:hover {
        color: #1d4ed8;
      }
    `]
})
export class OrgTreeMemberComponent {

  @Input() member: any;
  @Input() token: string = '';
  @Input() orgService!: OrganisationStructureFlowService;

  expanded = false;
  isLoading = false;
  subTeam: any[] = [];

  toggleExpand() {
    this.expanded = !this.expanded;
    if (this.expanded && this.subTeam.length === 0 && !this.isLoading) {
      this.isLoading = true;
      this.orgService.getDirectReports(this.member.id, this.token).subscribe({
        next: (data: any) => {
          if (data && data.team && Array.isArray(data.team)) {
            this.subTeam = data.team;
          } else if (Array.isArray(data)) {
            this.subTeam = data;
          } else {
            this.subTeam = [];
          }
          this.isLoading = false;
        },
        error: () => {
          this.subTeam = [];
          this.isLoading = false;
        }
      });
    }
  }
  isExpanded() {
    return this.expanded;
  }
}