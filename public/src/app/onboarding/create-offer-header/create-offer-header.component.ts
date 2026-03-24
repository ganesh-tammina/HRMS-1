import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { filter } from 'rxjs/operators';
import { EmailService } from 'src/app/services/email.service';
import { CandidateService } from 'src/app/services/pre-onboarding.service';

@Component({
  selector: 'app-create-offer-header',
  templateUrl: './create-offer-header.component.html',
  styleUrls: ['./create-offer-header.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule,]
})
export class CreateOfferHeaderComponent implements OnInit {
  candidate: any = {};
  @Output() continueClick = new EventEmitter<void>();
  @Output() createOfferClick = new EventEmitter<void>();

  activeTab = '';
  isPreviewSend = false;
  candidateId: string | null = null;
  firstName: string | null = null;


  // preview_send = false
  currentRoute: string = '';
  currentUrl: any;    //get current page
  showCreateoffer: boolean= false;

  private readonly stepsOrder: string[] = [
    'CreateOffer',
    'salaryStaructure',
    'OfferDetailsComponent',
    'preview_send'
  ];

  /* === NEW: completed steps for template/scss === */
  completedSteps: string[] = [];

  constructor(private router: Router, 
    private email: EmailService, 
    private candidateService: CandidateService, 
    private route: ActivatedRoute) {
    // track active tab by URL
    this.router.events
      .pipe(filter((event: any) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const segments = event.urlAfterRedirects.split('/');
        this.activeTab = segments[1];
        this.isPreviewSend = this.activeTab === 'preview_send'
        //        if (event instanceof NavigationEnd) {
        //   this.currentRoute = event.url;
        // }

        const idx = this.stepsOrder.indexOf(this.activeTab);
        this.completedSteps = idx > 0 ? this.stepsOrder.slice(0, idx) : [];

        if (this.isPreviewSend && this.showCreateoffer && !this.completedSteps.includes('preview_send')) {
          this.completedSteps = [...this.completedSteps, 'preview_send'];
        }

      });
  }

  /*************  ✨ Windsurf Command ⭐  *************/
  /**
   * ngOnInit
   *
   * Gets candidate id and first name from parent route.
   * These values are used to construct the URL for navigating to different tabs.
   */
  /*******  ac28750e-21cd-4044-a6aa-d4fa9ca84802  *******/
  ngOnInit() {
    if( this.currentUrl=='/preview_send/'+this.candidateId+"/"+this.firstName){
      this.showCreateoffer=true;
    }
    this.currentUrl = this.router.url;
    console.log('url', this.currentUrl);
    const nav = this.router.getCurrentNavigation();
    this.candidate = nav?.extras.state?.['candidate'] || {};

    // get id & firstName from parent route
    this.candidateId = this.route.snapshot.paramMap.get('id');
    this.firstName = this.route.snapshot.paramMap.get('FirstName');

    const initialSegments = this.currentUrl?.split('/') || [];
    const initialActive = initialSegments[1] || '';
    const initialIdx = this.stepsOrder.indexOf(initialActive);
    if (initialIdx >= 0) {
      this.activeTab = initialActive;
      this.isPreviewSend = initialActive === 'preview_send';
      this.completedSteps = initialIdx > 0 ? this.stepsOrder.slice(0, initialIdx) : [];
      this.showCreateoffer = this.isPreviewSend || this.currentUrl.includes('/preview_send/');
      if (this.isPreviewSend && this.showCreateoffer && !this.completedSteps.includes('preview_send')) {
        this.completedSteps = [...this.completedSteps, 'preview_send'];
      }
    }
  }

  onContinue() {
    this.continueClick.emit();
    if( this.currentUrl=='/preview_send/'+this.candidateId+"/"+this.firstName){
      this.showCreateoffer=true;
    }
  }
  onCreateOffer() {
    this.createOfferClick.emit(); // You can handle final API call or navigation here
  }

  navigate(tab: string) {
    if (this.candidateId && this.firstName) {
      this.router.navigate(['/', tab, this.candidateId, this.firstName]);
      if( this.currentUrl=='/preview_send/'+this.candidateId+"/"+this.firstName){
        this.showCreateoffer=true;
      }
    } else {
      console.error('Missing route params: id or firstName');
    }
  }
  onCreateOfferemail() {
    this.email.sendEmail(this.candidate).subscribe({
      next: (res: any) => {
        console.log(res, 'Email sent response');
        if (res.success) {
          alert('✅ Email sent successfully!');
        } else {
          alert('❌ Email failed to send.');
        }
      },
      error: (err) => {
        console.error(err);
        alert('❌ Something went wrong while sending email.');
      }
    });
  }
}
