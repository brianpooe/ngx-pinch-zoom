import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

if (environment.production) {
    enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [
        // Zoneless mode is now stable in Angular 20+ (no Zone.js needed)
        // When no zone provider is specified, Angular runs in zoneless mode
        provideRouter([]),
    ],
}).catch((err) => console.error(err));
