import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { CandidateService } from 'src/app/services/pre-onboarding.service';

@Component({
  selector: 'app-organisation-info',
  templateUrl: './organisation-info.component.html',
  styleUrls: ['./organisation-info.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class OrganisationInfoComponent implements OnInit {
  selectedFile: File | null = null;
  imageUrl: string | null = null;
  previewUrl: string | null = null;
  constructor(
    private candidateService: CandidateService,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() { }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
    if (this.selectedFile) {
      const reader = new FileReader();
      reader.onload = (e: any) => this.imageUrl = e.target.result;
      reader.readAsDataURL(this.selectedFile);
    }
  }
  onUpload() {
    if (!this.selectedFile) {
      this.showToast('Please select a file first!', 'warning');
      return;
    }
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
