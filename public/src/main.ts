import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules, withInMemoryScrolling } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { addIcons } from 'ionicons';
import * as allIcons from 'ionicons/icons';

import { QuillModule } from 'ngx-quill';
import { importProvidersFrom } from '@angular/core';
import { employeeInterceptor } from './app/services/employee-interceptor.interceptor';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

addIcons(allIcons);

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({
      mode: 'md'
    }),
    provideHttpClient(
      withInterceptors([employeeInterceptor]),
    ),
    provideAnimations(),
    provideRouter(routes, withPreloading(PreloadAllModules), 
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })
    ),
    importProvidersFrom(QuillModule.forRoot()),
    provideCharts(withDefaultRegisterables())
  ],
});
