"""Startet die echte Java-API und prüft ausschließlich den Endpunkt von P04-T02."""

from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import http.client
import json
from pathlib import Path
import queue
import re
import subprocess
import sys
import threading


projektordner = Path(__file__).resolve().parents[1]
ergebnisse = []
serverlaeufe = []
# Der Windows-Weiterleiter im PATH startet einen Kindprozess. Direkt das ermittelte
# JDK verwenden, damit der Prüfer genau seinen eigenen Server beenden kann.
einstellungen = subprocess.run(["java", "-XshowSettings:properties", "-version"],
                               capture_output=True, text=True, check=True).stderr
java_ordner = re.search(r"^\s*java.home = (.+)$", einstellungen, re.MULTILINE).group(1).strip()
java_programm = str(Path(java_ordner) / "bin" / "java.exe")
startbefehl = [java_programm, "-Dfile.encoding=UTF-8", "src/backend/Main.java", "0"]


def fordern(bedingung, meldung):
    if not bedingung:
        raise AssertionError(meldung)


@contextmanager
def server_starten():
    prozess = subprocess.Popen(startbefehl, cwd=projektordner, stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE, text=True, encoding="utf-8")
    ausgabe = queue.Queue()
    threading.Thread(target=lambda: ausgabe.put(prozess.stdout.readline()), daemon=True).start()
    lauf = {"befehl": startbefehl, "beginnUtc": datetime.now(timezone.utc).isoformat()}
    serverlaeufe.append(lauf)
    try:
        zeile = ausgabe.get(timeout=30).strip()
        lauf["startmeldung"] = zeile
        fordern(zeile.startswith("API bereit: http://127.0.0.1:"), "Java-Start fehlgeschlagen")
        yield int(zeile.rsplit(":", 1)[1])
    finally:
        prozess.terminate()
        try:
            _, fehler = prozess.communicate(timeout=10)
        except subprocess.TimeoutExpired:
            prozess.kill()
            _, fehler = prozess.communicate(timeout=10)
        lauf.update({"endeUtc": datetime.now(timezone.utc).isoformat(), "fehlerausgabe": fehler,
                     "beendetDurchPruefer": True})


def anfragen(port, fall, methode, pfad, erwartet, rumpf=None, medientyp="application/json; charset=utf-8"):
    verbindung = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
    daten = rumpf.encode("utf-8") if isinstance(rumpf, str) else rumpf
    kopf = {"Content-Type": medientyp} if medientyp else {}
    try:
        verbindung.request(methode, pfad, body=daten, headers=kopf)
        antwort = verbindung.getresponse()
        roh = antwort.read().decode("utf-8")
        inhalt = json.loads(roh)
        kopf = {name.lower(): wert for name, wert in antwort.getheaders()}
        eintrag = {"fall": fall, "methode": methode, "pfad": pfad, "erwartet": erwartet,
                   "status": antwort.status, "kopf": kopf, "antwort": inhalt,
                   "bestanden": False}
        if rumpf is not None:
            eintrag["anfrage"] = rumpf if isinstance(rumpf, str) else {"hex": rumpf.hex()}
        ergebnisse.append(eintrag)
        fordern(antwort.status == erwartet, f"{fall}: {antwort.status} statt {erwartet}")
        fordern(kopf.get("content-type") == "application/json; charset=utf-8", f"{fall}: Medientyp")
        if erwartet >= 400:
            fordern(set(inhalt) == {"code", "meldung"} and all(inhalt.values()), f"{fall}: Fehlerformat")
            if erwartet in (400, 404) and pfad.startswith("/auftraege"):
                fordern(inhalt == vertrag["fehler"][str(erwartet)], f"{fall}: Fehlermeldung")
        eintrag["bestanden"] = True
        return inhalt, kopf
    finally:
        verbindung.close()


