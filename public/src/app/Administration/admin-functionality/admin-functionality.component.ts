import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, ShiftPolicyPayload } from 'src/app/services/admin-functionality/admin.service.service';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';


import { RouteGuardService } from 'src/app/services/route-guard/route-service/route-guard.service';

@Component({
  selector: 'app-admin-functionality',
  standalone: true,
  imports: [FormsModule, CommonModule, IonicModule],
  templateUrl: './admin-functionality.component.html',
  styleUrls: ['./admin-functionality.component.scss']
})

export class adminFunctionalityComponent implements OnInit {
  userRole: string | null = null;
  get isAdminOrHR(): boolean {
    return this.userRole === 'admin' || this.userRole === 'hr';
  }
  weeklyOffPolicies: any[] = [];
  weeklyOffPolicyForm: any = {
    policy_code: '',
    name: '',
    description: '',
    effective_date: '',
    is_active: 1,
    sunday_off: 0,
    monday_off: 0,
    tuesday_off: 0,
    wednesday_off: 0,
    thursday_off: 0,
    friday_off: 0,
    saturday_off: 0,
    is_payable: 0,
    holiday_overlap_rule: '',
    sandwich_rule: 0,
    minimum_work_days: 0
  };
  editingWeeklyOffPolicyId: number | null = null;

  activeTab: string = 'locations';
  locations: any[] = [];
  departments: any[] = [];
  shiftPolicies: any[] = [];
  announcements: any[] = [];
  designations: any[] = [];
  businessUnits: any[] = [];
  businessUnitName: string = '';
  editingBusinessUnitId: number | null = null;


    // Pagination
  deptcurrentPage = 1;
  deptpageSize = 5;
  depttotalPages = 0;
  paginatedDepartments: any[] = [];

  currentLocationPage = 1;
  locationPageSize = 5;
  totalLocationPages = 0;
  paginatedLocations: any[] = [];

  designationCurrentPage = 1;
  designationPageSize = 5;
  designationTotalPages = 0;
  paginatedDesignations: any[] = [];

  showLocationForm = false;
  showDepartmentForm = false;
  showShiftForm = false;
  showAnnouncementForm = false;

  shiftCurrentPage = 1;
  shiftPageSize = 5;
  shiftTotalPages = 0;
  paginatedShiftPolicies: any[] = [];

  weeklyOffCurrentPage = 1;
  weeklyOffPageSize = 5;
  weeklyOffTotalPages = 0;
  paginatedWeeklyOffPolicies: any[] = [];

  announcementCurrentPage = 1;
  announcementPageSize = 5;
  announcementTotalPages = 0;
  paginatedAnnouncements: any[] = [];

  businessUnitCurrentPage = 1;
  businessUnitPageSize = 5;
  businessUnitTotalPages = 0;
  paginatedBusinessUnits: any[] = [];

  locationName = '';
  departmentName = '';

  editingLocationId: number | null = null;
  editingDepartmentId: number | null = null;
  editingShiftId: number | null = null;
  editingAnnouncementId: number | null = null;

  shiftForm: ShiftPolicyPayload = {
    name: '',
    shift_type: 'general',
    start_time: '',
    end_time: '',
    break_duration_minutes: 60,
    timezone: 'Asia/Kolkata',
    description: '',
    is_active: 1
  };

  announcementForm = {
    title: '',
    body: '',
    starts_at: '',
    ends_at: ''
  };

  designationName: string = '';
  editingDesignationId: number | null = null;
  constructor(
    private service: AdminService,
    private router: Router,
    private routeGaurdService: RouteGuardService,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    // Try to get userRole from routeGaurdService, fallback to localStorage
    this.userRole = (this.routeGaurdService.userRole?.toLowerCase() || localStorage.getItem('userRole')?.toLowerCase() || null);
    this.loadLocations();
  }
  adminManagement() {
    this.router.navigate(['./admin']);
  }

  setTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'locations') this.loadLocations();
    if (tab === 'departments') this.loadDepartments();
    if (tab === 'shifts') this.loadShiftPolicies();
    if (tab === 'weeklyOffPolicies') this.loadWeeklyOffPolicies();
    if (tab === 'announcements') this.loadAnnouncements();
    if (tab === 'designations') {
      this.getDesignations();
    }
    if (tab === 'businessUnits') {
      this.getBusinessUnits();
    }
  }
  /* WEEKLY OFF POLICIES */
  loadWeeklyOffPolicies() { 
    this.service.getWeeklyOffPolicies().subscribe(r => {
    this.weeklyOffPolicies = r || [];
    this.weeklyOffCurrentPage = 1;
    this.calculateWeeklyOffPagination();
  });
  }
  saveWeeklyOffPolicy() { this.service.createWeeklyOffPolicy(this.weeklyOffPolicyForm).subscribe(() => { this.showToast('Weekly off policy saved', 'success'); this.loadWeeklyOffPolicies(); this.cancelWeeklyOffPolicy(); }); }
  editWeeklyOffPolicy(item: any) { this.editingWeeklyOffPolicyId = item.id; this.weeklyOffPolicyForm = { ...item }; }
  updateWeeklyOffPolicy() { this.service.updateWeeklyOffPolicy(this.editingWeeklyOffPolicyId!, this.weeklyOffPolicyForm).subscribe(() => { this.showToast('Weekly off policy updated', 'success'); this.loadWeeklyOffPolicies(); this.cancelWeeklyOffPolicy(); }); }
  deleteWeeklyOffPolicy(id: number) { this.service.deleteWeeklyOffPolicy(id).subscribe(() => { this.showToast('Weekly off policy deleted', 'success'); this.loadWeeklyOffPolicies(); }); }
  cancelWeeklyOffPolicy() {
    this.editingWeeklyOffPolicyId = null;
    this.weeklyOffPolicyForm = {
      policy_code: '',
      name: '',
      description: '',
      effective_date: '',
      is_active: 1,
      sunday_off: 0,
      monday_off: 0,
      tuesday_off: 0,
      wednesday_off: 0,
      thursday_off: 0,
      friday_off: 0,
      saturday_off: 0,
      is_payable: 0,
      holiday_overlap_rule: '',
      sandwich_rule: 0,
      minimum_work_days: 0
    };
  }

  /* LOCATIONS */
  loadLocations() { 
    this.service.getLocations().subscribe(r => {
    this.locations = r || [];
    this.currentLocationPage = 1;
    this.calculateLocationPagination();
  }); 
  }
  openAddLocation() { this.showLocationForm = true; this.editingLocationId = null; this.locationName = ''; }
  saveLocation() { this.service.createLocation({ name: this.locationName }).subscribe(() => { this.showToast('Location saved', 'success'); this.loadLocations(); this.locationName = ''; this.cancelLocation(); }); }
  editLocation(i: any) { this.showLocationForm = true; this.locationName = i.name; this.editingLocationId = i.id; }
  updateLocation() { this.service.updateLocation(this.editingLocationId!, { name: this.locationName }).subscribe(() => { this.showToast('Location updated', 'success'); this.loadLocations(); this.locationName = ''; this.cancelLocation(); }); }
  deleteLocation(id: number) { this.service.deleteLocation(id).subscribe(() => { this.showToast('Location deleted', 'success'); this.loadLocations(); }); }
  cancelLocation() { this.locationName = ''; this.editingLocationId = null; }

  /* DEPARTMENTS */
  loadDepartments() { 
    this.service.getDepartments().subscribe(r => {
    this.departments = r || [];
    this.deptcurrentPage = 1;
    this.calculatedeptPagination();
  });
  }
  openAddDepartment() { this.showDepartmentForm = true; this.editingDepartmentId = null; this.departmentName = ''; }
  saveDepartment() { this.service.createDepartment({ name: this.departmentName }).subscribe(() => { this.showToast('Department saved', 'success'); this.loadDepartments(); this.departmentName = ''; this.cancelDepartment(); }); }
  editDepartment(i: any) { this.showDepartmentForm = true; this.departmentName = i.name; this.editingDepartmentId = i.id; }
  updateDepartment() { this.service.updateDepartment(this.editingDepartmentId!, { name: this.departmentName }).subscribe(() => { this.showToast('Department updated', 'success'); this.loadDepartments(); this.departmentName = ''; this.cancelDepartment(); }); }
  deleteDepartment(id: number) { this.service.deleteDepartment(id).subscribe(() => { this.showToast('Department deleted', 'success'); this.loadDepartments(); }); }
  cancelDepartment() { this.departmentName = ''; this.editingDepartmentId = null; }

  /* SHIFTS */
  loadShiftPolicies() { 
    this.service.getShiftPolicies().subscribe(r => {
    this.shiftPolicies = r || [];
    this.shiftCurrentPage = 1;
    this.calculateShiftPagination();
  });
   }
  openAddShift() { this.showShiftForm = true; this.editingShiftId = null; }
  saveShift() {
    console.log('Saving new shift:', this.shiftForm);
    this.service.createShiftPolicy(this.shiftForm).subscribe({
      next: () => {
        this.showToast('Shift saved', 'success');
        this.loadShiftPolicies();
        this.resetShiftForm();
      },
      error: (err) => {
        this.showToast('Failed to save shift', 'danger');
      }
    });
  }
  // Removed duplicate editShift without debug logs
  editShift(item: any) {
    console.log('Editing shift:', item);
    this.editingShiftId = item.id;
    this.shiftForm = { ...item };
    console.log('shiftForm after edit:', this.shiftForm);
  }
  // Removed duplicate updateShift without debug logs
  updateShift() {
    console.log('Updating shift:', this.editingShiftId, this.shiftForm);
    this.service.updateShiftPolicy(this.editingShiftId!, this.shiftForm).subscribe({
      next: () => {
        this.showToast('Shift updated', 'success');
        this.loadShiftPolicies();
        this.resetShiftForm();
      },
      error: (err) => {
        this.showToast('Failed to update shift', 'danger');
      }
    });
  }
  cancelShift() { this.resetShiftForm(); this.editingShiftId = null; }
  resetShiftForm() {
    this.shiftForm = {
      name: '',
      shift_type: 'general',
      start_time: '',
      end_time: '',
      break_duration_minutes: 60,
      timezone: 'Asia/Kolkata',
      description: '',
      is_active: 1
    };
  }

  /* ANNOUNCEMENTS */
  loadAnnouncements() { 
    this.service.getAnnouncements().subscribe(r => {
    this.announcements = r || [];
    this.announcementCurrentPage = 1;
    this.calculateAnnouncementPagination();
  });
   }
  openAddAnnouncement() { this.showAnnouncementForm = true; this.editingAnnouncementId = null; this.announcementForm = { title: '', body: '', starts_at: '', ends_at: '' }; }
  saveAnnouncement() { this.service.createAnnouncement(this.announcementForm).subscribe(() => { this.showToast('Announcement saved', 'success'); this.loadAnnouncements(); this.cancelAnnouncement(); }); }
  editAnnouncement(i: any) { this.showAnnouncementForm = true; this.editingAnnouncementId = i.id; this.announcementForm = { ...i }; }
  updateAnnouncement() { this.service.updateAnnouncement(this.editingAnnouncementId!, this.announcementForm).subscribe(() => { this.showToast('Announcement updated', 'success'); this.loadAnnouncements(); this.cancelAnnouncement(); }); }
  deleteAnnouncement(id: number) { this.service.deleteAnnouncement(id).subscribe(() => { this.showToast('Announcement deleted', 'success'); this.loadAnnouncements(); }); }
  cancelAnnouncement() { this.showAnnouncementForm = false; }

  /* DESIGNATIONS */
  getDesignations() {
    this.service.getDesignations().subscribe(
      (data) => {
        this.designations = data ||[];
        this.designationCurrentPage = 1;
        this.calculateDesignationPagination();
      },
      (error) => {
        console.error('Error fetching designations:', error);
      }
    );
  }

  saveDesignation() {
    const payload = { name: this.designationName };
    this.service.createDesignation(payload).subscribe(
      (response) => {
        this.showToast('Designation created', 'success');
        this.getDesignations();
        this.designationName = '';
      },
      (error) => {
        this.showToast('Failed to create designation', 'danger');
      }
    );
  }

  editDesignation(item: any) {
    this.designationName = item.name;
    this.editingDesignationId = item.id;
  }

  updateDesignation() {
    const payload = { name: this.designationName };
    if (this.editingDesignationId) {
      this.service.updateDesignation(this.editingDesignationId, payload).subscribe(
        (response) => {
          this.showToast('Designation updated', 'success');
          this.getDesignations();
          this.cancelDesignation();
        },
        (error) => {
          this.showToast('Failed to update designation', 'danger');
        }
      );
    }
  }

  deleteDesignation(id: number) {
    this.service.deleteDesignation(id).subscribe(
      (response) => {
        this.showToast('Designation deleted', 'success');
        this.getDesignations();
      },
      (error) => {
        this.showToast('Failed to delete designation', 'danger');
      }
    );
  }

  cancelDesignation() {
    this.designationName = '';
    this.editingDesignationId = null;
  }

  openAddDesignation() {
    this.cancelDesignation();
  }
  /* BUSINESS UNITS */
  loadBusinessUnits() {
    this.service.getBusinessUnits().subscribe(
      (data) => {
        this.businessUnits = data || [];
        this.businessUnitCurrentPage = 1;
        this.calculateBusinessUnitPagination();
      },
      (error) => {
        console.error('Error fetching business units:', error);
      }
    );
  }

  saveBusinessUnit() {
    const payload = { name: this.businessUnitName };
    this.service.createBusinessUnit(payload).subscribe(
      () => {
        this.showToast('Business unit saved', 'success');
        this.loadBusinessUnits();
        this.businessUnitName = '';
        this.cancelBusinessUnit();
      },
      (error) => {
        this.showToast('Failed to save business unit', 'danger');
      }
    );
  }

  editBusinessUnit(item: any) {
    this.businessUnitName = item.name;
    this.editingBusinessUnitId = item.id;
  }

  updateBusinessUnit() {
    const payload = { name: this.businessUnitName };
    if (this.editingBusinessUnitId) {
      this.service.updateBusinessUnit(this.editingBusinessUnitId, payload).subscribe(
        () => {
          this.showToast('Business unit updated', 'success');
          this.loadBusinessUnits();
          this.cancelBusinessUnit();
        },
        (error) => {
          this.showToast('Failed to update business unit', 'danger');
        }
      );
    }
  }

  deleteBusinessUnit(id: number) {
    this.service.deleteBusinessUnit(id).subscribe(
      () => {
        this.showToast('Business unit deleted', 'success');
        this.loadBusinessUnits();
      },
      (error) => {
        this.showToast('Failed to delete business unit', 'danger');
      }
    );
  }

  cancelBusinessUnit() {
    this.businessUnitName = '';
    this.editingBusinessUnitId = null;
  }

  openAddBusinessUnit() {
    this.cancelBusinessUnit();
  }
  getBusinessUnits() {
    this.loadBusinessUnits();
  }

