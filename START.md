# Technischer Einstieg — P04

## P04-T01 lokal prüfen

Im Projektordner mit der vorhandenen Python-Laufzeit und dem lokalen uv-Cache ausführen; keine Installation oder Netzwerkverbindung erforderlich:

~~~powershell
uv run --offline --python 3.12 python -X utf8 pruefungen/vertrag_pruefen.py
~~~

Der Prüfer verwendet nur die Python-Standardbibliothek. Er kontrolliert vier Routen, Feldregeln, Vorgabewerte, zwei synthetische Aufträge und 30 unabhängige Beispielanfragen. Er schreibt das tatsächliche Ergebnis einschließlich Zeitpunkten, Python-Version und SHA-256 der Eingaben nach `nachweise/P04-T01-vertragspruefung.json`. Bei Abweichungen endet er mit Fehlercode 1, bei Erfolg mit 0. Er startet keinen Server und verändert keine Beispieldaten.

Vertrag und drei Ansichten: [Textentwurf](vertraege/VERTRAG.md). Erfolgs- und Fehlercodes sind lokale Vertragseinordnungen, keine gemessenen HTTP-Antworten. Ein erfolgreicher Prüflauf belegt keine Java- oder Angular-Ausführung.


## Java-API von P04-T02 starten

Im Projektordner ausführen. Tatsächlich verwendet: Oracle JDK 25 (Build 25+37-LTS-3491), ohne zusätzliche Bibliotheken oder Installation. Node.js und Angular werden für diesen Schritt nicht benötigt.

~~~powershell
java -Dfile.encoding=UTF-8 src/backend/Main.java
~~~

Der Prozess meldet `API bereit: http://127.0.0.1:8080` und läuft bis Strg+C. Optional einen anderen Port als letztes Argument übergeben; `0` lässt das Betriebssystem einen freien Port vergeben (so in der Abnahme ausgeführt). Bindung nur an IPv4-Loopback. Die beiden Aufträge aus `beispieldaten/auftraege.json` werden beim Start geladen, niemals zurückgeschrieben.

Beispielaufrufe in einer zweiten PowerShell:

~~~powershell
Invoke-RestMethod http://127.0.0.1:8080/auftraege
Invoke-RestMethod http://127.0.0.1:8080/auftraege/A01
$eingabe = '{"bezeichnung":"Ventil prüfen","prioritaet":"hoch"}'
Invoke-RestMethod http://127.0.0.1:8080/auftraege -Method Post -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($eingabe))
~~~

Diese drei Befehle sind Bedienbeispiele; die tatsächlichen HTTP-Aufrufe wurden vom folgenden Prüfer ausgeführt:

~~~powershell
uv run --offline --python 3.12 python -X utf8 pruefungen/api_pruefen.py
~~~

Verwendet Python 3.12.14 und nur die Standardbibliothek. Der Prüfer ermittelt `java.home` aus der vorhandenen Java-Laufzeit und startet deren `bin/java.exe` direkt, damit er unter Windows genau seinen eigenen Prozess beendet. Er startet und beendet zwei echte Java-Prozesse mit freien lokalen Ports. 62 HTTP-Anfragen prüfen die drei Routen, Modellfelder, UTF-8/JSON-Escapes, Codepunktgrenzen, Fehler, `Location`, unveränderten Speicher bei Fehlern und den Neustart mit nur zwei Ursprungsaufträgen. Rückgabecode 0 bedeutet bestanden, 1 Fehler. Vollständiger Bericht mit Anfragen, Antworten, Versionen, Zeitpunkten und Quellprüfsummen: `nachweise/P04-T02-http-pruefung.json`. Fehlgeschlagener erster Prüflauf der Wiederaufnahme separat: `nachweise/P04-T02-prueflauf-01.json`.

Umgesetzt ist nur der Lese-/Erstellteil des Gesamtvertrags. Leere Bezeichnung, falsche Typen, zusätzliche/fehlende Felder, doppelter JSON-Schlüssel, ungültiges UTF-8/JSON, Abfrageparameter und falsche Kennungsform ergeben 400; unbekannte gültige Aufträge 404. Fehler haben `code` und `meldung`. Nicht verfügbare Methoden (auch PATCH) ergeben 405 mit `Allow`, unbekannte Routen 404, ungeeigneter/fehlender POST-Medientyp 415. POST akzeptiert `application/json` mit optionalem `charset=utf-8`; maximale Rumpfgröße 65.536 Bytes, Überschreitung 400. Der eigene schmale JSON-Leser akzeptiert ausschließlich Objekte mit Zeichenketten und für Startdaten Listen solcher Objekte; andere Werttypen sind fachlich ungültig.

