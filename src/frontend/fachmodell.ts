export type Auftragszustand = "offen" | "erledigt";
export interface Wartungsauftrag { kennung: string; bezeichnung: string; prioritaet: "normal" | "hoch"; zustand: Auftragszustand; }
// P04-T03: Angular-Anwendung in frontend-app erzeugen und diesen Vertrag verwenden.
