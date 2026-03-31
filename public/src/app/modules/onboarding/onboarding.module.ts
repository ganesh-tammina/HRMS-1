import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule, DatePipe, UpperCasePipe, TitleCasePipe, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { OnboardingRoutingModule } from './onboarding-routing.module';
import { OnboardingDashboardComponent } from './onboarding-dashboard/onboarding-dashboard.component';
import { PreonboardingListComponent } from './preonboarding-list/preonboarding-list.component';
import { PreonboardingDetailComponent } from './preonboarding-detail/preonboarding-detail.component';
import { CreateCandidateModalComponent } from './create-candidate-modal/create-candidate-modal.component';
import { ReplaceCharacterPipe } from '../../shared/pipes/replace-character.pipe';

@NgModule({
    declarations: [
        OnboardingDashboardComponent,
        PreonboardingListComponent,
        PreonboardingDetailComponent,
        CreateCandidateModalComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        IonicModule,
        OnboardingRoutingModule,
        ReplaceCharacterPipe
    ],
    providers: [
        DatePipe,
        UpperCasePipe,
        TitleCasePipe,
        DecimalPipe
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class OnboardingModule { }
