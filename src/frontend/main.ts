import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, RouterOutlet } from '@angular/router';
import { routen } from './routen';

@Component({
  selector: 'wartungs-portal', imports: [RouterOutlet],
  template: `<header>Wartungsportal · lokales Lernprojekt</header><main><router-outlet /></main>`
})
class Wartungsportal {}

bootstrapApplication(Wartungsportal, {
  providers: [provideRouter(routen), provideHttpClient()]
}).catch(() => {
  document.body.textContent = 'Das Wartungsportal konnte nicht gestartet werden. Bitte die Seite erneut laden.';
});