Grenzen: flüchtiger Arbeitsspeicher, lokale Einzelbenutzung, keine Zustandsänderung, keine dauerhafte Speicherung, keine Angular-/Spring-Ausführung. Kein Produktivbetrieb. Der Vier-Routen-Vertrag aus P04-T01 bleibt als Entwurf erhalten; seine neun PATCH-Beispielfälle werden in dieser Abnahme ausdrücklich ausgelassen. Ein eigener POST-Fall prüft doppelte Schlüssel tatsächlich über HTTP.

## Nächste Aufgabe

P04-T03 enthält inzwischen Angular-Quellen für Formular, Routing und HTTP-Dienst. Die Kompilierung ist geprüft, der vollständige Build und die Bedienabnahme bleiben blockiert. P04-T04 und die gemeinsame Abnahme bleiben offen. Die folgenden älteren Voraussetzungshinweise beschreiben den ersten Versuch; der aktuelle Stand folgt am Ende.

### P04-T03: historische Voraussetzungskontrolle des ersten Versuchs

~~~powershell
uv run --offline --python 3.12 python -X utf8 pruefungen/angular_voraussetzungen_pruefen.py
~~~

Der Prüfer nutzt nur die vorhandene Python-Standardbibliothek. Er erfasst Node-/npm-Version, Paketauflösung und einen echten npm-Metadatenabruf für Angular CLI 21 mit Cache und Protokollen unter `ausgabe/`. Er installiert nichts. Bericht: `nachweise/P04-T03-voraussetzungen.json`; Rückgabecode 1 beim dokumentierten Hindernis. Bestehende npm-Berechtigungen werden nicht verändert. Der Prüfer überschreibt bei Wiederholung den Bericht; den bisherigen Nachweis vorher bei Bedarf innerhalb des Projektordners sichern.

Beobachtet: Node 24.13.0, npm 11.6.2, Python 3.12.14; keine auflösbaren Angular-Pakete; Paketabruf EACCES. Zusätzlich verweigerte der bestehende npm-Cache die Auflistung mit EPERM. Zur Fortsetzung müssen echte Angular-Pakete und die CLI innerhalb der erlaubten Umgebung verfügbar sein. Die gelesene Kompatibilitätstabelle führt Node 24.13.0 für Angular 21 als geeignet, für Angular 22 ist mindestens Node 24.15.0 im 24er-Zweig erforderlich. Keine Paketversion wurde aus dem gescheiterten Registryabruf ermittelt. Ein Frontend-Startbefehl kann erst nach tatsächlicher Einrichtung und Ausführung angegeben werden.

### Gelesene offizielle Angular-Anleitungen

Am 10. November 2026 per Webzugriff gelesen:

