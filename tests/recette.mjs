// Recette automatique sur le site en ligne – MIMOUNI INDUSTRIEL ÉLECTRICITÉ
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const B = process.env.BASE || 'https://app--mimouni-industriel-electricite.netlify.app';
const CAP = '/workspace/mimouni/captures/';
const PW = fs.readFileSync('/workspace/mimouni/secrets/acces-admin.txt', 'utf8').match(/Mot de passe : (\S+)/)[1];
const results = [];
const ok = (name, cond, detail = '') => { results.push({ name, ok: !!cond, detail }); console.log((cond ? '✅' : '❌') + ' ' + name + (detail ? ' – ' + detail : '')); };
const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date(); const plus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
async function api(method, path, body, token) {
  const r = await fetch(B + '/api/' + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, body: j };
}
const T = {}; // ids
const TPW = 'Test-' + Math.random().toString(36).slice(2, 12) + 'Aa9';

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
const iphone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris', acceptDownloads: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' };
const errors = [];

async function login(page, user, pw) {
  await page.goto(B + '/', { waitUntil: 'networkidle' });
  await page.fill('#login-form input[name=login]', user);
  await page.fill('#login-form input[name=password]', pw);
  await page.click('#login-form button[type=submit]');
  await page.waitForSelector('#view', { timeout: 20000 });
  await page.waitForTimeout(800);
}
async function fillModal(page, vals) {
  await page.waitForSelector('.modal form');
  for (const [k, v] of Object.entries(vals)) {
    const el = page.locator(`.modal [name="${k}"]`).first();
    const tag = await el.evaluate((e) => e.tagName + ':' + (e.type || ''));
    if (tag.startsWith('SELECT')) await el.selectOption(String(v));
    else if (tag.endsWith('checkbox')) { for (const val of v) await page.check(`.modal input[name="${k}"][value="${val}"]`); }
    else if (tag.endsWith('file')) await el.setInputFiles(v);
    else await el.fill(String(v));
  }
}
const submitModal = async (page) => { await page.click('.modal button[type=submit]'); await page.waitForSelector('.modal', { state: 'detached', timeout: 20000 }); await page.waitForTimeout(900); };

