"""Prüft nur Vertragsdateien und unabhängige Beispiele, ohne HTTP oder Speicherung."""

import hashlib
import json
from pathlib import Path
import re
import sys
from datetime import datetime, timezone


projektordner = Path(__file__).resolve().parents[1]


def eindeutiges_objekt(paare):
    objekt = {}
    for schluessel, wert in paare:
        if schluessel in objekt:
            raise ValueError("Doppelter JSON-Schlüssel: " + schluessel)
        objekt[schluessel] = wert
    return objekt


def ungueltige_konstante(wert):
    raise ValueError("Ungültige JSON-Konstante: " + wert)


def json_lesen(inhalt):
    return json.loads(inhalt, object_pairs_hook=eindeutiges_objekt,
                      parse_constant=ungueltige_konstante)


def fordern(bedingung, meldung):
    if not bedingung:
        raise ValueError(meldung)


def feld_gueltig(wert, regel):
    if regel["typ"] != "zeichenkette" or not isinstance(wert, str):
        return False
    return (
        ("werte" not in regel or wert in regel["werte"])
        and ("muster" not in regel or re.fullmatch(regel["muster"], wert) is not None)
        and len(wert) >= regel.get("mindestlaenge", 0)
        and len(wert) <= regel.get("hoechstlaenge", float("inf"))
        and (not regel.get("nichtNurLeerraum", False) or bool(wert.strip()))
    )


def anfrage_einordnen(anfrage, vertrag, kennungen):
    pfad = anfrage["pfad"].split("?", 1)[0]
    kennung = None
    if pfad == "/auftraege":
        routenpfad = pfad
    elif pfad.startswith("/auftraege/") and pfad.count("/") == 2:
        routenpfad = "/auftraege/:kennung"
        kennung = pfad.rsplit("/", 1)[1]
    else:
        raise ValueError("Beispielpfad außerhalb des Vertrags")
    passende_routen = [route for route in vertrag["routes"]
                       if (route["method"], route["path"]) == (anfrage["methode"], routenpfad)]
    fordern(len(passende_routen) == 1, "Beispielmethode außerhalb des Vertrags")
    route = passende_routen[0]
    if "?" in anfrage["pfad"]:
        return 400, "Abfrageparameter sind nicht vorgesehen"
    if kennung is not None and not feld_gueltig(kennung, vertrag["modell"]["kennung"]):
        return 400, "Kennungsformat ungültig"
    if not route["rumpfErlaubt"]:
        if "rumpf" in anfrage:
            return 400, "Rumpf für Leseroute nicht erlaubt"
    else:
        if "rumpf" not in anfrage:
            return 400, "Rumpf fehlt"
        try:
            rumpf = json_lesen(anfrage["rumpf"])
        except ValueError:
            return 400, "JSON ungültig oder Schlüssel doppelt"
        if not isinstance(rumpf, dict):
            return 400, "JSON-Objekt erforderlich"
        if not set(route["required"]) <= rumpf.keys() or not rumpf.keys() <= set(route["eingabefelder"]):
            return 400, "Pflichtfeld fehlt oder zusätzliches Feld vorhanden"
        for feld, wert in rumpf.items():
            if not feld_gueltig(wert, vertrag["modell"][feld]):
                return 400, "Feld ungültig: " + feld
    if kennung is not None and kennung not in kennungen:
        return 404, "Gültige Kennung fehlt im unveränderten Beispieldatensatz"
    return route["erfolg"], "Anfrage entspricht den Vertragsregeln"


