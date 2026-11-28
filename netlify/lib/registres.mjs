// Registres d'exploitation : carburant, entretien véhicules, barèmes versionnés,
// déplacements et frais, stocks. Contrôle d'accès, journalisation et règles métier côté serveur.
import { randomBytes } from 'node:crypto';
import * as db from './db.mjs';

const H = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const json = (s, b) => new Response(JSON.stringify(b), { status: s, headers: H });
const rid = () => 'R' + randomBytes(8).toString('base64url').replace(/[-_]/g, '').slice(0, 9);
const now = () => new Date().toISOString();
const str = (v, max = 300) => (v == null ? '' : String(v).trim().slice(0, max));
const dt = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
const nb = (v) => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n >= 0 ? Math.round(n * 1000) / 1000 : 0; };
const r2 = (n) => Math.round(n * 100) / 100;

export const BAREME_KINDS = ['Kilométrique (€/km)', 'Repas (€/repas)', 'Hébergement (€/nuit)', 'Indemnité (€/jour)'];
export const BAREME_SOURCES = ['URSSAF', 'Convention collective', 'Accord d\'entreprise', 'Décision unilatérale', 'Usage'];
export const BAREME_STATUS = ['brouillon', 'en vigueur', 'remplacé', 'obsolète'];
export const TRIP_CATEGORIES = ['Trajet habituel domicile-travail', 'Déplacement professionnel', 'Grand déplacement', 'Déplacement entre deux chantiers', 'Déplacement pendant la journée de travail'];
export const TRIP_VEHICLE = ['Véhicule de service', 'Véhicule personnel', 'Transport en commun', 'Covoiturage'];
export const TRIP_STATUS = ['brouillon', 'à compléter', 'en attente de justificatifs', 'à valider', 'validé', 'refusé', 'transmis à la comptabilité', 'payé'];
export const SERVICE_TYPES = ['Vidange', 'Pneumatiques', 'Freins', 'Batterie', 'Révision', 'Courroie', 'Contrôle technique', 'Contre-visite', 'Contrôle périodique', 'Réparation', 'Sinistre', 'Immobilisation', 'Assurance'];
export const CT_RESULTS = ['', 'Favorable', 'Défaillances mineures', 'Défaillances majeures', 'Défaillances critiques', 'Contre-visite à effectuer'];

// Spécification des registres : champs, droits d'écriture, lecture.
const F = (key, type, extra = {}) => ({ key, type, ...extra });
export const REG = {
  fuel: { label: 'Carburant', write: ['admin', 'chef'], read: ['admin', 'chef'], fields: [
    F('vehicleId', 's', { max: 40, req: true }), F('date', 'd', { req: true }), F('driver', 's', { max: 80 }), F('km', 'n'), F('liters', 'n', { req: true }), F('price', 'n'),
    F('station', 's', { max: 80 }), F('card', 's', { max: 40 }), F('proof', 's', { max: 200 }),
  ] },
  vehservice: { label: 'Entretien véhicules', write: ['admin', 'chef'], read: ['admin', 'chef'], fields: [
    F('vehicleId', 's', { max: 40, req: true }), F('type', 'e', { options: SERVICE_TYPES, req: true }), F('date', 'd', { req: true }), F('km', 'n'),
    F('nextDate', 'd'), F('nextKm', 'n'), F('result', 'e', { options: CT_RESULTS }), F('reVisitBefore', 'd'), F('center', 's', { max: 100 }),
    F('cost', 'n'), F('insurer', 's', { max: 100 }), F('contract', 's', { max: 60 }), F('proof', 's', { max: 200 }), F('notes', 's', { max: 500 }),
  ] },
  baremes: { label: 'Barèmes', write: ['admin'], read: ['admin', 'chef'], fields: [
    F('name', 's', { max: 120, req: true }), F('kind', 'e', { options: BAREME_KINDS, req: true }), F('value', 'n', { req: true }), F('effectiveFrom', 'd', { req: true }),
    F('source', 'e', { options: BAREME_SOURCES, req: true }), F('textVersion', 's', { max: 120 }), F('validator', 's', { max: 80 }), F('validatedOn', 'd'),
    F('proof', 's', { max: 200 }), F('status', 'e', { options: BAREME_STATUS }),
  ] },
  trips: { label: 'Déplacements et frais', write: ['admin', 'chef'], read: ['admin', 'chef'], fields: [
    F('techId', 's', { max: 40, req: true }), F('chantierId', 's', { max: 40 }), F('date', 'd', { req: true }), F('returnDate', 'd'),
    F('category', 'e', { options: TRIP_CATEGORIES, req: true }), F('transport', 'e', { options: TRIP_VEHICLE }), F('from', 's', { max: 150 }), F('to', 's', { max: 150 }),
    F('kmDeclared', 'n'), F('kmEstimated', 'n'), F('gapReason', 's', { max: 300 }), F('nights', 'n'), F('meals', 'n'), F('lodgingCost', 'n'), F('otherCost', 'n'),
    F('advance', 'n'), F('alreadyPaid', 'n'), F('proof', 's', { max: 200 }), F('status', 'e', { options: TRIP_STATUS }), F('refusalReason', 's', { max: 300 }),
  ] },
  stock: { label: 'Stocks et consommables', write: ['admin', 'chef'], read: ['admin', 'chef'], fields: [
    F('name', 's', { max: 120, req: true }), F('ref', 's', { max: 60 }), F('siteId', 's', { max: 40 }), F('unit', 's', { max: 20 }),
    F('qty', 'n'), F('minQty', 'n'), F('location', 's', { max: 100 }), F('supplier', 's', { max: 100 }),
  ] },
};

