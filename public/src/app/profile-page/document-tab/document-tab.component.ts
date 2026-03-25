import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-document-tab',
  templateUrl: './document-tab.component.html',
  styleUrls: ['./document-tab.component.scss'],
})
export class DocumentTabComponent  implements OnInit {
 @Input() currentemp: any;

  constructor() { }

  ngOnInit() {}

}
