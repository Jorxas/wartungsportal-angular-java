/** Echte Java-API und gebautes Angular im isolierten, fensterlosen Browser prüfen. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const { chromium } = require('playwright');
const projekt = path.resolve(__dirname, '..');
const nachweise = path.join(projekt, 'nachweise');
const protokoll = [], fehler = [];
let java, apiPort, browser, webserver;
const warten = ms => new Promise(erfuellt => setTimeout(erfuellt, ms));
async function api_starten() {
  const info = spawnSync('java', ['-XshowSettings:properties', '-version'], { encoding: 'utf8', windowsHide: true });
  const javaOrdner = info.stderr.match(/java.home = (.+)/)?.[1].trim();
  assert(javaOrdner, 'Direktes JDK nicht gefunden.');
  java = spawn(path.join(javaOrdner, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'),
    ['-Dfile.encoding=UTF-8', 'src/backend/Main.java', '0'], { cwd: projekt, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let ausgabe = '', diagnose = '';
  java.stdout.on('data', daten => { ausgabe += daten; });
  java.stderr.on('data', daten => { diagnose += daten; });
  for (let i = 0; i < 300; i++) {
    const port = ausgabe.match(/API bereit: http:\/\/127\.0\.0\.1:(\d+)/);
    if (port) { apiPort = Number(port[1]); return; }
    if (java.exitCode !== null) throw new Error('Java-Start fehlgeschlagen: ' + diagnose);
    await warten(100);
  }
  throw new Error('Java-Start hat kein Ergebnis geliefert.');
}
async function api_beenden() {
  if (!java || java.exitCode !== null || java.signalCode !== null) return;
  const beendet = once(java, 'exit');
  java.kill();
  await beendet;
}
function webserver_erstellen() {
  const bundle = path.join(projekt, 'ausgabe/oberflaeche/browser');
  assert(fs.existsSync(path.join(bundle, 'index.html')), 'Zuerst npm run bauen ausführen.');
  return http.createServer((anfrage, antwort) => {
    if (anfrage.url.startsWith('/api/')) {
      const teile = [];
      anfrage.on('data', daten => teile.push(daten));
      anfrage.on('end', () => {
        const rumpf = Buffer.concat(teile);
        const weiter = http.request({ host: '127.0.0.1', port: apiPort, path: anfrage.url.slice(4),
          method: anfrage.method, headers: { 'Content-Type': 'application/json; charset=utf-8' } }, quelle => {
          const daten = [];
          quelle.on('data', stueck => daten.push(stueck));
          quelle.on('end', () => {
            const inhalt = Buffer.concat(daten);
            protokoll.push({ zeit: new Date().toISOString(), methode: anfrage.method, pfad: anfrage.url,
              status: quelle.statusCode, eingabe: rumpf.toString('utf8'), antwort: inhalt.toString('utf8'), echt: true });
            // Eine echte Java-Antwort verzögern, ohne ihren Inhalt zu simulieren.
            setTimeout(() => { antwort.writeHead(quelle.statusCode, { 'Content-Type': 'application/json' }); antwort.end(inhalt); }, 600);
          });
        });
        weiter.on('error', () => {
          protokoll.push({ zeit: new Date().toISOString(), methode: anfrage.method, pfad: anfrage.url, status: 503,
            echt: false, grund: 'Tatsächlich beendete lokale Java-API nicht erreichbar.' });
          antwort.writeHead(503); antwort.end('Lokale API nicht erreichbar.');
        });
        weiter.end(rumpf);
      });
      return;
    }
    let relativ;
    try { relativ = decodeURIComponent(new URL(anfrage.url, 'http://localhost').pathname).slice(1); }
    catch { antwort.writeHead(400); antwort.end(); return; }
    const datei = path.resolve(bundle, relativ || 'index.html');
    if (!datei.startsWith(bundle + path.sep)) { antwort.writeHead(403); antwort.end(); return; }
    const ziel = fs.existsSync(datei) && fs.statSync(datei).isFile() ? datei : path.join(bundle, 'index.html');
    const typ = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }[path.extname(ziel)] || 'application/octet-stream';
    antwort.writeHead(200, { 'Content-Type': typ + '; charset=utf-8' }); antwort.end(fs.readFileSync(ziel));
  });
}
async function sichtbar(seite, text) { await seite.getByText(text, { exact: true }).waitFor(); }
async function pruefen() {
  await api_starten();
  webserver = webserver_erstellen();
  webserver.listen(0, '127.0.0.1');
  await once(webserver, 'listening');
  const adresse = 'http://127.0.0.1:' + webserver.address().port;
  browser = await chromium.launch({ headless: true });
  const kontext = await browser.newContext({ viewport: { width: 1200, height: 900 }, locale: 'de-DE' });
  const seite = await kontext.newPage();
  seite.on('pageerror', e => fehler.push(e.message));
  await seite.goto(adresse + '/auftraege');
  await sichtbar(seite, 'Aufträge werden geladen …');
  await seite.getByRole('link', { name: 'Details A02', exact: true }).waitFor();
  assert.equal(await seite.locator('tbody tr').count(), 2);
  await seite.screenshot({ path: path.join(nachweise, 'P04-T03-liste.png'), fullPage: true });
  await seite.keyboard.press('Tab');
  assert.equal(await seite.locator(':focus').innerText(), 'Neuer Auftrag');
  assert.notEqual(await seite.locator(':focus').evaluate(e => getComputedStyle(e).outlineStyle), 'none');
  await seite.keyboard.press('Enter');
  await sichtbar(seite, 'Neuer Wartungsauftrag');
  const bezeichnung = seite.getByLabel('Bezeichnung (Pflichtfeld)'), prioritaet = seite.getByLabel('Priorität (Pflichtfeld)');
  const speichern = seite.getByRole('button', { name: 'Auftrag anlegen', exact: true });
  await speichern.focus(); await seite.keyboard.press('Enter');
  await sichtbar(seite, 'Bitte eine Bezeichnung mit 1 bis 120 Zeichen eingeben.');
  await sichtbar(seite, 'Bitte eine Priorität auswählen.');
  assert.equal(await seite.locator(':focus').getAttribute('id'), 'bezeichnung');
  assert.equal(protokoll.filter(e => e.methode === 'POST').length, 0);
  for (const eingabe of ['   ', 'x'.repeat(121), '😀'.repeat(121)]) {
    await bezeichnung.fill(eingabe); await speichern.press('Enter');
    await sichtbar(seite, 'Bitte eine Bezeichnung mit 1 bis 120 Zeichen eingeben.');
    assert.equal(protokoll.filter(e => e.methode === 'POST').length, 0);
  }
  await bezeichnung.fill('Ventil prüfen'); await speichern.press('Enter');
  assert.equal(await seite.locator(':focus').getAttribute('id'), 'prioritaet');
  await seite.keyboard.press('h'); await seite.keyboard.press('Tab'); await seite.keyboard.press('Enter');
  await sichtbar(seite, 'Auftrag wird angelegt …');
  assert(await speichern.isDisabled());
  await sichtbar(seite, 'Auftrag A03'); await sichtbar(seite, 'Ventil prüfen');
  await sichtbar(seite, 'hoch'); await sichtbar(seite, 'offen');
  assert.equal(protokoll.filter(e => e.methode === 'POST' && e.status === 201).length, 1);
  await seite.screenshot({ path: path.join(nachweise, 'P04-T03-detail.png'), fullPage: true });
  await seite.getByRole('link', { name: 'Zur Liste', exact: true }).click();
  await seite.getByRole('link', { name: 'Details A03', exact: true }).waitFor();
  assert.equal(await seite.locator('tbody tr').count(), 3);
  await seite.goto(adresse + '/auftraege/A99');
  await sichtbar(seite, 'Der angefragte Auftrag wurde nicht gefunden.');
  await seite.reload(); await sichtbar(seite, 'Der angefragte Auftrag wurde nicht gefunden.');
  await seite.goto(adresse + '/auftraege/neu');
  await bezeichnung.fill('😀'.repeat(120)); await prioritaet.selectOption('normal'); await speichern.press('Enter');
  await sichtbar(seite, 'Auftrag A04');
  await seite.goto(adresse + '/auftraege/neu');
  await bezeichnung.fill('Eingabe erhalten'); await prioritaet.selectOption('normal');
  await api_beenden(); await speichern.press('Enter');
  await sichtbar(seite, 'Die Aufträge konnten nicht übertragen werden. Bitte die lokale API prüfen und erneut versuchen.');
  assert.equal(await bezeichnung.inputValue(), 'Eingabe erhalten');
  assert(await speichern.isEnabled());
  const fehlerseite = await kontext.newPage();
  await fehlerseite.goto(adresse + '/auftraege');
  await sichtbar(fehlerseite, 'Die Aufträge konnten nicht übertragen werden. Bitte die lokale API prüfen und erneut versuchen.');
  await fehlerseite.getByRole('button', { name: 'Erneut laden' }).waitFor();
  await fehlerseite.close();
  await seite.screenshot({ path: path.join(nachweise, 'P04-T03-api-fehler.png'), fullPage: true });
  await api_starten();
  assert.equal((await (await fetch(adresse + '/api/auftraege')).json()).length, 2);
  await speichern.press('Enter'); await sichtbar(seite, 'Auftrag A03');
  assert.equal(fehler.length, 0, 'Unerwartete JavaScript-Fehler: ' + fehler.join('; '));
  fs.writeFileSync(path.join(nachweise, 'P04-T03-browserabnahme.json'), JSON.stringify({ zeit: new Date().toISOString(),
    browser: browser.version(), playwright: require('playwright/package.json').version,
    ergebnis: 'bestanden', echteJavaApiMitEigenemPort: true, frontend: 'Tatsächlich gebautes Angular-Bundle mit lokalem Prüfproxy',
    pruefungen: ['Liste/Detail/Formular', 'Tab/Enter und sichtbarer Fokus', 'Pflichtfelder/Leerraum/121 Zeichen/120 Unicode-Codepunkte',
      'Echte GET-/POST-Aufrufe', 'Laden und Doppelsendesperre', '404 und Neuladen', 'API wirklich beenden/neustarten; Eingabe behalten'],
    http: protokoll, grenze: 'Kein menschliches Nutzerfeedback und keine umfassende Barrierefreiheitsprüfung. Flüchtige API; keine Zustandsänderung in T03.' }, null, 2) + '\n');
  console.log('BESTANDEN: echte Angular-/Java-Browserabnahme, Tastatur, Eingaben, HTTP, Laden und API-Ausfall.');
}
pruefen().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (webserver) { webserver.closeAllConnections(); await new Promise(erfuellt => webserver.close(erfuellt)); }
  await api_beenden();
});
