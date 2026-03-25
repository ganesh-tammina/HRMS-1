import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { OrgTreeComponent } from '../org-tree.component';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, OrgTreeComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AdminComponent implements OnInit {
  constructor(
    private router: Router
  ) { }

  /* ================= INIT ================= */
  ngOnInit() {

  }


  emp() {
    this.router.navigate(['/employee-list']);
  }
  dep() {
    this.router.navigate(['/admin-department']);
  }
  adminleaves() {
    this.router.navigate(['/admin-leaves']);
  }
  adminsetup() {
    this.router.navigate(['/admin-setup']);
  }
  projectsetup() {
    this.router.navigate(['/CreateProject']);
  }
}