function clean(spec, body, prev = {}) {
  const out = { ...prev };
  for (const f of spec.fields) {
    if (body[f.key] === undefined) continue;
    if (f.type === 's') out[f.key] = str(body[f.key], f.max || 300);
    else if (f.type === 'd') out[f.key] = dt(body[f.key]);
    else if (f.type === 'n') out[f.key] = nb(body[f.key]);
    else if (f.type === 'e') out[f.key] = f.options.includes(body[f.key]) ? body[f.key] : (prev[f.key] ?? f.options[0]);
  }
  return out;
}
const missing = (spec, o) => { const f = spec.fields.find((x) => x.req && (o[x.key] === undefined || o[x.key] === '' || (x.type === 'n' && !o[x.key] && x.key !== 'qty'))); return f ? 'Champ obligatoire manquant : ' + f.key + '.' : ''; };

// ---------- Règles métier ----------
function fuelAnalyse(rec, all) {
  const same = all.filter((x) => x.vehicleId === rec.vehicleId && x.id !== rec.id && x.date <= rec.date && x.km && x.km <= (rec.km || Infinity)).sort((a, b) => b.km - a.km)[0];
  const warnings = [];
  if (rec.km && same) {
    const dist = rec.km - same.km;
    if (dist > 0 && rec.liters) { rec.consumption = r2((rec.liters / dist) * 100); if (rec.consumption > 25 || rec.consumption < 3) warnings.push('Consommation incohérente : ' + rec.consumption + ' L/100 km'); }
  }
  const lower = all.find((x) => x.vehicleId === rec.vehicleId && x.id !== rec.id && x.date < rec.date && x.km > (rec.km || 0));
  if (rec.km && lower) warnings.push('Kilométrage inférieur à un relevé plus ancien');
  rec.amount = r2((rec.liters || 0) * (rec.price || 0));
  rec.warnings = warnings;
}

async function baremeFor(kindPrefix, day) {
  const all = (await db.list('baremes')).filter((b) => b.status === 'en vigueur' && b.kind.startsWith(kindPrefix) && b.effectiveFrom <= day);
  return all.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] || null;
}
// Calcul d'un déplacement : barème figé au moment du calcul, jamais de barème obsolète.
async function tripCompute(t) {
  const warnings = [];
  const habitual = t.category === TRIP_CATEGORIES[0];
  const km = t.kmDeclared || 0;
  const [bk, bm, bn] = await Promise.all([baremeFor('Kilométrique', t.date), baremeFor('Repas', t.date), baremeFor('Hébergement', t.date)]);
  const snap = {};
  let kmAmount = 0, mealAmount = 0, nightAmount = 0;
  if (habitual) { warnings.push('Trajet habituel domicile-travail : non indemnisé, jamais mélangé aux déplacements professionnels.'); }
  else {
    if (km && t.transport === 'Véhicule personnel') { if (bk) { kmAmount = r2(km * bk.value); snap.km = { id: bk.id, version: bk.textVersion, value: bk.value, name: bk.name }; } else warnings.push('Aucun barème kilométrique en vigueur à cette date.'); }
    if (t.meals) { if (bm) { mealAmount = r2(t.meals * bm.value); snap.meal = { id: bm.id, version: bm.textVersion, value: bm.value, name: bm.name }; } else warnings.push('Aucun barème repas en vigueur à cette date.'); }
    if (t.nights && !t.lodgingCost) { if (bn) { nightAmount = r2(t.nights * bn.value); snap.night = { id: bn.id, version: bn.textVersion, value: bn.value, name: bn.name }; } else warnings.push('Aucun barème hébergement en vigueur à cette date.'); }
  }
  let gap = false;
  if (km && t.kmEstimated) { const pct = Math.abs(km - t.kmEstimated) / t.kmEstimated; if (pct > 0.1) { gap = true; warnings.push('Écart de ' + Math.round(pct * 100) + ' % entre distance déclarée et estimée.'); } }
  const total = r2(kmAmount + mealAmount + nightAmount + (t.lodgingCost || 0) + (t.otherCost || 0));
  return { kmAmount, mealAmount, nightAmount, total, balance: r2(total - (t.advance || 0) - (t.alreadyPaid || 0)), bareme: snap, gap, warnings, computedAt: now() };
}

