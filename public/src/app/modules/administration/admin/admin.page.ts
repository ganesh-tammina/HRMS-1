import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: false,
})
export class AdminPage implements OnInit {

  constructor(private router: Router) {}

  ngOnInit() {}

  emp() {
    this.router.navigate(['/administration/employees']);
  }
  dep() {
    this.router.navigate(['/administration/org-setup']);
  }
  adminleaves() {
    this.router.navigate(['/administration/leaves-admin']);
  }
  adminsetup() {
    this.router.navigate(['/administration/roles']);
  }
  projectsetup() {
    this.router.navigate(['/administration/projects']);
  }
}
