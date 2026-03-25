import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ReportingTEamComponent } from '../reporting-team/reporting-team.component';
import { QuillModule } from 'ngx-quill';

@Component({
  selector: 'app-aboutus',
  templateUrl: './aboutus.component.html',
  styleUrls: ['./aboutus.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    ReportingTEamComponent,
    QuillModule
  ]
})
export class AboutusComponent implements OnChanges {

  /* ✅ Input from parent (Profile Page) */
  @Input() currentEmployee: any | null = null;

  /* UI States */
  IsSummary = false;
  IsOrg = false;
  viewEditor = false;

  /* Quill Editor Toolbar */
  modules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ['link', 'image'],
      ['clean']
    ]
  };

  constructor() {}

  /* ✅ Called whenever Input changes (TAB switch / API response) */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentEmployee']?.currentValue) {
      console.log(
        '✅ AboutusComponent received employee:',
        this.currentEmployee
      );
    }
  }

  /* Toggle summary edit */
  isEditSummary(): void {
    this.IsSummary = !this.IsSummary;
    this.viewEditor = this.IsSummary;
  }

  /* Toggle organization edit */
  isEditOrg(): void {
    this.IsOrg = !this.IsOrg;
  }
}
