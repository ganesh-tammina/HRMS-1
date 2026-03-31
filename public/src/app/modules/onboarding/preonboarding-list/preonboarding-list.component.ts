import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CandidateService } from '../../../core/services/candidate.service';
import { ToasterService } from '../../../core/services/toaster.service';

@Component({
    selector: 'app-preonboarding-list',
    templateUrl: './preonboarding-list.component.html',
    styleUrls: ['./preonboarding-list.component.scss'],
    standalone: false
})
export class PreonboardingListComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    candidates: any[] = [];
    filteredCandidates: any[] = [];
    isLoading = true;
    searchTerm = '';
    selectedStatus = 'all';

    statusOptions = [
        { label: 'All Candidates', value: 'all' },
        { label: 'Offer Accepted', value: 'offer_accepted' },
        { label: 'Documents Pending', value: 'documents_pending' },
        { label: 'BGV Pending', value: 'bgv_pending' },
        { label: 'Ready to Join', value: 'ready_to_join' }
    ];

    constructor(
        private candidateService: CandidateService,
        private router: Router,
        private toasterService: ToasterService
    ) { }

    ngOnInit(): void {
        this.loadCandidates();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadCandidates(): void {
        this.isLoading = true;
        this.candidateService.getAllCandidates()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    // Extract candidates array from response
                    if (Array.isArray(response)) {
                        this.candidates = response;
                    } else if (response && response.candidates) {
                        this.candidates = response.candidates;
                    } else if (response && response.data) {
                        this.candidates = response.data;
                    } else {
                        this.candidates = [];
                    }
                    this.filterCandidates();
                    this.isLoading = false;
                },
                error: (err: any) => {
                    console.error('Error loading candidates:', err);
                    this.toasterService.showError('Failed to load candidates');
                    this.isLoading = false;
                }
            });
    }

    onRefresh(event: any): void {
        this.candidateService.getAllCandidates()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    if (Array.isArray(response)) {
                        this.candidates = response;
                    } else if (response && response.candidates) {
                        this.candidates = response.candidates;
                    } else if (response && response.data) {
                        this.candidates = response.data;
                    }
                    this.filterCandidates();
                    event.target.complete();
                },
                error: (err: any) => {
                    console.error('Error refreshing candidates:', err);
                    event.target.complete();
                }
            });
    }

    onSearchChange(event: any): void {
        this.searchTerm = event.detail.value.toLowerCase();
        this.filterCandidates();
    }

    onStatusChange(event: any): void {
        this.selectedStatus = event.detail.value;
        this.filterCandidates();
    }

    filterCandidates(): void {
        this.filteredCandidates = this.candidates.filter(candidate => {
            const matchesSearch = !this.searchTerm ||
                candidate.full_name?.toLowerCase().includes(this.searchTerm) ||
                candidate.email?.toLowerCase().includes(this.searchTerm);

            const matchesStatus = this.selectedStatus === 'all' ||
                candidate.status === this.selectedStatus;

            return matchesSearch && matchesStatus;
        });
    }

    getStatusColor(status: string): string {
        const statusColors: { [key: string]: string } = {
            'offer_accepted': 'primary',
            'documents_pending': 'danger',
            'bgv_pending': 'warning',
            'ready_to_join': 'success',
            'hired': 'success',
            'on_hold': 'medium'
        };
        return statusColors[status] || 'medium';
    }

    getStatusLabel(status: string): string {
        const statusMap: { [key: string]: string } = {
            'offer_accepted': 'Offer Accepted',
            'documents_pending': 'Docs Pending',
            'bgv_pending': 'BGV Pending',
            'ready_to_join': 'Ready to Join',
            'hired': 'Hired',
            'on_hold': 'On Hold'
        };
        return statusMap[status] || status.replace('_', ' ');
    }

    onCandidateClick(candidate: any): void {
        this.router.navigate(['/onboarding/preonboarding', candidate.id]);
    }

    compareSelect(a: any, b: any): boolean {
        return a === b;
    }
}