calculatedeptPagination() {
  this.depttotalPages = Math.ceil(this.departments.length / this.deptpageSize);
  this.updatePaginatedDepartments();
}

updatePaginatedDepartments() {
  const startIndex = (this.deptcurrentPage - 1) * this.deptpageSize;
  const endIndex = startIndex + this.deptpageSize;
  this.paginatedDepartments = this.departments.slice(startIndex, endIndex);
}

goToNextdeptPage() {
  if (this.deptcurrentPage < this.depttotalPages) {
    this.deptcurrentPage++;
    this.updatePaginatedDepartments();
  }
}

goToPreviousdeptPage() {
  if (this.deptcurrentPage > 1) {
    this.deptcurrentPage--;
    this.updatePaginatedDepartments();
  }
}

calculateLocationPagination() {
  this.totalLocationPages = Math.ceil(this.locations.length / this.locationPageSize);
  this.updatePaginatedLocations();
}

updatePaginatedLocations() {
  const startIndex = (this.currentLocationPage - 1) * this.locationPageSize;
  const endIndex = startIndex + this.locationPageSize;
  this.paginatedLocations = this.locations.slice(startIndex, endIndex);
}

goToNextLocationPage() {
  if (this.currentLocationPage < this.totalLocationPages) {
    this.currentLocationPage++;
    this.updatePaginatedLocations();
  }
}

