# Kleines Portal für Wartungsaufträge

Stand: 2. November 2026 — **P04-T02: Java-API zum Lesen und Anlegen mit Arbeitsspeicher lokal geprüft**. Geplanter Abschluss der Basis: 2026-11-04, spätestens 8. November 2026. Geschätzter Basisaufwand: 5 Stunden ohne Einrichtung und Erweiterungen.

Ein Wartungsteam möchte einen Auftrag anlegen, wiederfinden und seinen Bearbeitungsstand ändern.

Ergebnis: Drei Angular-Ansichten und eine Java-API; Spring bei Bedarf als eigene Variante.

Vorgesehene Technologien: Java, REST/API, Angular, TypeScript, HTML/CSS, Git, UX/UI, Tests/QA. Eine Nennung ist kein Nachweis einer Umsetzung.

## Einstieg

1. [Lastenheft](LASTENHEFT.md) lesen.
2. [Erstes Ticket](tickets/P04-T01.md) öffnen.
3. [Technischen Einstieg](START.md) prüfen und ein Ticket nach dem anderen bearbeiten.
4. [Arbeitsjournal](ARBEITSJOURNAL.md) und echte Nachweise aktualisieren.

Abhängigkeiten: keine weiteren Projekte.

## Ergebnis von P04-T01

[Vertrag und Textskizzen](vertraege/VERTRAG.md) beschreiben vier Routen, Feldregeln und erwartete Fehler. [Beispielanfragen](vertraege/anfragen.json) enthalten gültige und ungültige Eingaben. Die zwei ursprünglichen synthetischen Aufträge sind unverändert. Lokale Prüfung gemäß [Startanleitung](START.md); Ergebnis unter `nachweise/P04-T01-vertragspruefung.json`.

P04-T01 bleibt der geprüfte Entwurf. Studentische Schätzung für P04-T01: 45 Minuten, keine geleistete menschliche Arbeitszeit. Tatsächliche Assistentenzeit und Fertigstellung stehen im [Journal](ARBEITSJOURNAL.md). Veröffentlichung und Commit erfolgen später durch den übergeordneten Dienst.

## Ergebnis von P04-T02

Die Java-API bietet `GET /auftraege`, `GET /auftraege/:kennung` und `POST /auftraege`. Sie lädt die zwei unveränderten synthetischen Aufträge, prüft Eingaben und vergibt Kennung sowie Anfangszustand selbst. Start und Abnahme: [START.md](START.md). 62 echte lokale HTTP-Anfragen einschließlich Fehlerfällen, Wiederfinden und Neustart bestanden: `nachweise/P04-T02-http-pruefung.json`.

Nur Arbeitsspeicher: Neue Aufträge verschwinden beim Neustart. PATCH aus dem Gesamtvertrag ist noch nicht umgesetzt (405). Angular, Tastaturprüfung, Spring und die gemeinsame Abnahme sind offen; Lastenheft A1–A4 bleiben unverändert offen. Studentische Schätzung für P04-T02: 90 Minuten. Der unterbrochene Versuch und die tatsächliche Zeit der Wiederaufnahme sind im Journal getrennt dokumentiert.

[Erweiterungen](VARIANTEN.md) haben einen eigenen Umsetzungsstand. [Private Unternehmenszuordnung](UNTERNEHMEN.lokal.md) bleibt außerhalb der Git-Verwaltung.

## Projektsprache

Dokumentation, selbst gewählte Bezeichner, Kommentare, Meldungen und Beispieldaten werden auf Deutsch geschrieben. Festgelegte API-Schlüssel, Sprachsyntax und Produktnamen bleiben unverändert.
