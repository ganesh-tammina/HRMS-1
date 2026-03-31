import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { WorkFromHomeService } from '../../../core/services/work-from-home.service';

interface AttendanceRequestHistory {
  date: string;
  request: string;
  requestedOn: string;
  note: string;
  reason?: string;
  status: string;
  lastAction: string;
  nextApprover?: string;
}

@Component({
  selector: 'app-attendance-request',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './attendance-request.component.html',
  styleUrls: ['./attendance-request.component.scss'],
})
export class AttendanceRequestComponent implements OnInit {
  attendanceRequestsHistory: { type: string; dateRange: string; records: AttendanceRequestHistory[] }[] = [];

  constructor(
    private wfhService: WorkFromHomeService,
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.initializeStaticSections();
    this.loadWFHRequests();
    this.loadRemoteClockinRequests();
  }

  private initializeStaticSections() {
    this.attendanceRequestsHistory = [
      { type: 'Work From Home / On Duty Requests', dateRange: '', records: [] },
      { type: 'Regularization Requests', dateRange: '', records: [] },
      { type: 'Remote Clock In Requests', dateRange: '', records: [] },
      { type: 'Partial Day Requests', dateRange: '', records: [] },
    ];
  }

  private loadWFHRequests() {
    this.wfhService.getAllWFHRequests().subscribe({
      next: (res: any) => {
        const resData = Array.isArray(res) ? res : (res.data || res.requests || []);
        const wfhRecords = resData.filter((item: any) => item.leave_type === 'WFH').map((item: any) => this.mapWFHRecord(item, 'WFH'));
        const regularizationRecords = resData.filter((item: any) => item.leave_type === 'Remote').map((item: any) => this.mapWFHRecord(item, 'Regularization'));
        this.assignGroup('Work From Home / On Duty Requests', wfhRecords);
        this.assignGroup('Remote Clock In Requests', regularizationRecords);
      },
      error: () => {
        this.assignGroup('Work From Home / On Duty Requests', []);
        this.assignGroup('Remote Clock In Requests', []);
      },
    });
  }

  private loadRemoteClockinRequests() {
    this.http.get<any[]>('/api/remote-clockin/my-requests').subscribe({
      next: (res) => {
        const records = res.map(item => ({
          date: this.formatDate(item.request_date),
          request: 'Remote Clock In',
          requestedOn: this.formatRequestedOn(item.created_at),
          note: item.reason,
          reason: 'Remote',
          status: this.formatStatus(item.status),
          lastAction: item.approved_by ? `Approved by ${item.approved_by}` : '-',
          nextApprover: '-',
        }));
        this.assignGroup('Remote Clock In Requests', records);
      },
      error: () => { this.assignGroup('Remote Clock In Requests', []); }
    });
  }

  private mapWFHRecord(item: any, requestLabel: string): AttendanceRequestHistory {
    return {
      date: this.formatDate(item.applied_at),
      request: requestLabel,
      requestedOn: this.formatRequestedOn(item.created_at),
      note: item.reason,
      reason: item.reason,
      status: this.formatStatus(item.status),
      lastAction: item.updated_by || '-',
      nextApprover: item.next_approver || '-',
    };
  }

  private assignGroup(type: string, records: AttendanceRequestHistory[]) {
    const group = this.attendanceRequestsHistory.find(g => g.type === type);
    if (group) group.records = records;
  }

  private formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  private formatRequestedOn(dateStr: string): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  private formatStatus(status: string): string {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending';
  }
}
