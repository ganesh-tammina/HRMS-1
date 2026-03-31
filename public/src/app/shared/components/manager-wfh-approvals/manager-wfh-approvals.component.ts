import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController, ModalController } from '@ionic/angular';
import { WorkFromHomeService } from '../../../core/services/work-from-home.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-manager-wfh-approvals',
  standalone: true,
  templateUrl: './manager-wfh-approvals.component.html',
  styleUrls: ['./manager-wfh-approvals.component.scss'],
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ManagerWfhApprovalsComponent implements OnInit {
  pendingWFHRequests: any[] = [];
  filteredRequests: any[] = [];
  isLoading = false;
  searchTerm = '';
  modeFilter = 'all';

  constructor(
    private wfhService: WorkFromHomeService,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    this.loadPendingWFHRequests();
  }

  loadPendingWFHRequests() {
    this.isLoading = true;
    this.wfhService.getPendingWFHRequests().subscribe({
      next: (requests: any[]) => {
        this.pendingWFHRequests = requests.map(req => ({
          ...req,
          work_mode: req.leave_type === 'WFH' ? 'WFH' : 'WFO'
        }));
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.showToast('Failed to load pending WFH requests', 'danger');
        this.isLoading = false;
      }
    });
  }

  applyFilters() {
    this.filteredRequests = this.pendingWFHRequests.filter(request => {
      const matchesSearch = !this.searchTerm ||
        `${request.FirstName} ${request.LastName}`.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        request.EmployeeNumber?.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesMode = this.modeFilter === 'all' || request.work_mode === this.modeFilter;
      return matchesSearch && matchesMode;
    });
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value || '';
    this.applyFilters();
  }

  async approveWFH(request: any) {
    const alert = await this.alertController.create({
      header: 'Approve WFH Request',
      message: `Approve ${request.FirstName} ${request.LastName}'s request?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Approve', handler: () => this.performApprove(request) }
      ]
    });
    await alert.present();
  }

  async rejectWFH(request: any) {
    const alert = await this.alertController.create({
      header: 'Reject WFH Request',
      message: 'Are you sure you want to reject this WFH request?',
      inputs: [{ name: 'remarks', type: 'textarea', placeholder: 'Enter rejection reason' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject',
          handler: (data) => {
            if (!data.remarks) {
              this.showToast('Rejection reason required', 'warning');
              return false;
            }
            this.performReject(request, data.remarks);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  performApprove(request: any) {
    this.isLoading = true;
    this.wfhService.approveWFHRequest(request.id, 'Approved').subscribe({
      next: () => {
        this.showToast('WFH request approved', 'success');
        this.loadPendingWFHRequests();
      },
      error: () => {
        this.showToast('Failed to approve request', 'danger');
        this.isLoading = false;
      }
    });
  }

  performReject(request: any, remarks: string) {
    this.isLoading = true;
    this.wfhService.rejectWFHRequest(request.id, remarks).subscribe({
      next: () => {
        this.showToast('WFH request rejected', 'success');
        this.loadPendingWFHRequests();
      },
      error: () => {
        this.showToast('Failed to reject request', 'danger');
        this.isLoading = false;
      }
    });
  }

  handleRefresh(event: any) {
    this.loadPendingWFHRequests();
    setTimeout(() => event.target.complete(), 1000);
  }

  getStatusColor(status: string): string {
    return { pending: 'pending', approved: 'accept', rejected: 'reject' }[status?.toLowerCase()] || 'medium';
  }

  getProfileImage(request: any): string {
    if (request?.profile_image) {
      return `http://${environment.apiURL}${request.profile_image}?t=${Date.now()}`;
    }
    return '../../assets/Profile_Picture.png';
  }

  async showToast(message: string, color = 'dark') {
    const toast = await this.toastController.create({ message, duration: 3000, position: 'bottom', color });
    await toast.present();
  }

  async goBack() {
    await this.modalCtrl.dismiss();
  }
}
