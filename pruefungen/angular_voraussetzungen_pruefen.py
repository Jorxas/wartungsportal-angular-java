"""Prüft nur die Voraussetzungen von P04-T03, keine Angular-Fachfunktion."""

from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys


def jetzt():
    return datetime.now(timezone.utc).isoformat()


def pruefen():
    projektordner = Path(__file__).resolve().parent.parent
    beginn = jetzt()
    befehle = []
    zwischenspeicher = projektordner / "ausgabe/npm-zwischenspeicher"
    protokolle = projektordner / "ausgabe/npm-protokolle"
    npm = shutil.which("npm.cmd") or shutil.which("npm")
    node = shutil.which("node")

    def ausfuehren(argumente):
        try:
            ergebnis = subprocess.run(
                argumente, cwd=projektordner, capture_output=True,
                encoding="utf-8", errors="replace", timeout=20,
            )
            eintrag = {"argumente": argumente, "rueckgabecode": ergebnis.returncode,
                       "ausgabe": ergebnis.stdout, "fehlerausgabe": ergebnis.stderr}
        except (OSError, subprocess.TimeoutExpired) as fehler:
            eintrag = {"argumente": argumente, "rueckgabecode": None,
                       "fehlerausgabe": str(fehler)}
        befehle.append(eintrag)
        return eintrag

    if node:
        ausfuehren([node, "--version"])
        ausfuehren([node, "-e", "for (const paket of ['@angular/cli', '@angular/core']) { try { console.log(paket + ': ' + require.resolve(paket)); } catch { console.log(paket + ': nicht aufloesbar'); process.exitCode = 1; } }"])
    if npm:
        ausfuehren([npm, "--version"])
        ausfuehren([npm, f"--cache={zwischenspeicher}", f"--logs-dir={protokolle}",
                    "--fetch-retries=0", "--fetch-timeout=10000", "view", "@angular/cli@21", "version", "--json"])

    beispieldatei = projektordner / "beispieldaten/auftraege.json"
    bericht = {
        "projekt": "P04", "ticket": "P04-T03", "beginn_utc": beginn,
        "ende_utc": jetzt(), "python": sys.version, "angular_cli_im_suchpfad": shutil.which("ng"),
        "befehle": befehle, "beispielanzahl": len(json.loads(beispieldatei.read_text(encoding="utf-8"))),
        "beispieldaten_sha256": hashlib.sha256(beispieldatei.read_bytes()).hexdigest(),
        "pruefskript_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "hinweis": "Nur Voraussetzungskontrolle; keine Angular-Ausführung oder fachliche Abnahme.",
    }
    ziel = projektordner / "nachweise/P04-T03-voraussetzungen.json"
    ziel.parent.mkdir(exist_ok=True)
    ziel.write_text(json.dumps(bericht, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Voraussetzungskontrolle dokumentiert: {ziel.relative_to(projektordner)}")
    # Dieser Prüfer bestätigt keine durchgeführte Angular-Abnahme.
    return 1 if not node or not npm or any(
        eintrag["rueckgabecode"] != 0 for eintrag in befehle
    ) else 0


if __name__ == "__main__":
    raise SystemExit(pruefen())