export async function handleRegistre({ user, m, r1, r2: id, body, log }) {
  const spec = REG[r1];
  if (!spec) return json(404, { error: 'Registre inconnu.' });
  if (!spec.read.includes(user.role)) return json(403, { error: 'Action non autorisée pour votre profil.' });
  const canWrite = spec.write.includes(user.role);
  const coll = r1;
  if (m === 'GET' && !id) return json(200, (await db.list(coll)).sort((a, b) => String(b.date || b.createdAt).localeCompare(String(a.date || a.createdAt))));
  if (m === 'DELETE') return json(403, { error: 'Une ligne de registre ne s\'efface pas : elle se corrige (tracé dans le journal) ou s\'annule.' });
  if (!canWrite) return json(403, { error: 'Action non autorisée pour votre profil.' });

  let rec, prev = null;
  if (m === 'POST' && !id) { rec = { id: rid(), ...clean(spec, body), createdBy: user.login, createdAt: now() }; }
  else if (m === 'PUT' && id) { prev = await db.get(coll, id); if (!prev) return json(404, { error: 'Introuvable.' }); rec = { ...clean(spec, body, prev), updatedAt: now() }; }
  else return json(405, { error: 'Méthode non supportée.' });
  const miss = missing(spec, rec); if (miss) return json(400, { error: miss });

  if (coll === 'fuel') fuelAnalyse(rec, await db.list('fuel'));
  if (coll === 'vehservice') {
    if (rec.type === 'Contrôle technique' && rec.result === 'Contre-visite à effectuer' && !rec.reVisitBefore) return json(400, { error: 'Contre-visite : la date limite est obligatoire.' });
    if (rec.nextDate && rec.nextDate < rec.date) return json(400, { error: 'La prochaine échéance ne peut pas précéder la date de l\'opération.' });
    // Ne jamais déduire une conformité sans justificatif
    rec.conformeSelonJustificatif = !!rec.proof && !!rec.nextDate && rec.result !== 'Contre-visite à effectuer';
  }
  if (coll === 'baremes') {
    rec.status = rec.status || 'brouillon';
    if (rec.status === 'en vigueur') {
      if (!rec.proof || !rec.validator || !rec.validatedOn) return json(400, { error: 'Un barème en vigueur exige le justificatif de la source, le validateur et la date de validation.' });
      for (const o of await db.list('baremes')) if (o.id !== rec.id && o.status === 'en vigueur' && o.kind === rec.kind && o.effectiveFrom <= rec.effectiveFrom) { await db.put('baremes', o.id, { ...o, status: 'remplacé', replacedBy: rec.id, updatedAt: now() }); await log(user, 'barème remplacé', 'barème', o.id, 'par ' + rec.id); }
    }
    if (prev && prev.status === 'obsolète' && rec.status !== 'obsolète') return json(400, { error: 'Un barème obsolète ne peut pas être réactivé.' });
  }
  if (coll === 'trips') {
    const wasValidated = prev && ['validé', 'transmis à la comptabilité', 'payé'].includes(prev.status);
    if (wasValidated && !['transmis à la comptabilité', 'payé'].includes(rec.status) && body.status === undefined) return json(400, { error: 'Un déplacement validé n\'est plus modifiable.' });
    if (!prev || !wasValidated) { const c = await tripCompute(rec); Object.assign(rec, { calc: c }); }
    rec.status = rec.status || 'brouillon';
    if (rec.status === 'validé') {
      if (user.role !== 'admin') return json(403, { error: 'Seul l\'administrateur valide un remboursement.' });
      if (rec.calc.gap && !rec.gapReason) return json(400, { error: 'Écart inexpliqué entre distance déclarée et estimée : validation automatique impossible. Renseignez le motif de l\'écart.' });
      if (!rec.proof) return json(400, { error: 'Justificatif obligatoire avant validation.' });
      if (rec.calc.warnings.some((w) => w.startsWith('Aucun barème'))) return json(400, { error: 'Validation impossible : aucun barème en vigueur applicable (voir Barèmes).' });
    }
    if (rec.status === 'refusé' && !rec.refusalReason) return json(400, { error: 'Un refus doit comporter un motif.' });
    if (['transmis à la comptabilité', 'payé'].includes(rec.status) && !(prev && ['validé', 'transmis à la comptabilité'].includes(prev.status))) return json(400, { error: 'Ce statut exige une validation préalable.' });
  }
  if (coll === 'stock') { rec.low = rec.minQty > 0 && rec.qty <= rec.minQty; }
  await db.put(coll, rec.id, rec);
  const diff = prev ? spec.fields.filter((f) => String(prev[f.key] ?? '') !== String(rec[f.key] ?? '')).map((f) => f.key + ': ' + (prev[f.key] ?? '') + ' → ' + (rec[f.key] ?? '')).join(' ; ') : '';
  await log(user, prev ? spec.label + ' modifié' : spec.label + ' créé', coll, rec.id, diff || (rec.name || rec.vehicleId || rec.techId || ''));
  return json(200, rec);
}