def pruefen():
    beispiele = json.loads((projektordner / "beispieldaten/auftraege.json").read_text(encoding="utf-8"))
    fordern(len(beispiele) == 2, "Zwei ursprüngliche Beispielaufträge erforderlich")
    erwartet = list(beispiele)
    faelle = json.loads((projektordner / "vertraege/anfragen.json").read_text(encoding="utf-8"))
    ausgelassen = [fall["fall"] for fall in faelle if fall["methode"] == "PATCH"]
    with server_starten() as port:
        for fall in faelle:
            if fall["methode"] == "PATCH":
                continue
            inhalt, kopf = anfragen(port, fall["fall"], fall["methode"], fall["pfad"],
                                    fall["erwartet"], fall.get("rumpf"))
            if fall["erwartet"] == 201:
                neuer_auftrag = {"kennung": f"A{len(erwartet) + 1:02d}",
                                 **json.loads(fall["rumpf"]), "zustand": "offen"}
                fordern(inhalt == neuer_auftrag, "Erstellung: Modell oder Vorgaben abweichend")
                fordern(kopf.get("location") == "/auftraege/" + neuer_auftrag["kennung"], "Location fehlt")
                erwartet.append(neuer_auftrag)
                gelesen, _ = anfragen(port, fall["fall"] + "_wiederfinden", "GET", kopf["location"], 200)
                fordern(gelesen == neuer_auftrag, "Erstellter Auftrag nicht wiedergefunden")
            elif fall["fall"] == "liste":
                fordern(inhalt == beispiele, "Startdaten abweichend")
            elif fall["fall"] == "detail_vorhanden":
                fordern(inhalt == beispiele[0], "Detail abweichend")
            liste, _ = anfragen(port, fall["fall"] + "_speicher", "GET", "/auftraege", 200)
            fordern(liste == erwartet, "Speicherinhalt oder Reihenfolge abweichend")

        # JSON-Escapes, UTF-8 und Codepunktlänge sind Grenzen des eigenen schmalen Lesers.
        for name, bezeichnung in [("unicode_120", "🔧" * 120),
                                  ("json_escapes", '  Öl "prüfen" \\ Leitung\n\t\b\f\r  ')]:
            rumpf = json.dumps({"bezeichnung": bezeichnung, "prioritaet": "normal"}, ensure_ascii=True)
            inhalt, kopf = anfragen(port, name, "POST", "/auftraege", 201, rumpf)
            neuer_auftrag = {"kennung": f"A{len(erwartet) + 1:02d}", "bezeichnung": bezeichnung,
                             "prioritaet": "normal", "zustand": "offen"}
            fordern(inhalt == neuer_auftrag, "Unicode oder JSON-Escapes verändert")
            fordern(kopf.get("location") == "/auftraege/" + neuer_auftrag["kennung"], "Location abweichend")
            erwartet.append(neuer_auftrag)

        ungueltig = [
            ("unicode_121", json.dumps({"bezeichnung": "🔧" * 121, "prioritaet": "normal"})),
            ("unicode_leerraum", '{"bezeichnung":"\\u00a0\\u0085","prioritaet":"normal"}'),
            ("doppelter_schluessel", '{"bezeichnung":"a","bezeichnung":"b","prioritaet":"normal"}'),
            ("json_nachlauf", '{"bezeichnung":"a","prioritaet":"normal"}{}'),
            ("json_schlusskomma", '{"bezeichnung":"a","prioritaet":"normal",}'),
            ("json_escape_unbekannt", '{"bezeichnung":"\\x","prioritaet":"normal"}'),
            ("einzelnes_surrogat", '{"bezeichnung":"\\ud800","prioritaet":"normal"}'),
            ("utf8_ungueltig", b'{"bezeichnung":"\xff","prioritaet":"normal"}'),
            ("rumpf_zu_gross", b" " * 65537),
        ]
        for name, rumpf in ungueltig:
            anfragen(port, name, "POST", "/auftraege", 400, rumpf)
        anfragen(port, "medientyp_falsch", "POST", "/auftraege", 415, "{}", "text/plain")
        anfragen(port, "medientyp_fehlt", "POST", "/auftraege", 415, "{}", None)
        _, kopf = anfragen(port, "patch_nicht_umgesetzt", "PATCH", "/auftraege/A01", 405,
                           '{"zustand":"erledigt"}')
        fordern(kopf.get("allow") == "GET", "Erlaubte Detailmethode fehlt")
        anfragen(port, "route_unbekannt", "GET", "/unbekannt", 404)
        liste, _ = anfragen(port, "speicher_abschliessend", "GET", "/auftraege", 200)
        fordern(liste == erwartet, "Fehler hat Speicher verändert")
    with server_starten() as port:
        liste, _ = anfragen(port, "neustart_nur_beispieldaten", "GET", "/auftraege", 200)
        fordern(liste == beispiele, "Neustart muss flüchtige Aufträge verwerfen")
    return {"beispieldatensaetze": len(beispiele), "ausgelassenePatchVertragsfaelle": ausgelassen,
            "gepruefteRouten": ["GET /auftraege", "GET /auftraege/:kennung", "POST /auftraege"]}


if __name__ == "__main__":
    beginn = datetime.now(timezone.utc)
    eingabepfade = ["src/backend/Main.java", "pruefungen/api_pruefen.py", "beispieldaten/auftraege.json",
                    "vertraege/routes.json", "vertraege/anfragen.json"]
    vorher = {pfad: hashlib.sha256((projektordner / pfad).read_bytes()).hexdigest() for pfad in eingabepfade}
    vertrag = json.loads((projektordner / "vertraege/routes.json").read_text(encoding="utf-8"))
    try:
        bericht = pruefen()
        fordern(vorher["beispieldaten/auftraege.json"] == hashlib.sha256(
            (projektordner / "beispieldaten/auftraege.json").read_bytes()).hexdigest(), "Beispieldatei verändert")
        bericht["bestanden"] = True
    except Exception as fehler:
        bericht = {"bestanden": False, "fehler": str(fehler)}
    bericht.update({"projekt": "P04", "ticket": "P04-T02", "beginnUtc": beginn.isoformat(),
                    "endeUtc": datetime.now(timezone.utc).isoformat(), "python": sys.version,
                    "java": subprocess.run(["java", "-version"], capture_output=True, text=True).stderr.strip(),
                    "befehl": "uv run --offline --python 3.12 python -X utf8 pruefungen/api_pruefen.py",
                    "httpAnfragen": len(ergebnisse), "ergebnisse": ergebnisse,
                    "serverlaeufe": serverlaeufe, "sha256": vorher,
                    "grenze": "Echte lokale Java-HTTP-API; kein PATCH, Angular, Spring oder dauerhafter Speicher"})
    (projektordner / "nachweise/P04-T02-http-pruefung.json").write_text(
        json.dumps(bericht, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({schluessel: wert for schluessel, wert in bericht.items()
                      if schluessel not in ("ergebnisse", "sha256")}, ensure_ascii=False, indent=2))
    sys.exit(0 if bericht["bestanden"] else 1)
