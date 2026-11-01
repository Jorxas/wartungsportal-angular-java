# Technischer Einstieg — P04

## P04-T01 lokal prüfen

Im Projektordner mit der vorhandenen Python-Laufzeit und dem lokalen uv-Cache ausführen; keine Installation oder Netzwerkverbindung erforderlich:

~~~powershell
uv run --offline --python 3.12 python -X utf8 pruefungen/vertrag_pruefen.py
~~~

Der Prüfer verwendet nur die Python-Standardbibliothek. Er kontrolliert vier Routen, Feldregeln, Vorgabewerte, zwei synthetische Aufträge und 30 unabhängige Beispielanfragen. Er schreibt das tatsächliche Ergebnis einschließlich Zeitpunkten, Python-Version und SHA-256 der Eingaben nach `nachweise/P04-T01-vertragspruefung.json`. Bei Abweichungen endet er mit Fehlercode 1, bei Erfolg mit 0. Er startet keinen Server und verändert keine Beispieldaten.

Vertrag und drei Ansichten: [Textentwurf](vertraege/VERTRAG.md). Erfolgs- und Fehlercodes sind lokale Vertragseinordnungen, keine gemessenen HTTP-Antworten. Ein erfolgreicher Prüflauf belegt keine Java- oder Angular-Ausführung.


## Einstiegspunkt ausführen

Voraussetzungen: JDK; Node.js; Angular CLI für dieses Projekt.

~~~powershell
java src/backend/Main.java
~~~

Das Startprogramm meldet den Initialisierungsstand. Fachfunktionen sind bewusst noch nicht implementiert und melden dies bei einem Aufruf. Fehlende Bibliotheken und Frameworks erst im passenden Ticket mit ihrer tatsächlichen Version ergänzen.

## Nächste Aufgabe

P04-T01 endet mit dem lokal geprüften Vertrag und den Textskizzen. Erst nach eigener Freigabe und gemäß Phasenplan folgt P04-T02: Java-API mit tatsächlichen HTTP-Prüfungen. Angular und die gemeinsame Abnahme folgen später.

## Technische Quellen

- [Python-CSV-Modul](https://docs.python.org/3/library/csv.html)
- [Offizielle Angular-CLI-Anleitung](https://angular.dev/tools/cli/setup-local)
- [WPF mit .NET](https://learn.microsoft.com/de-de/dotnet/desktop/wpf/get-started/create-app-visual-studio)

Vor dem Einbinden eines Frameworks dessen aktuelle offizielle Anleitung lesen.