try {
  // ---------- 1. Connexion admin (ordinateur) ----------
  const pa = await desk.newPage(); pa.on('pageerror', (e) => errors.push('admin: ' + e.message));
  await pa.goto(B + '/', { waitUntil: 'networkidle' });
  await pa.screenshot({ path: CAP + '01-connexion-ordinateur.png' });
  await login(pa, 'admin', PW);
  ok('Connexion admin', await pa.locator('h1:has-text("Tableau de bord")').count());
  const adminTok = await pa.evaluate(() => localStorage.getItem('mimouni_token'));

  // ---------- 2. Technicien + habilitation qui expire (UI) ----------
  await pa.goto(B + '/#/techniciens'); await pa.waitForTimeout(600);
  await pa.click('#new-t');
  await fillModal(pa, { firstName: 'TEST', lastName: 'Technicien Un', position: 'Électricien industriel', skills: 'Câblage armoire, HTA/BT' });
  await submitModal(pa);
  T.t1 = pa.url().split('/').pop();
  await pa.click('#add-hab');
  await fillModal(pa, { kind: 'Électrique (NF C 18-510)', symbol: 'B2V BR', issued: plus(-1000), expires: plus(20), org: 'Organisme TEST' });
  await submitModal(pa);
  const habTxt = await pa.locator('.card:has(h2:has-text("Habilitations"))').innerText();
  ok('Technicien créé + habilitation qui expire (alerte rouge J-30)', /Expire dans 20 j/.test(habTxt), habTxt.split('\n').find((l) => /Expire/.test(l)));
  await pa.screenshot({ path: CAP + '02-technicien-habilitation.png', fullPage: true });
  const t2 = await api('POST', 'technicians', { firstName: 'TEST', lastName: 'Technicien Deux', position: 'Automaticien' }, adminTok); T.t2 = t2.body.id;
  const t3 = await api('POST', 'technicians', { firstName: 'TEST', lastName: 'Technicien Trois' }, adminTok); T.t3 = t3.body.id;
  await api('POST', `technicians/${T.t2}/habilitations`, { kind: 'CACES', symbol: 'R486 B', expires: plus(50) }, adminTok);
  // comptes
  for (const u of [{ login: 'test.chef1', name: 'TEST Chef Un', role: 'chef' }, { login: 'test.chef2', name: 'TEST Chef Deux', role: 'chef' }, { login: 'test.tech1', name: 'TEST Technicien Un', role: 'technicien', technicianId: T.t1 }]) {
    const r = await api('POST', 'users', { ...u, password: TPW }, adminTok); if (r.status !== 200) throw new Error('user ' + JSON.stringify(r.body));
  }
  await pa.reload({ waitUntil: 'networkidle' }); await pa.waitForTimeout(600);

  // ---------- 3. Chantier + tâches + avancement (UI) ----------
  await pa.goto(B + '/#/chantiers'); await pa.waitForTimeout(500);
  await pa.click('#new-ch');
  await fillModal(pa, { name: 'TEST Chantier A', client: 'Client TEST', address: 'Adresse TEST', chefId: 'test.chef1', start: plus(-14), endPlanned: plus(20), status: 'En cours', team: [T.t1, T.t2] });
  await submitModal(pa);
  T.cA = pa.url().split('/').pop();
  for (const [title, hours] of [['TEST Tâche 10 h', 10], ['TEST Tâche 20 h', 20], ['TEST Tâche 70 h', 70]]) {
    await pa.click('#new-task');
    await fillModal(pa, { title, plannedHours: hours, end: plus(10), assignee: T.t1 });
    await submitModal(pa);
  }
  for (const [title, done] of [['TEST Tâche 10 h', 12], ['TEST Tâche 20 h', 18]]) {
    await pa.locator(`tr:has-text("${title}") [data-task]`).click();
    await fillModal(pa, { status: 'Terminée', doneHours: done });
    await submitModal(pa);
  }
  await pa.locator('tr:has-text("TEST Tâche 70 h") [data-task]').click();
  await fillModal(pa, { status: 'En cours', doneHours: 5 }); await submitModal(pa);
  const pct = await pa.locator('.kpi:has-text("Avancement") .v').innerText();
  const estim = await pa.locator('.estim').innerText();
  ok('Chantier + 3 tâches (10 h, 20 h, 70 h), 2 terminées → avancement 30 %', pct.trim() === '30 %', 'affiché : ' + pct.trim() + ' | ' + estim.replace(/\n/g, ' '));
  ok('Date de fin libellée « Estimation »', /Estimation/i.test(estim));
  await pa.screenshot({ path: CAP + '03-chantier-avancement.png', fullPage: true });
  const cB = await api('POST', 'chantiers', { name: 'TEST Chantier B (autre chef)', chefId: 'test.chef2', start: plus(-3), endPlanned: plus(30), status: 'En cours', team: [T.t3, T.t1] }, adminTok); T.cB = cB.body.id;

  // ---------- 4. Planning avec conflit ----------
  await pa.goto(B + '/#/planning'); await pa.waitForTimeout(600);
  await pa.click('#new-as');
  await fillModal(pa, { techId: T.t1, chantierId: T.cA, date: iso(today), slot: 'journée' }); await submitModal(pa);
  await pa.click('#new-as');
  await fillModal(pa, { techId: T.t1, chantierId: T.cB, date: iso(today), slot: 'matin' });
  await pa.click('.modal button[type=submit]');
  await pa.waitForSelector('.toast:has-text("conflit")', { timeout: 15000 });
  const toastTxt = await pa.locator('.toast').innerText();
  await pa.waitForTimeout(1200);
  const conflictCells = await pa.locator('td.conflict').count();
  ok('Planning : double affectation détectée (alerte + case rouge)', conflictCells > 0 && /conflit/i.test(toastTxt), toastTxt);
  await pa.screenshot({ path: CAP + '04-planning-conflit.png', fullPage: true });

  // ---------- 5. Équipement + QR + étiquette (UI) ----------
  await pa.goto(B + '/#/materiel'); await pa.waitForTimeout(500);
  await pa.click('#new-eq');
  await fillModal(pa, { name: 'TEST Armoire de commande A1', type: 'Armoire', brand: 'Marque TEST', chantierId: T.cA, location: 'Local TEST' });
  await submitModal(pa);
  T.eq = pa.url().split('/').pop();
  const qrOk = await pa.locator('#label-prev svg').count();
  ok('Équipement créé avec identifiant permanent + QR code', /^EQ-[A-Z0-9]{6}$/.test(T.eq) && qrOk > 0, T.eq);
  await pa.screenshot({ path: CAP + '05-equipement-qr-etiquette.png', fullPage: true });
  // étiquette réelle 50×30 mm, rendue nette pour la lecture
  await pa.evaluate(() => { document.querySelector('#label-prev').style.transform = 'none'; });
  await pa.locator('#label-prev .label').screenshot({ path: CAP + '05b-etiquette-50x30.png', scale: 'device' });
  const big = await desk.newPage(); await big.setViewportSize({ width: 800, height: 600 });
  await big.setContent(`<div style="padding:30px;background:#fff">${await pa.locator('#label-prev').innerHTML()}</div><style>${fs.readFileSync('/workspace/mimouni/app/public/app.css', 'utf8')}</style><style>.label{transform:scale(3);transform-origin:top left}</style>`);
  await big.screenshot({ path: '/workspace/mimouni/tests/etiquette-x3.png' }); await big.close();
  // impression : page au format 50×30 mm
  await pa.evaluate((id) => { const e = S.data.equipment.find((x) => x.id === id); document.querySelector('#print-area').innerHTML = labelHTML(e); }, T.eq).catch(() => {});
  await pa.emulateMedia({ media: 'print' });
  await pa.pdf({ path: CAP + '05c-etiquette-impression.pdf', width: '50mm', height: '30mm', printBackground: true }).catch((e) => errors.push('pdf etiquette ' + e.message));
  await pa.emulateMedia({ media: 'screen' });
  ok('Étiquette imprimable 50 × 30 mm générée', fs.existsSync(CAP + '05c-etiquette-impression.pdf'));

  // maladie pour technicien Deux
  const ab = await api('POST', 'absences', { techId: T.t2, type: 'maladie', start: iso(today), end: plus(2), motif: 'Grippe TEST confidentielle' }, adminTok); T.ab = ab.body.id;

  // ---------- 6. Droits côté serveur ----------
  const tech = (await api('POST', 'login', { login: 'test.tech1', password: TPW })).body.token;
  const chef1 = (await api('POST', 'login', { login: 'test.chef1', password: TPW })).body.token;
  const r1 = await api('POST', 'equipment', { name: 'Pirate' }, tech);
  ok('API : technicien ne peut PAS créer d\'équipement', r1.status === 403, 'HTTP ' + r1.status + ' ' + (r1.body && r1.body.error));
  const r2 = await api('DELETE', `equipment/${T.eq}/history/x`, null, tech);
  const r3 = await api('DELETE', `history/x`, null, tech);
  const r3b = await api('DELETE', `equipment/${T.eq}`, null, tech);
  ok('API : technicien ne peut PAS supprimer l\'historique', r2.status === 403 && r3.status === 403 && r3b.status === 403, `HTTP ${r2.status}/${r3.status}/${r3b.status}`);
  const r4 = await api('POST', `equipment/${T.eq}/label`, null, tech);
  ok('API : technicien ne peut PAS imprimer d\'étiquette', r4.status === 403, 'HTTP ' + r4.status);
  const r5 = await api('GET', 'bootstrap', null);
  ok('API : appel sans connexion refusé', r5.status === 401, 'HTTP ' + r5.status);
  const bc = (await api('GET', 'bootstrap', null, chef1)).body;
  const r6 = await api('GET', `chantiers/${T.cB}/notes`, null, chef1);
  ok('API : chef ne voit pas le chantier d\'un autre chef', !bc.chantiers.some((c) => c.id === T.cB) && bc.chantiers.some((c) => c.id === T.cA) && r6.status === 403, `chantiers visibles : ${bc.chantiers.map((c) => c.name).join(', ')} | accès direct HTTP ${r6.status}`);
  const abs = bc.absences.find((a) => a.id === T.ab);
  ok('API : motif maladie invisible pour le chef', abs && abs.type === 'absence' && !abs.motif && !JSON.stringify(bc).includes('Grippe'), JSON.stringify(abs && { type: abs.type, motif: abs.motif }));
  const r7 = await api('POST', 'users', { login: 'pirate', role: 'chef', password: 'xxxxxxxxxxxx' }, chef1);
  ok('API : chef ne peut pas créer de compte', r7.status === 403, 'HTTP ' + r7.status);

  // ---------- 7. Chef sur iPhone ----------
  const cctx = await browser.newContext(iphone); const pc = await cctx.newPage(); pc.on('pageerror', (e) => errors.push('chef: ' + e.message));
  await login(pc, 'test.chef1', TPW);
  await pc.screenshot({ path: CAP + '06-chef-tableau-de-bord-mobile.png', fullPage: true });
  await pc.goto(B + '/#/chantiers'); await pc.waitForTimeout(700);
  const chefCh = await pc.locator('main').innerText();
  ok('Écran chef : seulement ses chantiers', chefCh.includes('TEST Chantier A') && !chefCh.includes('TEST Chantier B'));
  await pc.goto(B + '/#/absences'); await pc.waitForTimeout(700);
  const chefAbs = await pc.locator('main').innerText();
  ok('Écran chef : maladie affichée « Absent », motif masqué', chefAbs.includes('Absent') && !/Maladie|Grippe/.test(chefAbs));
  await pc.screenshot({ path: CAP + '07-chef-absences-mobile.png', fullPage: true });
  await cctx.close();

  // ---------- 8. Technicien sur iPhone : scanner, hors ligne, correction ----------
  const tctx = await browser.newContext(iphone); const pt = await tctx.newPage(); pt.on('pageerror', (e) => errors.push('tech: ' + e.message));
  await login(pt, 'test.tech1', TPW);
  await pt.screenshot({ path: CAP + '08-technicien-mon-activite-mobile.png', fullPage: true });
  await pt.click('.bottomnav a.scan'); await pt.waitForTimeout(800);
  await pt.screenshot({ path: CAP + '09-scanner-mobile.png' });
  // lecture du QR depuis une photo de l'étiquette
  await pt.setInputFiles('#qr-file', '/workspace/mimouni/tests/etiquette-x3.png');
  await pt.waitForFunction((id) => location.hash === '#/equipement/' + id, T.eq, { timeout: 15000 }).catch(() => {});
  ok('Scanner : le QR de l\'étiquette est lu et ouvre la fiche', (await pt.evaluate(() => location.hash)) === '#/equipement/' + T.eq, await pt.evaluate(() => location.hash));
  if (!(await pt.evaluate(() => location.hash)).includes(T.eq)) { await pt.goto(B + '/#/equipement/' + T.eq); }
  await pt.waitForSelector('#add-int'); await pt.waitForTimeout(600);
  ok('Écran technicien : aucun bouton Modifier / Imprimer / Supprimer', (await pt.locator('#edit-eq, #print-eq, button:has-text("Supprimer")').count()) === 0);
  await pt.goto(B + '/#/materiel'); await pt.waitForTimeout(500);
  ok('Écran technicien : pas de bouton « Nouvel équipement »', (await pt.locator('#new-eq').count()) === 0);
  await pt.goto(B + '/#/equipement/' + T.eq); await pt.waitForSelector('#add-int'); await pt.waitForTimeout(800);
  // hors ligne
  await tctx.setOffline(true); await pt.waitForTimeout(500);
  await pt.click('#add-int');
  await fillModal(pt, { type: 'intervention', content: 'TEST Resserrage des bornes (saisi hors ligne)', duration: '1.5', photos: '/workspace/mimouni/tests/photo-test.jpg' });
  await pt.click('.modal button[type=submit]'); await pt.waitForSelector('.modal', { state: 'detached' }); await pt.waitForTimeout(1200);
  const badge = await pt.locator('#sync-badge').innerText();
  const net = await pt.locator('#net-label').innerText();
  ok('Hors ligne : intervention gardée sur l\'appareil (« 1 en attente »)', /1 en attente/.test(badge) && /Hors ligne/.test(net), badge + ' / ' + net);
  await pt.screenshot({ path: CAP + '10-hors-ligne-en-attente-mobile.png', fullPage: true });
  await tctx.setOffline(false);
  await pt.waitForSelector('.modal:has-text("Connexion rétablie")', { timeout: 15000 });
  const syncTxt = await pt.locator('.modal').innerText();
  ok('Retour du réseau : confirmation demandée AVANT envoi', /1 élément en attente/.test(syncTxt) && /Envoyer maintenant/.test(syncTxt), syncTxt.replace(/\n/g, ' ').slice(0, 120));
  await pt.screenshot({ path: CAP + '11-confirmation-envoi-mobile.png' });
  await pt.click('.modal [data-act=send]');
  await pt.waitForSelector('.toast:has-text("Envoyé et sauvegardé")', { timeout: 20000 });
  await pt.waitForTimeout(1500); await pt.goto(B + '/#/equipement/' + T.eq); await pt.waitForTimeout(1500);
  await pt.waitForFunction(() => [...document.querySelectorAll('.timeline img[data-photo]')].some((i) => i.naturalWidth > 10), null, { timeout: 15000 }).catch(() => {});
  const photoLoaded = await pt.evaluate(() => [...document.querySelectorAll('.timeline img[data-photo]')].some((i) => i.naturalWidth > 10));
  ok('Photo compressée affichée depuis le serveur', photoLoaded);
  const histTxt = await pt.locator('.timeline').innerText();
  ok('Après confirmation : intervention + photo envoyées et sauvegardées', /Resserrage des bornes/.test(histTxt) && (await pt.locator('.timeline img[data-photo]').count()) > 0 && /0|Sauvegardé/.test(await pt.locator('#sync-badge').innerText()));
  // correction tracée
  await pt.locator('.ev:has-text("Resserrage") [data-correct]').first().click();
  await fillModal(pt, { content: 'TEST Resserrage des bornes du départ D3 (et non D2)', reason: 'Mauvais départ indiqué' });
  await submitModal(pt); await pt.waitForTimeout(1200);
  const h2 = await pt.locator('.timeline').innerText();
  ok('Correction tracée : nouvelle entrée liée, original toujours visible', /Correction/.test(h2) && /Mauvais départ/.test(h2) && /saisi hors ligne/.test(h2) && /Corrigée le/.test(h2));
  await pt.screenshot({ path: CAP + '12-correction-tracee-mobile.png', fullPage: true });
  const histApi = (await api('GET', `equipment/${T.eq}/history`, null, adminTok)).body;
  const tryDel = await api('DELETE', `equipment/${T.eq}/history/${histApi[0].id}`, null, adminTok);
  ok('Historique : même l\'admin ne peut pas effacer (masquage tracé seulement)', tryDel.status === 403 && histApi.length === 2, 'HTTP ' + tryDel.status + ', entrées : ' + histApi.length);
  await tctx.close();

  // ---------- 9. QR scanné sans connexion ----------
  const anon = await browser.newContext(iphone); const pn = await anon.newPage();
  await pn.goto(B + '/e/' + T.eq, { waitUntil: 'networkidle' }); await pn.waitForTimeout(800);
  const anonTxt = await pn.locator('body').innerText();
  ok('QR scanné sans connexion : « Accès réservé » + nom de l\'équipement seulement', /Accès réservé/.test(anonTxt) && /TEST Armoire de commande A1/.test(anonTxt) && !/Local TEST|Marque TEST/.test(anonTxt));
  await pn.screenshot({ path: CAP + '13-qr-sans-connexion-mobile.png' });
  await anon.close();

  // ---------- 10. Rapport PDF + export ZIP (admin) ----------
  await pa.goto(B + '/#/rapports'); await pa.waitForTimeout(800);
  await pa.selectOption('#rp-ch', T.cA);
  const [dl] = await Promise.all([pa.waitForEvent('download', { timeout: 30000 }), pa.click('#rp-go')]);
  await dl.saveAs(CAP + '14-rapport-chantier.pdf');
  ok('Rapport PDF de chantier généré', fs.statSync(CAP + '14-rapport-chantier.pdf').size > 3000, dl.suggestedFilename());
  const [dz] = await Promise.all([pa.waitForEvent('download', { timeout: 60000 }), pa.click('#x-all')]);
  await dz.saveAs('/workspace/mimouni/tests/export-test.zip');
  ok('Export complet ZIP (données + photos)', fs.statSync('/workspace/mimouni/tests/export-test.zip').size > 1000, dz.suggestedFilename());

  // ---------- 11. Tableaux de bord ----------
  await pa.goto(B + '/#/'); await pa.reload({ waitUntil: 'networkidle' }); await pa.waitForSelector('main .chart svg'); await pa.waitForTimeout(2500);
  await pa.screenshot({ path: CAP + '15-tableau-de-bord-ordinateur.png', fullPage: true });
  const dash = await pa.locator('main').innerText();
  ok('Tableau de bord : indicateurs calculés sur les vraies données', /chantiers actifs/i.test(dash) && (await pa.locator('main .chart svg').count()) >= 3);
  const mctx = await browser.newContext(iphone); const pm = await mctx.newPage();
  await login(pm, 'admin', PW); await pm.screenshot({ path: CAP + '16-tableau-de-bord-mobile.png', fullPage: true }); await mctx.close();
  fs.writeFileSync('/workspace/mimouni/tests/ids.json', JSON.stringify(T));
} catch (e) {
  ok('EXCEPTION', false, e.stack);
} finally {
  console.log('Erreurs JS page :', errors.length ? errors : 'aucune');
  fs.writeFileSync('/workspace/mimouni/tests/resultats.json', JSON.stringify({ at: new Date().toISOString(), base: B, results, errors }, null, 2));
  await browser.close();
}
