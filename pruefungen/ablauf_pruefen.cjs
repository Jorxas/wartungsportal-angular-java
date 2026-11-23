/** T04: regulärer Angular-Entwicklungsserver, echte Java-API und Tastaturablauf. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const { chromium } = require('playwright');
const projekt = path.resolve(__dirname, '..');
const bericht = { projekt: 'P04', ticket: 'P04-T04', beginnUtc: new Date().toISOString(),
  bestanden: false, http: [], bedienpruefungen: [], prozesse: [], javascriptFehler: [] };
const beispielpfad = 'beispieldaten/auftraege.json';
const hash = datei => require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(projekt, datei))).digest('hex');
const beispielhash = hash(beispielpfad);
const warten = ms => new Promise(erfuellt => setTimeout(erfuellt, ms));
let java, angular, browser, apiAdresse;

function starten(programm, argumente, name) {
  const prozess = spawn(programm, argumente, { cwd: projekt, windowsHide: true,
    env: { ...process.env, NG_CLI_ANALYTICS: 'false', NO_COLOR: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const eintrag = { name, programm, argumente, pid: prozess.pid, ausgabe: '', fehlerausgabe: '' };
  bericht.prozesse.push(eintrag);
  prozess.stdout.on('data', daten => { eintrag.ausgabe += daten; });
  prozess.stderr.on('data', daten => { eintrag.fehlerausgabe += daten; });
  prozess.on('error', fehler => { eintrag.startfehler = fehler.message; });
  return { prozess, eintrag };
}
async function adresseLesen(lauf, muster) {
  for (let versuch = 0; versuch < 600; versuch++) {
    const treffer = lauf.eintrag.ausgabe.match(muster);
    if (treffer) return treffer[1];
    assert(!lauf.eintrag.startfehler && lauf.prozess.exitCode === null, JSON.stringify(lauf.eintrag));
    await warten(100);
  }
  throw new Error('Serverstart ohne Adresse: ' + JSON.stringify(lauf.eintrag));
}
async function beenden(lauf) {
  if (!lauf || lauf.prozess.exitCode !== null || lauf.prozess.signalCode !== null) return;
  const ende = once(lauf.prozess, 'exit');
  lauf.prozess.kill();
  await ende;
  lauf.eintrag.durchPrueferBeendet = true;
}
async function anfragen(methode, pfad, rumpf, erwartet) {
  const antwort = await fetch(apiAdresse + pfad, { method: methode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: rumpf });
  const inhalt = await antwort.json();
  bericht.http.push({ quelle: 'Direkt an echte Java-API', methode, pfad, rumpf, erwartet,
    status: antwort.status, antwort: inhalt });
  assert.equal(antwort.status, erwartet);
  return inhalt;
}
async function sichtbar(seite, text) { await seite.getByText(text, { exact: true }).waitFor(); }

async function pruefen() {
  const info = spawnSync('java', ['-XshowSettings:properties', '-version'], { encoding: 'utf8', windowsHide: true });
  const javaOrdner = info.stderr.match(/java.home = (.+)/)?.[1].trim();
  assert(javaOrdner, 'JDK nicht gefunden.');
  bericht.java = info.stderr.match(/java version[^\r\n]*/)?.[0];
  bericht.node = process.version;
  bericht.angular = require('@angular/core/package.json').version;
  bericht.playwright = require('playwright/package.json').version;
  java = starten(path.join(javaOrdner, 'bin/java.exe'), ['-Dfile.encoding=UTF-8', 'src/backend/Main.java', '0'], 'Java-API');
  apiAdresse = await adresseLesen(java, /API bereit: (http:\/\/127\.0\.0\.1:\d+)/);
  const beispiele = JSON.parse(fs.readFileSync(path.join(projekt, beispielpfad), 'utf8'));
  assert.equal(beispiele.length, 2);
  assert.deepEqual(await anfragen('GET', '/auftraege', undefined, 200), beispiele);
  // Alle neun bereits entworfenen PATCH-Vertragsfälle tatsächlich ausführen.
  const faelle = JSON.parse(fs.readFileSync(path.join(projekt, 'vertraege/anfragen.json'), 'utf8'));
  for (const fall of faelle.filter(fall => fall.methode === 'PATCH')) {
    const vorher = await anfragen('GET', '/auftraege', undefined, 200);
    const antwort = await anfragen('PATCH', fall.pfad, fall.rumpf, fall.erwartet);
    const erwartet = structuredClone(vorher);
    if (fall.erwartet === 200) {
      const auftrag = erwartet.find(auftrag => '/auftraege/' + auftrag.kennung === fall.pfad);
      auftrag.zustand = JSON.parse(fall.rumpf).zustand;
      assert.deepEqual(antwort, auftrag);
    } else assert.deepEqual(Object.keys(antwort).sort(), ['code', 'meldung']);
    assert.deepEqual(await anfragen('GET', '/auftraege', undefined, 200), erwartet);
  }
  // Teständerungen nur im Arbeitsspeicher zurücksetzen.
  await anfragen('PATCH', '/auftraege/A01', '{"zustand":"offen"}', 200);
  await anfragen('PATCH', '/auftraege/A02', '{"zustand":"erledigt"}', 200);
  const proxy = JSON.parse(fs.readFileSync(path.join(projekt, 'src/frontend/proxy.json'), 'utf8'));
  proxy['/api/**'].target = apiAdresse;
  fs.mkdirSync(path.join(projekt, 'ausgabe'), { recursive: true });
  fs.writeFileSync(path.join(projekt, 'ausgabe/P04-T04-proxy.json'), JSON.stringify(proxy));
  angular = starten(process.execPath, ['node_modules/@angular/cli/bin/ng.js', 'serve', '--host', '127.0.0.1',
    '--port', '0', '--proxy-config', 'ausgabe/P04-T04-proxy.json'], 'Angular-Entwicklungsserver');
  const adresse = await adresseLesen(angular, /Local:\s+(http:\/\/127\.0\.0\.1:\d+)/);
  bericht.frontend = { adresse, apiAdresse, proxy: 'Originalkonfiguration; nur Zielport durch freien Java-Port ersetzt.' };
  browser = await chromium.launch({ headless: true });
  bericht.browser = browser.version();
  const seite = await browser.newPage({ viewport: { width: 1100, height: 850 }, locale: 'de-DE' });
  seite.on('pageerror', fehler => bericht.javascriptFehler.push(fehler.message));
  const antworten = [];
  seite.on('response', antwort => {
    if (antwort.url().includes('/api/')) antworten.push((async () => {
      const anfrage = antwort.request();
      bericht.http.push({ quelle: 'Echtes Angular über Entwicklungsproxy an Java', methode: anfrage.method(),
        pfad: new URL(antwort.url()).pathname, rumpf: anfrage.postData(), status: antwort.status(), antwort: await antwort.text() });
    })());
  });
  await seite.goto(adresse + '/auftraege');
  await seite.getByRole('link', { name: 'Details A02', exact: true }).waitFor();
  assert.equal(await seite.locator('tbody tr').count(), 2);
  await seite.keyboard.press('Tab');
  assert.equal(await seite.locator(':focus').innerText(), 'Neuer Auftrag');
  await seite.keyboard.press('Enter');
  await sichtbar(seite, 'Neuer Wartungsauftrag');
  const bezeichnung = seite.getByLabel('Bezeichnung (Pflichtfeld)');
  const prioritaet = seite.getByLabel('Priorität (Pflichtfeld)');
  await seite.getByRole('button', { name: 'Auftrag anlegen', exact: true }).press('Enter');
  await sichtbar(seite, 'Bitte eine Bezeichnung mit 1 bis 120 Zeichen eingeben.');
  assert.equal(await seite.locator(':focus').getAttribute('id'), 'bezeichnung');
  assert.equal(await bezeichnung.getAttribute('aria-invalid'), 'true');
  const beschreibung = await bezeichnung.getAttribute('aria-describedby');
  assert(beschreibung?.split(' ').includes('bezeichnung-fehler'));
  assert(await seite.locator('#bezeichnung-fehler').isVisible());
  assert.equal(await prioritaet.getAttribute('aria-describedby'), 'prioritaet-fehler');
  await bezeichnung.pressSequentially('Ventil pruefen');
  await seite.keyboard.press('Tab');
  assert.equal(await seite.locator(':focus').getAttribute('id'), 'prioritaet');
  await prioritaet.press('h');
  await seite.keyboard.press('Tab');
  await seite.keyboard.press('Enter');
  await sichtbar(seite, 'Auftrag A03');
  await sichtbar(seite, 'offen');
  const erledigen = seite.getByRole('button', { name: 'Als erledigt markieren', exact: true });
  // Dokumentbeginn -> Listenlink -> Zustandsknopf, vollständig mit Tastatur.
  await seite.reload();
  await erledigen.waitFor();
  await seite.keyboard.press('Tab');
  assert.equal(await seite.locator(':focus').innerText(), 'Zur Liste');
  await seite.keyboard.press('Tab');
  assert.equal(await seite.locator(':focus').innerText(), 'Als erledigt markieren');
  assert.notEqual(await seite.locator(':focus').evaluate(element => getComputedStyle(element).outlineStyle), 'none');
  // Nur die Weiterleitung der echten Anfrage anhalten, keine Antwort simulieren.
  let freigeben;
  const freigabe = new Promise(erfuellt => { freigeben = erfuellt; });
  await seite.route('**/api/auftraege/A03', async route => {
    if (route.request().method() === 'PATCH') await freigabe;
    await route.continue();
  });
  await seite.keyboard.press('Enter');
  await sichtbar(seite, 'Zustand wird gespeichert …');
  assert(await erledigen.isDisabled());
  freigeben();
  await sichtbar(seite, 'Zustand gespeichert: erledigt.');
  await seite.unroute('**/api/auftraege/A03');
  assert.equal(await seite.getByRole('status').innerText(), 'Zustand gespeichert: erledigt.');
  assert.equal(await seite.locator(':focus').innerText(), 'Wieder öffnen');
  await seite.screenshot({ path: path.join(projekt, 'nachweise/P04-T04-erledigt.png'), fullPage: true });
  await seite.reload();
  await sichtbar(seite, 'erledigt');
  await seite.getByRole('link', { name: 'Zur Liste', exact: true }).press('Enter');
  await seite.getByRole('link', { name: 'Details A03', exact: true }).waitFor();
  assert.match(await seite.locator('tr').filter({ hasText: 'A03' }).innerText(), /erledigt/);
  await seite.getByRole('link', { name: 'Details A03', exact: true }).press('Enter');
  await seite.getByRole('button', { name: 'Wieder öffnen', exact: true }).press('Enter');
  await sichtbar(seite, 'Zustand gespeichert: offen.');
  await seite.goto(adresse + '/auftraege/A99');
  await sichtbar(seite, 'Der angefragte Auftrag wurde nicht gefunden.');
  assert.equal(await seite.getByRole('alert').innerText(), 'Der angefragte Auftrag wurde nicht gefunden.');
  await seite.goto(adresse + '/auftraege/A03');
  await erledigen.waitFor();
  await beenden(java);
  await erledigen.press('Enter');
  await seite.getByRole('alert').waitFor();
  assert.match(await seite.getByRole('alert').innerText(), /Der Zustand konnte nicht gespeichert werden/);
  await sichtbar(seite, 'offen');
  assert(await erledigen.isEnabled());
  await seite.screenshot({ path: path.join(projekt, 'nachweise/P04-T04-zustandsfehler.png'), fullPage: true });
  await Promise.all(antworten);
  assert.equal(bericht.javascriptFehler.length, 0);
  assert(bericht.http.some(eintrag => eintrag.quelle.startsWith('Echtes Angular') && eintrag.methode === 'PATCH' && eintrag.status === 200));
  assert(bericht.http.some(eintrag => eintrag.methode === 'POST' && eintrag.status === 201));
  assert.equal(hash(beispielpfad), beispielhash);
  bericht.beispieldatensaetze = 2;
  bericht.beispielSha256 = beispielhash;
  bericht.bedienpruefungen = ['Liste mit zwei Originalaufträgen', 'Leeres Formular: Fehler, Beschriftung, aria-invalid, Fehlerverknüpfung und Fokus',
    'Auftrag A03 per Tastatur erstellt: echtes POST 201', 'Tab/Enter, sichtbarer Fokus, PATCH 200 und Statusmeldung',
    'Erledigt nach Neuladen und in Liste; wieder öffnen', 'Unbekannter Auftrag: echtes 404 mit alert',
    'Java wirklich beendet: PATCH scheitert, Zustand bleibt offen, Knopf wieder bedienbar'];
  bericht.nutzerfeedback = 'In den vorhandenen Projektdokumenten kein echtes Nutzerfeedback vorgefunden; automatisierte Prüfung ist kein Nutzerfeedback.';
  bericht.grenzen = 'Lokale Einzelbenutzung, flüchtiger Speicher, kein Spring. Gezielte Tastatur-/Semantikprüfung, keine umfassende Barrierefreiheitsprüfung.';
  bericht.bestanden = true;
}
pruefen().catch(fehler => { bericht.fehler = fehler.stack; process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  await beenden(angular);
  await beenden(java);
  bericht.endeUtc = new Date().toISOString();
  const dateien = ['pruefungen/ablauf_pruefen.cjs', 'src/backend/Main.java', 'src/frontend/main.ts', 'src/frontend/detail.ts',
    'src/frontend/auftragsdienst.ts', 'src/frontend/fachmodell.ts', 'src/frontend/formular.ts', 'src/frontend/liste.ts',
    'src/frontend/routen.ts', 'src/frontend/index.html', 'src/frontend/gestaltung.css', 'src/frontend/proxy.json',
    'angular.json', 'tsconfig.json', 'package.json', 'package-lock.json', beispielpfad, 'vertraege/anfragen.json'];
  bericht.sha256 = Object.fromEntries(dateien.map(datei => [datei, hash(datei)]));
  fs.writeFileSync(path.join(projekt, 'nachweise/P04-T04-ablauf.json'), JSON.stringify(bericht, null, 2) + '\n');
  console.log(JSON.stringify({ bestanden: bericht.bestanden, httpAnfragen: bericht.http.length, fehler: bericht.fehler,
    beginnUtc: bericht.beginnUtc, endeUtc: bericht.endeUtc }, null, 2));
});
