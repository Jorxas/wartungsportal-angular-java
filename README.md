# Kleines Portal für Wartungsaufträge

Stand: 10. November 2026 — **P04-T03 teilimplementiert, Abnahme blockiert: Bundler-Zugriff verweigert**. Angular-Quellen und Templates kompilieren; eine laufende Oberfläche ist noch nicht nachgewiesen. P04-T02 bleibt lokal geprüft. Ursprünglich geplanter Abschluss der Basis: 2026-11-04, spätestens 8. November 2026; Fortsetzungszeitraum gemäß übergeordnetem Plan bis 15. November. Geschätzter Basisaufwand: 5 Stunden ohne Einrichtung und Erweiterungen.

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

## Stand von P04-T03

Bei der Wiederaufnahme echte Angular-Pakete aus dem vorbereiteten Projektcache offline installiert. Liste, Detail, Reactive-Forms-Formular, Routing und HttpClient-Dienst mit gemeinsamem Modell ergänzt. Der Angular-Compiler prüft TypeScript und Templates erfolgreich. Der vollständige Build scheitert an verweigerten Verzeichniszugriffen; eine Browserabnahme war ebenfalls nicht zugänglich. Kein laufendes Frontend, keine tatsächliche Tastaturbedienung und keine HTTP-Verbindung aus Angular behauptet. Wiederholung und Grenzen: [START.md](START.md), [Wiederaufnahmebericht](nachweise/P04-T03-wiederaufnahme.md). Frühere Blockadeberichte bleiben als Verlauf erhalten. Die zwei Beispieldatensätze bleiben unverändert. Lastenheft A1–A4, businessImplemented und P04-T04 bleiben offen; keine Zustandsänderung ergänzt.

[Erweiterungen](VARIANTEN.md) haben einen eigenen Umsetzungsstand. [Private Unternehmenszuordnung](UNTERNEHMEN.lokal.md) bleibt außerhalb der Git-Verwaltung.

## Projektsprache

Dokumentation, selbst gewählte Bezeichner, Kommentare, Meldungen und Beispieldaten werden auf Deutsch geschrieben. Festgelegte API-Schlüssel, Sprachsyntax und Produktnamen bleiben unverändert.

## Tatsächliche Browserabnahme vom 17. November 2026

P04-T03 lokal geprüft. Vollständiger Angular-Build erneut erfolgreich. Playwright 1.65.1 mit echtem Chromium 159.0.8154.6 führt das gebaute Angular-Bundle aus. Die Java-API startet separat auf einem eigenen freien Port; ein lokaler Prüfproxy liefert echte Antworten mit 600 ms Verzögerung. Port 8080 ist durch einen fremden Dienst belegt und bleibt unberührt. Keine simulierte Java-Antwort als Produktnachweis. Der reguläre Angular-Entwicklungsproxy ist konfiguriert, aber durch diesen Bundle-Prüflauf noch nicht separat ausgeführt.

Tatsächlich bestanden: Liste mit zwei Originalaufträgen, Tab/Enter-Navigation und sichtbarer Fokus, leere und zu lange Bezeichnung, fehlende Priorität und Fokuskorrektur, genau 120 Unicode-Codepunkte akzeptiert, 121 abgewiesen, echter Auftrag A03 „Ventil prüfen“, echte POST-Antwort 201, Detail-/Listenroute, 404 mit Neuladen, Ladehinweise und Doppelsendesperre. Java wirklich beendet: verständliche Fehler und erhaltene Formulareingabe; Java neu gestartet: wieder zwei Originalaufträge und erneutes Absenden möglich. Keine unerwarteten JavaScript-Fehler. Alle eigenen Prozesse werden vom Prüfer beendet.

[HTTP-Protokoll und Versionen](nachweise/P04-T03-browserabnahme.json), [Liste](nachweise/P04-T03-liste.png), [Detail](nachweise/P04-T03-detail.png), [API-Ausfall](nachweise/P04-T03-api-fehler.png). Bilder visuell geprüft: Beschriftungen und Fehler vollständig lesbar. Der Browser läuft ohne sichtbares Fenster und greift nicht in die Videowiedergabe ein. Dies ist automatisierte Bedienprüfung, kein menschliches Nutzerfeedback und keine umfassende Barrierefreiheitsprüfung.

Wiederholung im Projektordner: `npm.cmd run bauen`, danach `node pruefungen/browser_abnahme.cjs`. Playwright ist exakt als Entwicklungsabhängigkeit versioniert; bei fehlendem Browser zunächst dessen regulären Chromium-Download ausführen. Quellen: [Playwright Page API](https://playwright.dev/docs/api/class-page), [Prüfassertionen](https://playwright.dev/docs/test-assertions). Kein Wechsel von Sandboxrechten oder Abschalten von Grafikschutz für diese Prüfung.

T04 bleibt offen: Zustand ändern, vollständigen Ablauf und Entwicklungsserver prüfen. API weiterhin flüchtig, kein Spring, keine Persistenz. Studentische T03-Schätzung 105 Minuten; Gesamtdauer der Koordinatorwiederaufnahme nicht separat gemessen. Dokumentationszeit: 2026-11-17T17:55:55.727Z. Keine menschliche Eigenleistung behauptet und kein Projektcommit erstellt.
