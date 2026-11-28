// Preuve et traçabilité : vérification de l'intégrité du journal, lecture d'une
// trace par fiche et constitution d'un paquet de preuve exportable.
// Le journal est chaîné (empreinte du contenu + clé précédente) : une
// modification ou une suppression d'entrée casse la chaîne et se voit.
import * as db from './db.mjs';

const H = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const json = (s, b) => new Response(JSON.stringify(b), { status: s, headers: H });
const ok = (b) => json(200, b);
const bad = (m) => json(400, { error: m });
const now = () => new Date().toISOString();
const str = (v, max = 200) => (v == null ? '' : String(v).trim().slice(0, max));
const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');

// Deux contrôles distincts :
//  - « anomalies » : l'empreinte du contenu ne correspond plus → altération réelle ;
//  - « ruptures » : le maillon précédent n'est pas celui attendu → suppression,
//    restauration de sauvegarde ou écritures concurrentes entre deux instances.
function verifyChain(rows) {
  const sorted = rows.slice().sort((a, b) => String(a.key).localeCompare(String(b.key)));
  const anomalies = [];
  const ruptures = [];
  let previousKey = '';
  let checked = 0, legacy = 0;
  for (const { key, entry } of sorted) {
    if (!entry.hash) { legacy++; previousKey = key; continue; }
    const expected = db.journalHash(entry);
    if (expected !== entry.hash) anomalies.push({ key, type: 'empreinte', at: entry.at, action: entry.action });
    else if (entry.prev !== previousKey) ruptures.push({ key, type: 'chaîne', at: entry.at, action: entry.action, attendu: previousKey, trouve: entry.prev || '' });
    checked++; previousKey = key;
  }
  return {
    entries: sorted.length, checked, legacy, anomalies, ruptures,
    intact: anomalies.length === 0,
    verifiedAt: now(),
    firstAt: sorted.length ? sorted[0].entry.at : '',
    lastAt: sorted.length ? sorted[sorted.length - 1].entry.at : '',
  };
}

const inRange = (at, from, to) => {
  const d = String(at || '').slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
};

function counts(rows, field) {
  const out = {};
  for (const r of rows) { const k = r.entry[field] || '–'; out[k] = (out[k] || 0) + 1; }
  return Object.entries(out).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, count: v }));
}

export async function handlePreuves({ user, m, r1, r2, r3, body, log, url }) {
  if (!user || user.role !== 'admin') return json(403, { error: 'La vérification des preuves est réservée à l\'administrateur.' });

  // Synthèse : volumétrie, acteurs, objets, état de la chaîne.
  if (!r1 && m === 'GET') {
    const rows = await db.listJournalWithKeys(2000);
    const v = verifyChain(rows);
    return ok({
      ...v,
      byAction: counts(rows, 'action').slice(0, 12),
      byEntity: counts(rows, 'entity').slice(0, 12),
      byWho: counts(rows, 'who').slice(0, 12),
      last: rows.slice(0, 20).map((x) => x.entry),
    });
  }

  if (r1 === 'verify' && m === 'GET') {
    const rows = await db.listJournalWithKeys(5000);
    const v = verifyChain(rows);
    if (v.intact) await log(user, 'vérification de la chaîne des preuves', 'preuve', 'journal', v.checked + ' entrées vérifiées');
    return ok(v);
  }

  // Trace d'une fiche : toutes les actions dont l'objet correspond.
  if (r1 === 'trace' && m === 'GET') {
    const type = str(r2, 40);
    const id = str(r3, 80);
    if (!type || !id) return bad('Indiquez le type et l\'identifiant de la fiche.');
    const rows = await db.listJournalWithKeys(5000);
    const entries = rows.filter((x) => x.entry.entity === type && String(x.entry.id || '').startsWith(id)).map((x) => x.entry);
    let hist = null;
    if (type === 'equipment') { try { hist = await db.listHistory(id); } catch { hist = null; } }
    return ok({ type, id, entries, history: hist || [] });
  }

  // Paquet de preuve : période, objet, acteur. Le paquet est lui-même journalisé.
  if ((r1 === 'export' || r1 === 'package') && m === 'GET') {
    const from = day(url.searchParams.get('from'));
    const to = day(url.searchParams.get('to'));
    const entity = str(url.searchParams.get('entity'), 40);
    const actor = str(url.searchParams.get('actor'), 80);
    const rows = await db.listJournalWithKeys(5000);
    const v = verifyChain(rows);
    const kept = rows.filter(({ entry }) => inRange(entry.at, from, to)
      && (!entity || entry.entity === entity)
      && (!actor || entry.who === actor)).map((x) => x.entry);
    const bundle = {
      company: 'MIMOUNI INDUSTRIEL ÉLECTRICITÉ',
      kind: 'paquet de preuve',
      generatedAt: now(), generatedBy: user.login,
      criteria: { from, to, entity, actor },
      verification: v,
      entries: kept,
    };
    await log(user, 'paquet de preuve exporté', 'preuve', 'journal', [from || 'origine', to || 'aujourd\'hui', entity || 'tous objets', kept.length + ' entrées'].join(' · '));
    return ok(bundle);
  }

  return json(404, { error: 'Route de preuve inconnue.' });
}
