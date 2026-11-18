# Datenmodell und API-Vertrag — P04-T01

Entwurf für eine spätere lokale Java-API. `routes.json` enthält die maschinenlesbaren Regeln dieses kleinen Vertragsformats; es ist kein OpenAPI- oder JSON-Schema-Dokument. Die Prüfung führt weder HTTP-Aufrufe noch Änderungen an Aufträgen aus.

## Gemeinsames Datenmodell

Liste, Detail und Formular beziehen sich auf `Wartungsauftrag` (bereits als Typ in `src/frontend/fachmodell.ts` und als Record in `src/backend/Main.java` angelegt). Jeder ausgegebene Auftrag besitzt genau diese vier Pflichtfelder, keine weiteren:

| Feld | Typ und Regel | Herkunft |
|---|---|---|
| kennung | Zeichenkette, `A` und mindestens zwei ASCII-Ziffern, z. B. `A01` | Server, unveränderlich und eindeutig |
| bezeichnung | Zeichenkette mit 1–120 Unicode-Codepunkten, mindestens ein Zeichen außer Leerraum | Formular |
| prioritaet | `normal` oder `hoch` | Formular, Pflichtauswahl |
| zustand | `offen` oder `erledigt` | Beim Anlegen `offen`; danach eigene Zustandsänderung |

Bezeichnungen werden unverändert übernommen; führender und abschließender Leerraum zählt zur Länge. Die Oberfläche kann eine bereinigte Eingabe anbieten, der Vertrag entfernt selbst keine Zeichen. Keine numerischen Kennungen, `null`, Typumwandlungen oder unbekannten Felder. Zwei vorhandene synthetische Aufträge bleiben unverändert erhalten; beide sind gültig. Der allgemeine Hinweis auf ungültige Fälle in `beispieldaten/README.md` trifft auf diese zwei Datensätze nicht zu. Ungültige Anfragen stehen separat in `anfragen.json`.

Die spätere API vergibt bei Erstellung die nächste freie Zahl oberhalb der größten vorhandenen Kennung, mit mindestens zwei Ziffern. Nach A01 und A02 folgt A03. Kennungen werden nicht vom Client gesendet. Keine Löschung, kein Mehrbenutzerbetrieb und keine Persistenz in dieser Phase.

## Routen

| Methode und Pfad | Anfrage | Erwartete erfolgreiche Antwort |
|---|---|---|
| GET /auftraege | Kein Rumpf | 200, JSON-Array aller Aufträge, aufsteigend nach numerischem Kennungsteil; ohne Treffer `[]` |
| GET /auftraege/:kennung | Kein Rumpf | 200, genau der vollständige Auftrag |
| POST /auftraege | Genau `bezeichnung` und `prioritaet` | 201, vollständiger neuer Auftrag mit Serverkennung und `zustand: offen`; Header `Location: /auftraege/<kennung>` |
| PATCH /auftraege/:kennung | Genau `zustand` | 200, vollständiger Auftrag mit neuem Zustand; übrige Felder unverändert |

`:kennung` ist ein Platzhalter für eine Kennung gemäß Modell. Für PATCH sind beide Richtungen und ein wiederholtes Setzen desselben Zustands erlaubt. Kein allgemeines Bearbeiten von Bezeichnung oder Priorität. Die Detailroute ergänzt den bisherigen Entwurf, damit ein Auftrag direkt wiedergefunden werden kann.

Anfragekörper für POST/PATCH und sämtliche Antworten verwenden `Content-Type: application/json; charset=utf-8`. JSON-Objektschlüssel sind eindeutig. Keine Abfrageparameter, Filter oder Seiteneinteilung. Andere Pfade/Methoden und ungeeignete Medientypen liegen außerhalb dieses kleinen Vertrags; die spätere API muss deren Behandlung separat festlegen.

## Fehler und Reihenfolge

