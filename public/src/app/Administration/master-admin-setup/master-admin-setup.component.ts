import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { AdminSetup } from 'src/app/services/admin-setup.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-master-admin-setup',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './master-admin-setup.component.html',
  styleUrls: ['./master-admin-setup.component.scss'],
})
export class MasterAdminSetupComponent implements OnInit {

  users: any[] = [];
  filteredUsers: any[] = [];
  loading = false;

  /** UI STATES */
  showCreateUser = false;
  searchText = '';
  selectedRole = 'all';

  /** CREATE USER MODEL */
  newUser = {
    email: '',
    password: '',
    role: 'employee',
  };
  userId: any;
  constructor(
    private adminSetupService: AdminSetup,
    private toastCtrl: ToastController,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  ionViewWillEnter(): void {
    this.ngOnInit();
  }

  /** ================= USERS ================= */

  loadUsers(): void {
    this.loading = true;

    this.adminSetupService.getUsers().subscribe({
      next: (res: any) => {
        this.users = Array.isArray(res?.users) ? res.users : [];
        this.filteredUsers = [...this.users];
        this.loading = false;
      },
      error: () => {
        this.users = [];
        this.filteredUsers = [];
        this.loading = false;
      }
    });
  }

  /** ================= FILTER ================= */

  applyFilter() {
    this.filteredUsers = this.users.filter(user => {
      const matchesText =
        (user.full_name || '').toLowerCase().includes(this.searchText.toLowerCase()) ||
        (user.username || '').toLowerCase().includes(this.searchText.toLowerCase()) ||
        (user.EmployeeNumber || '').toString().includes(this.searchText);

      const matchesRole =
        this.selectedRole === 'all' || user.role === this.selectedRole;

      return matchesText && matchesRole;
    });
  }

  /** ================= ROLE ACTIONS ================= */

  changeRole(event: any, userId: number) {
    const role = event.detail.value;

    switch (role) {
      case 'admin':
        this.makeAdmin(userId);
        break;
      case 'manager':
        this.makeManager(userId);
        break;
      case 'hr':
        this.makeHR(userId);
        break;
      case 'employee':
        this.makeEmployee(userId);
        break;
    }
  }

  makeEmployee(userId: number): void {
    this.adminSetupService.makeEmployee(userId).subscribe({
      next: () => {
        this.presentToast('User demoted to Employee');
        this.loadUsers();
      },
      error: () => this.presentToast('Failed to demote to Employee'),
    });
  }


  makeHR(userId: number): void {
    this.adminSetupService.makeHR(userId).subscribe({
      next: () => {
        this.presentToast('User promoted to HR');
        this.loadUsers();
      },
      error: () => this.presentToast('Failed to promote to HR'),
    });
  }

  makeManager(userId: number): void {
    this.adminSetupService.makeManager(userId).subscribe({
      next: () => {
        this.presentToast('User promoted to Manager');
        this.loadUsers();
      },
      error: () => this.presentToast('Failed to promote to Manager'),
    });
  }

  makeAdmin(userId: number): void {
    this.adminSetupService.makeAdmin(userId).subscribe({
      next: () => {
        this.presentToast('User promoted to Admin');
        this.loadUsers();
      },
      error: () => this.presentToast('Failed to promote to Admin'),
    });
  }

  /** ================= CREATE USER ================= */

  toggleCreateUser() {
    this.showCreateUser = !this.showCreateUser;
  }

  createUser() {
    if (!this.newUser.email || !this.newUser.password) {
      this.presentToast('Email and Password are required');
      return;
    }

    this.adminSetupService.createUser(this.newUser).subscribe({
      next: () => {
        this.presentToast('User created successfully');
        this.resetCreateUserForm();
        this.showCreateUser = false;
        this.loadUsers();
      },
      error: () => this.presentToast('Failed to create user'),
    });
  }

  resetCreateUserForm() {
    this.newUser = {
      email: '',
      password: '',
      role: 'employee',
    };
  }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'top',
    });
    toast.present();
  }
  adminManagement() {
    this.router.navigate(['./admin']);
  }
}
