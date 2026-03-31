import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AdminService } from 'src/app/core/services/admin.service';

@Component({
  selector: 'app-roles',
  templateUrl: './roles.page.html',
  styleUrls: ['./roles.page.scss'],
  standalone: false,
})
export class RolesPage implements OnInit {
  users: any[] = [];
  filteredUsers: any[] = [];
  loading = false;
  
  showCreateUser = false;
  searchText = '';
  selectedRole = 'all';

  newUser = {
    email: '',
    password: '',
    role: 'employee',
  };

  constructor(
    private adminService: AdminService,
    private toastCtrl: ToastController,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.adminService.getUsers().subscribe({
      next: (res: any) => {
        this.users = Array.isArray(res?.users) ? res.users : [];
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showToast('Failed to load users', 'danger');
      }
    });
  }

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

  changeRole(event: any, userId: number) {
    const role = event.detail.value;
    let action;

    switch (role) {
      case 'admin': action = this.adminService.makeAdmin(userId); break;
      case 'manager': action = this.adminService.makeManager(userId); break;
      case 'hr': action = this.adminService.makeHR(userId); break;
      case 'employee': action = this.adminService.makeEmployee(userId); break;
    }

    if (action) {
      action.subscribe({
        next: () => {
          this.showToast(`User role updated to ${role}`, 'success');
          this.loadUsers();
        },
        error: () => this.showToast('Failed to update role', 'danger')
      });
    }
  }

  createUser() {
    if (!this.newUser.email || !this.newUser.password) {
      this.showToast('Email and Password are required', 'warning');
      return;
    }

    this.adminService.createUser(this.newUser).subscribe({
      next: () => {
        this.showToast('User created successfully', 'success');
        this.resetCreateUserForm();
        this.showCreateUser = false;
        this.loadUsers();
      },
      error: () => this.showToast('Failed to create user', 'danger')
    });
  }

  resetCreateUserForm() {
    this.newUser = { email: '', password: '', role: 'employee' };
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary' = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top',
    });
    toast.present();
  }
}
