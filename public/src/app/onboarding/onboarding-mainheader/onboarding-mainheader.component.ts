import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-onboarding-mainheader',
  templateUrl: './onboarding-mainheader.component.html',
  styleUrls: ['./onboarding-mainheader.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class OnboardingMainheaderComponent implements OnInit {
  isActive: boolean = false;
  isTasksTemplate: boolean = false;
  activeTab = '';
  constructor(private router: Router, private route: ActivatedRoute) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects.split('/').pop();
        this.activeTab = url; // match last part of the URL
      });
  }

  ngOnInit() { }
  // gotemplates() {
  //   this.router.navigate(['/Task_Template']);
  // }
  //   goSettings() {
  //  this.router.navigate(['/settings']);
  //   }   
  //   goSetup() {
  //     this.isActive = true; // Apply the active class
  //     this.router.navigate(['/setup'], { queryParams: { active: true } });
  //   }
  //   gopreboarding() {
  //     this.router.navigate(['/preOnboarding']);
  //   }
  //   goNewJoiners() {
  //     this.router.navigate(['/NewJoiner']);
  //   }
  //   goPastOffers() {
  //     this.router.navigate(['/pastOffers']);
  //   }
  /*************  ✨ Windsurf Command ⭐  *************/
  /**
   * Navigates to the Onboarding Tasks page.
   *
   * @return {void} Does not return anything.
   */
  /*******  17eada39-84de-4129-a24b-141491f890d7  *******/
  // goOnboardingTasks() {
  //   this.isActive = !this.isActive;
  //   this.router.navigate(['/onboarding_Tasks']);
  // }

  navigate(tab: string) {
    this.activeTab = tab;
    this.router.navigate(['/' + tab]); // navigates to /settings or /profile
  }

}