def pruefen():
    vertrag = json_lesen((projektordner / "vertraege/routes.json").read_text(encoding="utf-8"))
    anfragen = json_lesen((projektordner / "vertraege/anfragen.json").read_text(encoding="utf-8"))
    auftraege = json_lesen((projektordner / "beispieldaten/auftraege.json").read_text(encoding="utf-8"))
    konfiguration = json_lesen((projektordner / "projekt.json").read_text(encoding="utf-8"))
    modell = vertrag["modell"]
    fordern(set(modell) == {"kennung", "bezeichnung", "prioritaet", "zustand"}, "Modellfelder abweichend")
    for regel in modell.values():
        fordern(regel["typ"] == "zeichenkette", "Unbekannter Feldtyp")
        if "muster" in regel:
            re.compile(regel["muster"])
    routen = {(route["method"], route["path"]) for route in vertrag["routes"]}
    fordern(len(routen) == len(vertrag["routes"]) == 4, "Vier eindeutige Routen erforderlich")
    fordern(routen == {("GET", "/auftraege"), ("GET", "/auftraege/:kennung"),
                       ("POST", "/auftraege"), ("PATCH", "/auftraege/:kennung")}, "Routenumfang abweichend")
    for route in vertrag["routes"]:
        fordern(set(route["required"]) == set(route["eingabefelder"]) <= modell.keys(), "Eingabefelder inkonsistent")
        fordern(route["rumpfErlaubt"] == bool(route["eingabefelder"]), "Rumpfregel inkonsistent")
        for kode in route["fehlercodes"]:
            fehler = vertrag["fehler"][str(kode)]
            fordern(set(fehler) == {"code", "meldung"} and all(isinstance(wert, str) and wert.strip()
                     for wert in fehler.values()), "Fehlerobjekt ungültig")
        for feld, wert in route.get("vorgaben", {}).items():
            fordern(feld_gueltig(wert, modell[feld]), "Vorgabewert ungültig")
    fordern(isinstance(auftraege, list) and len(auftraege) == konfiguration["expectedRecords"] == 2,
            "Genau zwei vorhandene Beispielaufträge erforderlich")
    kennungen = set()
    for auftrag in auftraege:
        fordern(set(auftrag) == set(modell), "Auftragsfelder abweichend")
        for feld, wert in auftrag.items():
            fordern(feld_gueltig(wert, modell[feld]), "Ungültiges Auftragsfeld: " + feld)
        fordern(auftrag["kennung"] not in kennungen, "Doppelte Auftragskennung")
        kennungen.add(auftrag["kennung"])
    ergebnisse = []
    fallnamen = set()
    for anfrage in anfragen:
        fordern(anfrage["fall"] not in fallnamen, "Doppelter Beispielname")
        fallnamen.add(anfrage["fall"])
        kode, grund = anfrage_einordnen(anfrage, vertrag, kennungen)
        ergebnisse.append({"fall": anfrage["fall"], "erwartet": anfrage["erwartet"],
                           "eingeordnet": kode, "bestanden": kode == anfrage["erwartet"], "grund": grund})
    fordern({eintrag["eingeordnet"] for eintrag in ergebnisse} == {200, 201, 400, 404}, "Fallgruppen fehlen")
    return {"auftraege": len(auftraege), "routen": len(routen), "anfragen": len(anfragen),
            "ergebnisse": ergebnisse, "bestanden": all(eintrag["bestanden"] for eintrag in ergebnisse)}


if __name__ == "__main__":
    beginn = datetime.now(timezone.utc)
    try:
        bericht = pruefen()
    except (ValueError, KeyError, TypeError, OSError) as fehler:
        bericht = {"bestanden": False, "fehler": str(fehler)}
    bericht.update({"projekt": "P04", "ticket": "P04-T01", "beginnUtc": beginn.isoformat(),
                    "endeUtc": datetime.now(timezone.utc).isoformat(), "python": sys.version,
                    "befehl": "uv run --offline --python 3.12 python -X utf8 pruefungen/vertrag_pruefen.py",
                    "grenze": "Lokale Vertragsprüfung; keine HTTP-Antworten, kein Java-/Angular-Lauf"})
    eingabepfade = ["vertraege/routes.json", "vertraege/anfragen.json", "beispieldaten/auftraege.json",
                    "projekt.json", "pruefungen/vertrag_pruefen.py"]
    bericht["sha256"] = {pfad: hashlib.sha256((projektordner / pfad).read_bytes()).hexdigest()
                          for pfad in eingabepfade}
    nachweis = projektordner / "nachweise/P04-T01-vertragspruefung.json"
    nachweis.parent.mkdir(exist_ok=True)
    nachweis.write_text(json.dumps(bericht, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(bericht, ensure_ascii=False, indent=2))
    sys.exit(0 if bericht["bestanden"] else 1)
