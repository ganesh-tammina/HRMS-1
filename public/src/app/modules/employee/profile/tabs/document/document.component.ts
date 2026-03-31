import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-document-tab',
  template: `
    <div class="placeholder-container">
      <ion-icon name="document-attach-outline"></ion-icon>
      <h3>No Documents Found</h3>
      <p>There are currently no documents uploaded for this employee.</p>
    </div>
  `,
  styles: [`
    .placeholder-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      color: #71717a;

      ion-icon {
        font-size: 64px;
        margin-bottom: 20px;
        color: #e4e4e7;
      }

      h3 {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 8px;
        color: #18191c;
      }

      p {
        font-size: 14px;
        max-width: 300px;
      }
    }
  `],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class DocumentTabComponent {
  @Input() currentEmployee: any;
}
