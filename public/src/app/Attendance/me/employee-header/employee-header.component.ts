import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-employee-header',
  templateUrl: './employee-header.component.html',
  styleUrls: ['./employee-header.component.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class EmployeeHeaderComponent implements OnInit {
  selectedTab = 'leaves';
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
  navigate(tab: string) {
    this.selectedTab = tab;
    this.router.navigate(['/' + tab])
  }
}
