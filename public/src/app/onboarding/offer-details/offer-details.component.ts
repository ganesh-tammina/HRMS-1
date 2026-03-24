import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { CreateOfferHeaderComponent } from '../create-offer-header/create-offer-header.component';
import { HeaderComponent } from 'src/app/shared/header/header.component';
import { QuillModule } from 'ngx-quill';
import { CandidateService } from 'src/app/services/pre-onboarding.service';

@Component({
  selector: 'app-offer-letter',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonicModule,
    QuillModule,
    CreateOfferHeaderComponent,
    HeaderComponent
  ],
  templateUrl: './offer-details.component.html',
  styleUrls: ['./offer-details.component.scss']
})
export class OfferDetailsComponent implements OnInit {

  @Input() candidate: any = {};

  selectedOption: string = 'template'; // default
  selectedTemplate: string = 'SVS';    // default
  uploadedFileName: string | null = null;
  viewEditor: boolean = false;

  // Reactive Forms control for Quill editor
  editorControl: FormControl = new FormControl('');

  modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ]
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private candidateService: CandidateService
  ) { }

  ngOnInit() {
    // Get candidate from router state if available
    const nav = this.router.getCurrentNavigation();
    this.candidate = nav?.extras?.state?.['candidate'] || {};
    console.log('candidate', this.candidate);

    // Fallback: check query params if candidate info might be passed
    this.route.queryParams.subscribe(params => {
      if (!this.candidate && params['candidate']) {
        try {
          this.candidate = JSON.parse(params['candidate']);
        } catch (e) {
          console.warn('Failed to parse candidate from query params', e);
        }
      }
    });

    this.updatePreview();
  }

  updatePreview() {
    let text = '';
    if (this.selectedTemplate === 'SVS') {
      text = `
        Dear ${this.candidate.FirstName || ''},<br><br>
        Welcome to <b>Tech Tammina Family</b>!!<br><br>
        It was a pleasure interacting with you during our hiring process and
        we believe you would make a great asset.
      `;
    } else if (this.selectedTemplate === 'TechTammina') {
      text = `
        Dear ${this.candidate.FirstName || ''},<br><br>
        Welcome to <b>Tech Tammina Family</b>!!<br><br>
        We are excited to have you onboard and look forward to seeing the best of your capabilities.
      `;
    }

    // Set initial content to Reactive Form control
    this.editorControl.setValue(text);
  }

  onOptionChange(event: any) {
    this.selectedOption = event.detail.value;
  }

  onTemplateChange(event: any) {
    this.selectedTemplate = event.detail.value;
    this.updatePreview();
  }

  onFileUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.uploadedFileName = file.name;
      this.editorControl.setValue(`<b>Custom Offer Letter uploaded:</b> ${file.name}`);
    }
  }

  hideShow() {
    this.viewEditor = !this.viewEditor;
  }

  sendpreview() {
  
      this.router.navigate(
        ['/preview_send', this.candidate.candidate_id, encodeURIComponent(this.candidate.FirstName)],
        { state: { candidate: this.candidate } }
      );
 
  }

}
