import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-timesheet-preview',
    standalone: true,
    imports: [IonicModule, CommonModule],
    template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="log-header-toolbar">
        <ion-title>Work Log Details</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()" class="close-btn">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      
      <div class="summary-banner">
        <div class="banner-content">
          <div class="date-info">
            <ion-icon name="calendar-outline"></ion-icon>
            <span>{{ data.date | date:'fullDate' }}</span>
          </div>
          <div class="stats-row">
            <div class="stat-pill">
              <ion-icon name="time-outline"></ion-icon>
              <span>{{ data.total_hours }} hrs</span>
            </div>
            <div class="stat-pill" [ngClass]="(data.status || 'pending').toLowerCase()">
              <ion-icon name="shield-checkmark-outline"></ion-icon>
              <span>{{ (data.status || 'pending') | titlecase }}</span>
            </div>
          </div>
        </div>
      </div>
    </ion-header>

    <ion-content class="work-log-content">
      <div class="timeline-container">
        <div class="timeline-line"></div>
        
        <div class="log-entry" *ngFor="let b of data.hours_breakdown; let i = index">
          <div class="timeline-marker">
            <div class="dot shadow-pulse"></div>
          </div>
          
          <div class="log-card animate-slide-in" [style.animation-delay]="i * 0.1 + 's'">
            <div class="card-glass-effect"></div>
            <div class="log-card-header">
              <div class="time-slot">
                <ion-icon name="alarm-outline"></ion-icon>
                <span>{{ b.hour }}</span>
              </div>
              <div class="duration-badge">{{ b.hours }}h</div>
            </div>
            
            <div class="log-card-body">
              <p class="task-desc">{{ b.task }}</p>
            </div>
          </div>
        </div>

        <!-- Notes Section if exists -->
        <div class="log-entry" *ngIf="data.notes">
          <div class="timeline-marker">
            <div class="dot note-dot"></div>
          </div>
          <div class="log-card notes-card animate-slide-in" style="animation-delay: 0.5s">
            <div class="log-card-header">
              <div class="time-slot">
                <ion-icon name="reader-outline"></ion-icon>
                <span>Additional Notes</span>
              </div>
            </div>
            <div class="log-card-body">
              <p class="notes-text">"{{ data.notes }}"</p>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="!data.hours_breakdown?.length" class="empty-state">
        <ion-icon name="document-text-outline"></ion-icon>
        <p>No task breakdown available for this log.</p>
      </div>
    </ion-content>
    `,
    styles: [`
      :host {
        --header-bg: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        --primary-accent: #3b82f6;
        --glass-bg: rgba(255, 255, 255, 0.9);
        --text-main: #1e293b;
        --text-muted: #64748b;
      }

      ion-header.ion-no-border {
        &::after { display: none; }
      }

      .log-header-toolbar {
        --background: var(--header-bg);
        --color: white;
        --padding-top: 12px;
        --padding-bottom: 8px;
        
        ion-title {
          font-weight: 700;
          font-size: 1.15rem;
          letter-spacing: -0.025em;
        }
      }

      .close-btn {
        --color: rgba(255, 255, 255, 0.8);
        ion-icon { font-size: 24px; }
      }

      .summary-banner {
        background: var(--header-bg);
        padding: 0 24px 24px 24px;
        color: white;
        position: relative;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -10%;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
          pointer-events: none;
        }

        .banner-content {
          position: relative;
          z-index: 1;
        }

        .date-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          opacity: 0.9;
          font-size: 0.92rem;
          font-weight: 500;
          
          ion-icon { color: var(--primary-accent); font-size: 18px; }
        }

        .stats-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .stat-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: 7px 15px;
          border-radius: 12px;
          font-size: 0.82rem;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

          &.verified, &.approved {
            background: rgba(16, 185, 129, 0.2);
            border-color: rgba(16, 185, 129, 0.2);
            color: #34d399;
          }
          
          &.pending, &.submitted {
            background: rgba(245, 158, 11, 0.2);
            border-color: rgba(245, 158, 11, 0.2);
            color: #fbbf24;
          }
        }
      }

      .work-log-content {
        --background: #f8fafc;
      }

      .timeline-container {
        padding: 24px;
        position: relative;
        max-width: 800px;
        margin: 0 auto;
      }

      .timeline-line {
        position: absolute;
        left: 33px;
        top: 24px;
        bottom: 24px;
        width: 2px;
        background: linear-gradient(to bottom, #3b82f633 0%, #3b82f60a 100%);
      }

      .log-entry {
        display: flex;
        gap: 20px;
        margin-bottom: 24px;
        position: relative;
      }

      .timeline-marker {
        position: relative;
        z-index: 2;
        padding-top: 20px;

        .dot {
          width: 14px;
          height: 14px;
          background: white;
          border: 3px solid var(--primary-accent);
          border-radius: 50%;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08);

          &.note-dot {
            border-color: #64748b;
            box-shadow: 0 0 0 4px rgba(100, 116, 139, 0.08);
          }
        }
      }

      .shadow-pulse {
        animation: pulse 2.5s infinite;
      }

      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
        70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
        100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
      }

      .log-card {
        flex: 1;
        background: white;
        border-radius: 18px;
        padding: 18px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
        border: 1px solid #f1f5f9;
        position: relative;
        overflow: hidden;
        transition: transform 0.25s ease, box-shadow 0.25s ease;

        &:hover {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.08);
        }

        &.notes-card {
          background: #f1f5f9;
          border-style: dashed;
          border-color: #cbd5e1;
        }

        .card-glass-effect {
          position: absolute;
          top: 0;
          right: 0;
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, transparent 60%, rgba(59, 130, 246, 0.04) 60%);
        }
      }

      .log-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .time-slot {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          color: var(--text-main);
          font-size: 0.94rem;

          ion-icon { color: var(--primary-accent); font-size: 16px; }
        }

        .duration-badge {
          background: #eff6ff;
          color: #1d4ed8;
          padding: 5px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0.02em;
        }
      }

      .log-card-body {
        .task-desc {
          margin: 0;
          color: var(--text-muted);
          font-size: 0.92rem;
          line-height: 1.6;
          font-weight: 400;
        }

        .notes-text {
          margin: 0;
          color: var(--text-muted);
          font-size: 0.92rem;
          font-style: italic;
          line-height: 1.6;
        }
      }

      .animate-slide-in {
        opacity: 0;
        transform: translateY(10px);
        animation: slideIn 0.5s forwards ease-out;
      }

      @keyframes slideIn {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .empty-state {
        text-align: center;
        padding: 80px 40px;
        color: #94a3b8;

        ion-icon {
          font-size: 56px;
          margin-bottom: 16px;
          opacity: 0.3;
        }
        
        p { font-size: 0.95rem; font-weight: 500; }
      }
    `]
})
export class TimesheetPreviewComponent {
    @Input() data: any;

    constructor(private modalCtrl: ModalController) { }

    close() {
        this.modalCtrl.dismiss();
    }
}