1. Ungültiges JSON, ein fehlender/falscher Rumpf, fehlende oder zusätzliche Felder, falsche Typen/Werte, Abfrageparameter oder eine falsch formatierte Kennung ergeben 400.
2. Erst nach gültiger Eingabe wird die Existenz für GET-Detail und PATCH geprüft: unbekannte Kennung ergibt 404.
3. Sonst gilt der Erfolgscode der Route. Fehler verändern keinen Auftrag.

Fehlerantworten haben genau `code` und `meldung`, jeweils eine nicht leere Zeichenkette. Die beiden Codes und Meldungen stehen in `routes.json` unter `fehler`. Beispiel für eine unbekannte Kennung:

```json
{"code":"auftrag_nicht_gefunden","meldung":"Der angefragte Auftrag wurde nicht gefunden."}
```

`anfragen.json` speichert den rohen JSON-Rumpf als Zeichenkette in `rumpf`, damit auch kaputtes JSON prüfbar bleibt. Ohne Rumpf entfällt das Feld. Jede Anfrage wird unabhängig gegen die unveränderten zwei Aufträge geprüft; ein gültiges POST-Beispiel legt lokal nichts an. `erwartet` ist eine Vertragsvorgabe, keine beobachtete HTTP-Antwort. Die lokale Prüfung vergleicht diese Vorgabe mit der Einordnung aus Feld-, Routen- und Existenzregeln. Antwortserialisierung, Header und Zustandsänderungen sind erst in P04-T02 praktisch zu prüfen.

## Drei Textskizzen

### Liste — /auftraege

```text
Wartungsaufträge                       [Neuer Auftrag]
Kennung | Bezeichnung       | Priorität | Zustand  | Aktion
A01     | Sensor prüfen     | normal    | offen    | [Details A01]
A02     | Kabel austauschen | hoch      | erledigt | [Details A02]
```

Liest GET /auftraege. Ladehinweis „Aufträge werden geladen …“, Leerzustand „Noch keine Aufträge“, Fehlertext mit Schaltfläche „Erneut laden“. Details über einen beschrifteten Link öffnen.

### Detail — /auftraege/A01

```text
[Zur Liste]             Auftrag A01
Bezeichnung: Sensor prüfen
Priorität: normal       Zustand: offen
[Als erledigt markieren]
```

Liest GET /auftraege/A01, sendet PATCH mit `{"zustand":"erledigt"}`. Bei erledigten Aufträgen lautet die Aktion „Wieder öffnen“. Nach Erfolg den vollständigen zurückgegebenen Auftrag anzeigen. Während Laden/Speichern Status ansagen und Doppelabsenden sperren. 404: „Auftrag nicht gefunden“ und Link zur Liste; bei anderem Fehler Zustand erhalten und erneuten Versuch anbieten.

### Formular — /auftraege/neu

```text
[Zur Liste]             Neuer Wartungsauftrag
Bezeichnung * [________________________]  0/120
Priorität *   [Bitte wählen: normal / hoch]
[Auftrag anlegen]        [Abbrechen]
```

Sendet POST mit den zwei Formularfeldern. Kennung und Zustand sind keine Eingaben. Fehler bei leerer/zu langer Bezeichnung oder fehlender Priorität direkt am beschrifteten Feld erklären, Eingaben erhalten und erstes ungültiges Feld fokussieren. Nach 201 Detailseite der neuen Kennung anzeigen. Abbrechen führt zur Liste. Speichern zeigt „Auftrag wird angelegt …“ und sperrt Doppelabsenden.

Für alle Ansichten vorgesehen: sichtbare Feldbeschriftungen, native Links/Schaltflächen, Tab-Reihenfolge entsprechend Leserichtung, sichtbarer Fokus und angesagte Statusmeldungen. Dies sind Entwurfsentscheidungen, keine ausgeführte Tastatur- oder Angular-Abnahme. Lastenheft A1–A4 bleiben offen.
