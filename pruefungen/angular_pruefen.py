"""Prüft den Angular-Quellstand von P04-T03 ohne Browser oder Installation."""

from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys


projektordner = Path(__file__).resolve().parents[1]
beginn = datetime.now(timezone.utc).isoformat()
quellen = [
    "package.json", "package-lock.json", "angular.json", "tsconfig.json", "projekt.json",
    "src/backend/Main.java", "beispieldaten/auftraege.json",
    "src/frontend/index.html", "src/frontend/gestaltung.css", "src/frontend/proxy.json",
    *[pfad.relative_to(projektordner).as_posix()
      for pfad in sorted((projektordner / "src/frontend").glob("*.ts"))],
    "pruefungen/angular_pruefen.py",
]
befehle = [
    ["node", "--version"],
    ["node", "node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js", "--noEmit"],
]
ergebnisse = []
for befehl in befehle:
    try:
        lauf = subprocess.run(befehl, cwd=projektordner, capture_output=True,
                              text=True, encoding="utf-8", errors="replace", timeout=60)
        ergebnisse.append({"befehl": befehl, "rueckgabecode": lauf.returncode,
                           "ausgabe": lauf.stdout, "fehlerausgabe": lauf.stderr})
    except (OSError, subprocess.TimeoutExpired) as fehler:
        ergebnisse.append({"befehl": befehl, "rueckgabecode": 1, "fehler": str(fehler)})

beispielpfad = projektordner / "beispieldaten/auftraege.json"
beispielhash = hashlib.sha256(beispielpfad.read_bytes()).hexdigest()
beispiele_unveraendert = (
    beispielhash == "1d640936640360cefa05900f32af7a98cd230050a194685a892af919abdc06b0"
    and len(json.loads(beispielpfad.read_text(encoding="utf-8"))) == 2
)
bestanden = all(lauf["rueckgabecode"] == 0 for lauf in ergebnisse) and beispiele_unveraendert
bericht = {
    "ticket": "P04-T03", "beginnUtc": beginn,
    "endeUtc": datetime.now(timezone.utc).isoformat(),
    "python": sys.version, "befehle": ergebnisse,
    "zweiBeispieleUnveraendert": beispiele_unveraendert,
    "kompilierungBestanden": bestanden,
    "grenze": "Nur TypeScript und Angular-Templates ohne Ausgabe kompiliert. Kein Bundle, Browser, HTTP- oder Tastaturtest.",
    "pakete": {name: json.loads((projektordner / "node_modules" / name / "package.json").read_text(encoding="utf-8"))["version"]
               for name in ["@angular/core", "@angular/compiler-cli", "@angular/cli", "@angular/build", "typescript", "rxjs"]},
    "quellenSha256": {pfad: hashlib.sha256((projektordner / pfad).read_bytes()).hexdigest()
                      for pfad in quellen},
}
ziel = projektordner / "nachweise/P04-T03-kompilierung.json"
ziel.write_text(json.dumps(bericht, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Angular-Kompilierung: " + ("bestanden" if bestanden else "fehlgeschlagen"))
print("Bericht: nachweise/P04-T03-kompilierung.json")
sys.exit(0 if bestanden else 1)
