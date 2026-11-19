# P04-T03 — noch auszuführende lokale Bedienabnahme

**Nicht ausgeführt.** Diese Prüffälle sind Vorgaben, keine beobachteten Ergebnisse. Voraussetzung: erfolgreicher `npm.cmd run bauen`, echte Java-API und Angular-Entwicklungsserver gemäß START.md, zugänglicher Browser. Nur die zwei unveränderten synthetischen Startaufträge verwenden; ein zusätzlicher Testauftrag darf ausschließlich im flüchtigen API-Speicher entstehen.

1. `/auftraege` öffnen: echte GET-Antwort, genau A01 und A02, alle vier Modellfelder anzeigen. Per Tab zum Link „Neuer Auftrag“, mit Enter öffnen. Sichtbaren Fokus kontrollieren.
2. Formular nur per Tastatur bedienen: sichtbare Beschriftungen für Bezeichnung und Priorität prüfen. Ohne Eingabe absenden: beide Feldhinweise, Fokus auf Bezeichnung, kein POST. Nur Leerraum sowie 121 Zeichen ablehnen; 120 Zeichen einschließlich Unicode-Codepunkten zulassen. Fehlende Priorität separat ablehnen und dort fokussieren. Eingaben bei Fehlern erhalten.
3. Synthetisch „Ventil prüfen“, Priorität „hoch“ anlegen. Während echter langsamer Verbindung Ladehinweis und gesperrte Schaltfläche kontrollieren; kein Doppel-POST. Echte POST-Antwort 201 dokumentieren. Detailroute A03 muss alle vier zurückgegebenen Felder zeigen, anschließend in der Liste wiederfinden.
4. `/auftraege/A99` direkt öffnen: verständlicher Nicht-gefunden-Hinweis und bedienbarer Link zur Liste. Detailroute neu laden und Rücknavigation prüfen.
5. API beenden, Liste erneut laden und Formular absenden: verständlicher Übertragungsfehler, erhaltene Eingabe, erneuter Versuch möglich. API neu starten: wieder genau zwei Ursprungsaufträge. Mit verzögerter **echter** Antwort auch Ladezustände der Listen-/Detailansicht beobachten. Keine simulierte Antwort als echten API-Aufruf protokollieren.

Für jeden Fall tatsächlichen Zeitpunkt, Browser-/Frameworkversion, URL, Eingabe, Beobachtung und Ergebnis festhalten; HTTP-Aufrufe mit Methode, Pfad, Status und Nutzdaten belegen. Keine Zustandsänderung, kein PATCH, keine Persistenz, keine umfassende Barrierefreiheitsprüfung und kein erfundenes Nutzerfeedback. Ein erfolgreicher T03-Lauf allein hakt keine übergreifenden Lastenheftkriterien ab.