goToPreviousLocationPage() {
  if (this.currentLocationPage > 1) {
    this.currentLocationPage--;
    this.updatePaginatedLocations();
  }
}
calculateDesignationPagination() {
  this.designationTotalPages = Math.ceil(
    this.designations.length / this.designationPageSize
  );
  this.updatePaginatedDesignations();
}

updatePaginatedDesignations() {
  const startIndex =
    (this.designationCurrentPage - 1) * this.designationPageSize;
  const endIndex = startIndex + this.designationPageSize;

  this.paginatedDesignations = this.designations.slice(startIndex, endIndex);
}

goToNextDesignationPage() {
  if (this.designationCurrentPage < this.designationTotalPages) {
    this.designationCurrentPage++;
    this.updatePaginatedDesignations();
  }
}

goToPreviousDesignationPage() {
  if (this.designationCurrentPage > 1) {
    this.designationCurrentPage--;
    this.updatePaginatedDesignations();
  }
}
calculateShiftPagination() {
  this.shiftTotalPages = Math.ceil(
    this.shiftPolicies.length / this.shiftPageSize
  );
  this.updatePaginatedShiftPolicies();
}

updatePaginatedShiftPolicies() {
  const startIndex = (this.shiftCurrentPage - 1) * this.shiftPageSize;
  const endIndex = startIndex + this.shiftPageSize;
  this.paginatedShiftPolicies = this.shiftPolicies.slice(startIndex, endIndex);
}

