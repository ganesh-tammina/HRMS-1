import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { LeaverequestService } from '../services/leaverequest.service';
import { WorkFromHomeService } from '../services/work-from-home.service';

@Component({
  selector: 'app-leave-requests',
  templateUrl: './leave-requests.component.html',
  styleUrls: ['./leave-requests.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
})
export class LeaveRequestsComponent implements OnInit, OnDestroy {

  leaveRequests: any[] = [];
  pendingWFHRequests: any[] = [];

  actionForm!: FormGroup;
  selectedRequest: any = null;

  loadingWFH = false;
  private sub!: Subscription;

  constructor(
    private fb: FormBuilder,
    private leaveState: LeaverequestService,
    private leaveService: LeaverequestService,
    private wfhService: WorkFromHomeService,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.actionForm = this.fb.group({
      status: ['', Validators.required],
      manager_comment: ['']
    });

    this.reloadFromApi();
    this.loadPendingLeaveRequests();
    this.loadPendingWFHRequests();
  }

  reloadFromApi() {
    this.leaveService.getMyLeaves(new Date().getFullYear())
      .subscribe(res => {
        this.leaveRequests = res;
      });
  }

  loadPendingWFHRequests() {
    this.loadingWFH = true;

    this.wfhService.getPendingWFHRequests().subscribe({
      next: (res) => {
        this.pendingWFHRequests = res;
        this.loadingWFH = false;
      },
      error: () => {
        this.loadingWFH = false;
      }
    });
  }
  loadPendingLeaveRequests() {
    this.leaveService.getPendingLeaveRequests().subscribe({
      next: (res) => {
        this.leaveRequests = res;
      },
      error: () => {
        this.showToast('Failed to load pending leave requests', 'danger');
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  openActionForm(req: any) {
    this.selectedRequest = req;
    this.actionForm.reset();
  }

  closeForm() {
    this.selectedRequest = null;
    this.actionForm.reset();
  }

  submitDecision() {
    if (!this.selectedRequest) return;

    const status = this.actionForm.value.status;
    const comment = this.actionForm.value.manager_comment || '';
    const leaveId = this.selectedRequest.id;

    // Reject requires comment
    if (status === 'REJECTED' && !comment.trim()) {
      this.actionForm.get('manager_comment')?.setErrors({ required: true });
      this.actionForm.markAllAsTouched();
      return;
    }

    if (status === 'APPROVED') {
      this.leaveService.approveLeave(leaveId, comment).subscribe({
        next: () => {
          this.showToast('Leave approved', 'success');
          this.updateStateLocally('APPROVED');
        },
        error: () => this.showToast('Failed to approve leave', 'danger')
      });
    }

    if (status === 'REJECTED') {
      this.leaveService.rejectLeave(leaveId, comment).subscribe({
        next: () => {
          this.showToast('Leave rejected', 'success');
          this.updateStateLocally('REJECTED');
        },
        error: () => this.showToast('Failed to reject leave', 'danger')
      });
    }
  }

  private updateStateLocally(newStatus: 'APPROVED' | 'REJECTED') {
    this.leaveRequests = this.leaveRequests.map(req =>
      req.id === this.selectedRequest.id
        ? { ...req, status: newStatus }
        : req
    );

    this.leaveService.setLeaveRequests(this.leaveRequests);

    this.selectedRequest = null;
    this.actionForm.reset();
  }

  /* ================= WFH ACTIONS ================= */

  approveWFH(wfh: any) {
    this.wfhService.approveWFHRequest(wfh.id, 'Approved by manager')
      .subscribe({
        next: () => {
          this.showToast('WFH Approved', 'success');
          this.pendingWFHRequests =
            this.pendingWFHRequests.filter(r => r.id !== wfh.id);
        },
        error: () => this.showToast('Failed to approve WFH', 'danger')
      });
  }

  rejectWFH(wfh: any) {
    const comment = 'Rejected by manager'; // Simplified for now as we are replacing prompt
    this.wfhService.rejectWFHRequest(wfh.id, comment)
      .subscribe({
        next: () => {
          this.showToast('WFH Rejected', 'success');
          this.pendingWFHRequests =
            this.pendingWFHRequests.filter(r => r.id !== wfh.id);
        },
        error: () => this.showToast('Failed to reject WFH', 'danger')
      });
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary' = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