- [Lokale Einrichtung](https://angular.dev/tools/cli/setup-local): Node/npm, CLI und lokaler Start.
- [Versionskompatibilität](https://angular.dev/reference/versions): Auswahl einer zur vorhandenen Node-Laufzeit passenden Frameworkversion.
- [Reactive Forms](https://angular.dev/guide/forms/reactive-forms): FormControl und ReactiveFormsModule für das geplante Formular.
- [Routen definieren](https://angular.dev/guide/routing/define-routes): Routes, Parameter und provideRouter für Liste, Formular und Detail.
- [HttpClient einrichten](https://angular.dev/guide/http/setup): HttpClient und provideHttpClient für den geplanten echten API-Zugriff.

Die Anleitung wurde gelesen; daraus folgt keine ausgeführte Angular-Anwendung.

## Technische Quellen

- [Python-CSV-Modul](https://docs.python.org/3/library/csv.html)
- [Offizielle Angular-CLI-Anleitung](https://angular.dev/tools/cli/setup-local)
- [WPF mit .NET](https://learn.microsoft.com/de-de/dotnet/desktop/wpf/get-started/create-app-visual-studio)

Vor dem Einbinden eines Frameworks dessen aktuelle offizielle Anleitung lesen.

## Fortsetzung am 10. November: Angular-Werkzeuge bereit

407 echte npm-Pakete liegen jetzt ausschließlich unter `ausgabe/angular-werkzeuge`, mit Registrycache unter `ausgabe/npm-zwischenspeicher`. Angular CLI 21.2.29 und Build 21.2.29 wurden ausgeführt; Angular 21.2.26, TypeScript 5.9.3 und RxJS 7.8.2 sind installiert. Keine globale npm-Installation und keine Änderung fremder Cacheberechtigungen.

~~~powershell
$env:NG_CLI_ANALYTICS = 'false'
$env:npm_config_cache = Join-Path $PWD 'ausgabe/npm-zwischenspeicher'
node ausgabe/angular-werkzeuge/node_modules/@angular/cli/bin/ng.js version
~~~

Die CLI kann mit dem angegebenen lokalen Einstieg genutzt werden. Bei einer kleinen Angular-Anlage Angular 21, eigene deutsche Bezeichner, `--skip-git` und zunächst `--skip-install` wählen; unnötige Test-/SSR-Pakete vermeiden. Benötigte Pakete sind im projektlokalen Cache beziehungsweise im Werkzeugordner vorhanden. Für eine fachliche Projektinstallation zuerst Offline-Modus mit diesem Cache verwenden; fehlt noch etwas, ausdrücklich melden, keine Rechte ausweiten. Die installierten genauen Versionen stehen in `ausgabe/angular-werkzeuge/package.json`. Nur T03 entwickeln. Werkzeugversionen sind noch keine ausgeführte Benutzeroberfläche.

[Voraussetzungsnachweis vom 10. November](nachweise/P04-T03-voraussetzungen-bereit-2026-11-10.json).

## P04-T03: Wiederaufnahme mit Angular-Quellen

Die aktuellen offiziellen Anleitungen zu [Einrichtung](https://angular.dev/installation), [Reactive Forms](https://angular.dev/guide/forms/reactive-forms), [Routing](https://angular.dev/guide/routing/define-routes) und [HttpClient](https://angular.dev/guide/http/setup) am 10. November erneut per Webzugriff gelesen. Verwendet werden die tatsächlich verfügbaren Angular-21-Pakete, keine behauptete Ausführung von Angular 22.

Im Projektordner tatsächlich ausgeführt:

~~~powershell
$env:NG_CLI_ANALYTICS = 'false'
npm.cmd install --offline --cache ausgabe/npm-zwischenspeicher --ignore-scripts --no-audit --no-fund
npm.cmd run bauen
uv run --offline --python 3.12 python -X utf8 pruefungen/angular_pruefen.py
~~~

Installation: 407 Pakete, Rückgabecode 0. Exakte Abhängigkeiten: `package.json` und `package-lock.json`. Für eine spätere saubere Wiederholung mit vorhandenem Cache `npm.cmd ci --offline --cache ausgabe/npm-zwischenspeicher --ignore-scripts --no-audit --no-fund` verwenden; dieser ci-Befehl wurde in diesem Lauf nicht ausgeführt. Ist der Cache nicht verfügbar, ist die Offline-Wiederholung blockiert.

Build: Rückgabecode 1, esbuild meldet `Cannot read directory "../../../../../../../../../..": Accès refusé.` und kann Einstieg/Styles nicht auflösen. Kein lauffähiges Bundle bestätigt. Der erste Lauf meldete zusätzlich einen TypeScript-Fehler, der korrigiert wurde. Ein zweiter Lauf mit der regulären Option `preserveSymlinks` scheiterte am selben Verzeichniszugriff; die wirkungslose Option wurde wieder entfernt. Keine Berechtigungen oder Sandbox geändert. Originalausgaben: `nachweise/P04-T03-build-versuch-1.log`, `nachweise/P04-T03-build.log`.

Der Python-Prüfer nutzt nur die Standardbibliothek und startet den echten Angular-Compiler mit `--noEmit`. TypeScript und strenge Angular-Templates bestehen; Bericht: `nachweise/P04-T03-kompilierung.json`, Rückgabecode 0. Er prüft außerdem Anzahl und SHA-256 der zwei Originalbeispiele. Dies ist keine Browser-, HTTP- oder Tastaturabnahme. Direkter Browserzugang meldete einen nicht verfügbaren Host; die automatische Freigabeprüfung lehnte den nativen Opera-Zugriff ab.

### Geplanter lokaler Start nach Behebung der Blockade

Diese Startfolge ist konfiguriert, aber in dieser Wiederaufnahme **nicht ausgeführt oder bestätigt**:

~~~powershell
# Erste PowerShell, im Projektordner:
java -Dfile.encoding=UTF-8 src/backend/Main.java
# Zweite PowerShell, im Projektordner:
npm.cmd start
~~~

Anschließend wäre `http://127.0.0.1:4200/auftraege` zu öffnen. Der Angular-Entwicklungsserver soll `/api/auftraege` an die echte Java-API auf Port 8080 weiterleiten; `src/frontend/proxy.json` entfernt nur das Präfix `/api`. Keine Backendänderung und keine simulierten API-Antworten. Die Route `/auftraege/neu` steht vor dem Kennungsparameter. Nach erfolgreichem POST ist die Weiterleitung auf die Detailroute vorgesehen. Laden, Fehler, Beschriftungen und Fokus sind im Quelltext vorhanden, ihre tatsächliche Bedienung ist offen. Die API speichert weiterhin nur im Arbeitsspeicher; PATCH, Persistenz, Spring und P04-T04 gehören nicht zu diesem Schritt.

Die noch auszuführende kleine Ticketabnahme steht in `pruefungen/P04-T03-abnahme.md`. Vollständige Wiederholungsdateien und Befunde: `nachweise/P04-T03-wiederaufnahme.md`.

## Nachprüfung durch den Koordinator am 10. November

Der vollständige Befehl `npm.cmd run bauen` wurde im vorhandenen autorisierten Arbeitskontext des Koordinators erneut ausgeführt und beendet sich mit Status 0. Ein echtes Bundle mit main.js und styles.css liegt unter `ausgabe/oberflaeche/`. Es wurden keine Berechtigungen oder Sandboxeinstellungen verändert. Der frühere Zugriffsfehler des Hintergrundarbeiters ist weiterhin als eigener Versuch dokumentiert. Browserbedienung und fachliche HTTP-Abnahme bleiben offen; keine vollständige Ticketfreigabe. [Build-Nachweis](nachweise/P04-T03-build-koordinator-2026-11-10.json).

## Tatsächliche Browserabnahme vom 17. November 2026

P04-T03 lokal geprüft. Vollständiger Angular-Build erneut erfolgreich. Playwright 1.65.1 mit echtem Chromium 159.0.8154.6 führt das gebaute Angular-Bundle aus. Die Java-API startet separat auf einem eigenen freien Port; ein lokaler Prüfproxy liefert echte Antworten mit 600 ms Verzögerung. Port 8080 ist durch einen fremden Dienst belegt und bleibt unberührt. Keine simulierte Java-Antwort als Produktnachweis. Der reguläre Angular-Entwicklungsproxy ist konfiguriert, aber durch diesen Bundle-Prüflauf noch nicht separat ausgeführt.

Tatsächlich bestanden: Liste mit zwei Originalaufträgen, Tab/Enter-Navigation und sichtbarer Fokus, leere und zu lange Bezeichnung, fehlende Priorität und Fokuskorrektur, genau 120 Unicode-Codepunkte akzeptiert, 121 abgewiesen, echter Auftrag A03 „Ventil prüfen“, echte POST-Antwort 201, Detail-/Listenroute, 404 mit Neuladen, Ladehinweise und Doppelsendesperre. Java wirklich beendet: verständliche Fehler und erhaltene Formulareingabe; Java neu gestartet: wieder zwei Originalaufträge und erneutes Absenden möglich. Keine unerwarteten JavaScript-Fehler. Alle eigenen Prozesse werden vom Prüfer beendet.

[HTTP-Protokoll und Versionen](nachweise/P04-T03-browserabnahme.json), [Liste](nachweise/P04-T03-liste.png), [Detail](nachweise/P04-T03-detail.png), [API-Ausfall](nachweise/P04-T03-api-fehler.png). Bilder visuell geprüft: Beschriftungen und Fehler vollständig lesbar. Der Browser läuft ohne sichtbares Fenster und greift nicht in die Videowiedergabe ein. Dies ist automatisierte Bedienprüfung, kein menschliches Nutzerfeedback und keine umfassende Barrierefreiheitsprüfung.

Wiederholung im Projektordner: `npm.cmd run bauen`, danach `node pruefungen/browser_abnahme.cjs`. Playwright ist exakt als Entwicklungsabhängigkeit versioniert; bei fehlendem Browser zunächst dessen regulären Chromium-Download ausführen. Quellen: [Playwright Page API](https://playwright.dev/docs/api/class-page), [Prüfassertionen](https://playwright.dev/docs/test-assertions). Kein Wechsel von Sandboxrechten oder Abschalten von Grafikschutz für diese Prüfung.

T04 bleibt offen: Zustand ändern, vollständigen Ablauf und Entwicklungsserver prüfen. API weiterhin flüchtig, kein Spring, keine Persistenz. Studentische T03-Schätzung 105 Minuten; Gesamtdauer der Koordinatorwiederaufnahme nicht separat gemessen. Dokumentationszeit: 2026-11-17T17:55:55.727Z. Keine menschliche Eigenleistung behauptet und kein Projektcommit erstellt.