goToNextShiftPage() {
  if (this.shiftCurrentPage < this.shiftTotalPages) {
    this.shiftCurrentPage++;
    this.updatePaginatedShiftPolicies();
  }
}

goToPreviousShiftPage() {
  if (this.shiftCurrentPage > 1) {
    this.shiftCurrentPage--;
    this.updatePaginatedShiftPolicies();
  }
}
calculateWeeklyOffPagination() {
  this.weeklyOffTotalPages = Math.ceil(
    this.weeklyOffPolicies.length / this.weeklyOffPageSize
  );
  this.updatePaginatedWeeklyOffPolicies();
}

updatePaginatedWeeklyOffPolicies() {
  const startIndex =
    (this.weeklyOffCurrentPage - 1) * this.weeklyOffPageSize;
  const endIndex = startIndex + this.weeklyOffPageSize;

  this.paginatedWeeklyOffPolicies =
    this.weeklyOffPolicies.slice(startIndex, endIndex);
}

goToNextWeeklyOffPage() {
  if (this.weeklyOffCurrentPage < this.weeklyOffTotalPages) {
    this.weeklyOffCurrentPage++;
    this.updatePaginatedWeeklyOffPolicies();
  }
}

goToPreviousWeeklyOffPage() {
  if (this.weeklyOffCurrentPage > 1) {
    this.weeklyOffCurrentPage--;
    this.updatePaginatedWeeklyOffPolicies();
  }
}
calculateAnnouncementPagination() {
  this.announcementTotalPages = Math.ceil(
    this.announcements.length / this.announcementPageSize
  );
  this.updatePaginatedAnnouncements();
}

updatePaginatedAnnouncements() {
  const startIndex =
    (this.announcementCurrentPage - 1) * this.announcementPageSize;
  const endIndex = startIndex + this.announcementPageSize;

  this.paginatedAnnouncements =
    this.announcements.slice(startIndex, endIndex);
}

goToNextAnnouncementPage() {
  if (this.announcementCurrentPage < this.announcementTotalPages) {
    this.announcementCurrentPage++;
    this.updatePaginatedAnnouncements();
  }
}

goToPreviousAnnouncementPage() {
  if (this.announcementCurrentPage > 1) {
    this.announcementCurrentPage--;
    this.updatePaginatedAnnouncements();
  }
}
calculateBusinessUnitPagination() {
  this.businessUnitTotalPages = Math.ceil(
    this.businessUnits.length / this.businessUnitPageSize
  );
  this.updatePaginatedBusinessUnits();
}

updatePaginatedBusinessUnits() {
  const startIndex =
    (this.businessUnitCurrentPage - 1) * this.businessUnitPageSize;
  const endIndex = startIndex + this.businessUnitPageSize;

  this.paginatedBusinessUnits =
    this.businessUnits.slice(startIndex, endIndex);
}

goToNextBusinessUnitPage() {
  if (this.businessUnitCurrentPage < this.businessUnitTotalPages) {
    this.businessUnitCurrentPage++;
    this.updatePaginatedBusinessUnits();
  }
}

goToPreviousBusinessUnitPage() {
  if (this.businessUnitCurrentPage > 1) {
    this.businessUnitCurrentPage--;
    this.updatePaginatedBusinessUnits();
  }
}

  async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
