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

P04-T02 endet mit der geprüften Java-API zum Lesen und Erstellen. Weitere Arbeit nur nach eigener Phasenfreigabe; Angular und die gemeinsame Abnahme bleiben späteren Tickets vorbehalten.

## Technische Quellen

- [Python-CSV-Modul](https://docs.python.org/3/library/csv.html)
- [Offizielle Angular-CLI-Anleitung](https://angular.dev/tools/cli/setup-local)
- [WPF mit .NET](https://learn.microsoft.com/de-de/dotnet/desktop/wpf/get-started/create-app-visual-studio)

Vor dem Einbinden eines Frameworks dessen aktuelle offizielle Anleitung lesen.
