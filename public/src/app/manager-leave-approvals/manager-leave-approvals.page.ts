import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, ModalController } from '@ionic/angular';
import { ToastController } from '@ionic/angular/standalone';
import { LeaverequestService } from '../services/leaverequest.service';
import { LeaveTypeService } from '../services/leavetype.service';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'app-manager-leave-approvals',
    templateUrl: './manager-leave-approvals.page.html',
    styleUrls: ['./manager-leave-approvals.page.scss'],
    standalone: true,
    imports: [
        CommonModule, FormsModule, IonicModule
    ]
})
export class ManagerLeaveApprovalsPage implements OnInit {
    pendingLeaves: any[] = [];
    filteredLeaves: any[] = [];
    leaveTypes: any[] = [];
    isLoading = false;
    searchTerm = '';
    leaveTypeFilter = 'all';
    rejectionReasons: { [id: number]: string } = {};

    constructor(
        private leaveRequestService: LeaverequestService,
        private leaveTypeService: LeaveTypeService,
        private toastController: ToastController,
        private router: Router,
        private modalCtrl: ModalController
    ) { }

    ngOnInit() {
        this.loadLeaveTypes();
        this.loadPendingLeaves();
    }

    ionViewWillEnter() {
        this.ngOnInit();
    }

    loadLeaveTypes() {
        this.leaveTypeService.getLeaveTypes().subscribe({
            next: (types) => {
                this.leaveTypes = types.sort((a, b) => a.type_name.localeCompare(b.type_name)); // Sort leave types alphabetically by name
            },
            error: (error) => {
                console.error('Error loading leave types:', error);
                this.showToast('Failed to load leave types', 'danger');
            }
        });
    }

    loadPendingLeaves() {
        this.isLoading = true;
        this.leaveRequestService.getPendingLeaveRequests().subscribe({
            next: (leaves) => {
                this.pendingLeaves = leaves;
                this.applyFilters();
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Error loading pending leaves:', error);
                this.showToast('Failed to load pending leaves', 'danger');
                this.isLoading = false;
            }
        });
    }

    applyFilters() {
        this.filteredLeaves = this.pendingLeaves.filter(leave => {
            const matchesSearch = !this.searchTerm ||
                `${leave.FirstName} ${leave.LastName}`.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                leave.EmployeeNumber?.toLowerCase().includes(this.searchTerm.toLowerCase());

            const matchesType = this.leaveTypeFilter === 'all' ||
                leave.type_code === this.leaveTypeFilter;

            return matchesSearch && matchesType;
        });
    }

    onSearchChange(event: any) {
        this.searchTerm = event.detail.value || '';
        this.applyFilters();
    }

    onTypeFilterChange(event: any) {
        this.leaveTypeFilter = event.detail.value;
        this.applyFilters();
    }

    approveLeave(leave: any) {
        this.performApprove(leave);
    }

    rejectLeave(leave: any) {
        const reason = (this.rejectionReasons[leave.id] || '').trim();
        if (!reason) {
            this.showToast('Please enter a rejection reason before rejecting.', 'warning');
            return;
        }
        this.performReject(leave, reason);
        this.rejectionReasons[leave.id] = '';
    }

    performApprove(leave: any) {
        this.isLoading = true;
        this.leaveRequestService.approveLeave(leave.id, 'Approved').subscribe({
            next: () => {
                this.showToast('Leave approved successfully', 'success');
                this.loadPendingLeaves();
            },
            error: (error) => {
                console.error('Error approving leave:', error);
                this.showToast(error.error?.error || 'Failed to approve leave', 'danger');
                this.isLoading = false;
            }
        });
    }

    performReject(leave: any, reason: string) {
        this.isLoading = true;
        this.leaveRequestService.rejectLeave(leave.id, reason).subscribe({
            next: () => {
                this.showToast('Leave rejected successfully', 'success');
                this.loadPendingLeaves();
            },
            error: (error) => {
                console.error('Error rejecting leave:', error);
                this.showToast(error.error?.error || 'Failed to reject leave', 'danger');
                this.isLoading = false;
            }
        });
    }

    async showToast(message: string, color: string = 'dark') {
        const toast = await this.toastController.create({
            message,
            duration: 3000,
            position: 'bottom',
            color
        });
        await toast.present();
    }

    handleRefresh(event: any) {
        this.loadPendingLeaves();
        setTimeout(() => {
            event.target.complete();
        }, 1000);
    }

    getStatusColor(status: string): string {
        const statusColors: any = {
            'pending': 'pending',
            'approved': 'accept',
            'rejected': 'reject'
        };
        return statusColors[status?.toLowerCase()] || 'medium';
    }

    getProfileImage(leave: any): string {
        if (leave?.profile_image) {
            return `http://${environment.apiURL}${leave.profile_image}?t=${Date.now()}`;
        }
        return 'assets/user.svg';
    }
    async goBack() {
        await this.modalCtrl.dismiss();
        // No alert, just close the modal
    }
}
