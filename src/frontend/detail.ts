import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';
import { Auftragsdienst, fehlermeldung } from './auftragsdienst';
import { Wartungsauftrag } from './fachmodell';

@Component({
  selector: 'auftrags-detail', imports: [RouterLink],
  template: `
    <h1>Auftragsdetails</h1>
    <p><a routerLink="/auftraege">Zur Liste</a></p>
    @if (laedt()) { <p role="status">Auftrag wird geladen …</p> }
    @if (fehler()) { <p role="alert">{{ fehler() }}</p> }
    @if (auftrag(); as auftrag) {
      <h2>Auftrag {{ auftrag.kennung }}</h2>
      <dl><dt>Bezeichnung</dt><dd>{{ auftrag.bezeichnung }}</dd>
        <dt>Priorität</dt><dd>{{ auftrag.prioritaet }}</dd>
        <dt>Zustand</dt><dd>{{ auftrag.zustand }}</dd></dl>
    }
  `
})
export class Auftragsdetail {
  readonly auftrag = signal<Wartungsauftrag | null>(null);
  readonly laedt = signal(true);
  readonly fehler = signal('');
  private readonly dienst = inject(Auftragsdienst);
  constructor() {
    inject(ActivatedRoute).paramMap.pipe(
      tap(() => { this.laedt.set(true); this.fehler.set(''); this.auftrag.set(null); }),
      switchMap(parameter => this.dienst.detail(parameter.get('kennung') ?? '').pipe(
        catchError(fehler => { this.fehler.set(fehlermeldung(fehler)); return of(null); })
      )),
      takeUntilDestroyed(inject(DestroyRef))
    ).subscribe(auftrag => { this.auftrag.set(auftrag); this.laedt.set(false); });
  }
}
