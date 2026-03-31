import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { CandidateService } from '../../../core/services/candidate.service';
import { CreateCandidateModalComponent } from '../create-candidate-modal/create-candidate-modal.component';

@Component({
  selector: 'app-onboarding-dashboard',
  templateUrl: './onboarding-dashboard.component.html',
  styleUrls: ['./onboarding-dashboard.component.scss'],
  standalone: false
})
export class OnboardingDashboardComponent implements OnInit {
  stats = {
    total_candidates: 0,
    offer_accepted: 0,
    documents_pending: 0,
    bgv_pending: 0,
    ready_to_join: 0
  };
  isLoading = true;

  constructor(
    private candidateService: CandidateService,
    private router: Router,
    private modalController: ModalController
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  async openCreateCandidateModal() {
    const modal = await this.modalController.create({
      component: CreateCandidateModalComponent,
      cssClass: 'side-custom-popup checkinInfo-popup'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.loadStats();
      }
    });

    return await modal.present();
  }

  loadStats(): void {
    this.isLoading = true;
    this.candidateService.getAllCandidates().subscribe({
      next: (candidates: any[]) => {
        if (Array.isArray(candidates)) {
          this.stats.total_candidates = candidates.length;
          this.stats.offer_accepted = candidates.filter(c => c.status === 'offer_accepted').length;
          this.stats.documents_pending = candidates.filter(c => c.status === 'documents_pending').length;
          this.stats.bgv_pending = candidates.filter(c => c.status === 'bgv_pending').length;
          this.stats.ready_to_join = candidates.filter(c => c.status === 'ready_to_join').length;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading candidates for stats:', err);
        this.isLoading = false;
      }
    });
  }

  navigateToPreonboarding(status: string): void {
    this.router.navigate(['/onboarding/preonboarding'], { queryParams: { status: status } });
  }
}
