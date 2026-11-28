// Registre RGPD et outils du DPO.
// Deux objets distincts :
//  - le registre des activités de traitement (article 30) ;
//  - les demandes d'exercice de droits des personnes (accès, rectification,
//    effacement, limitation, opposition, portabilité).
// Rien n'est jamais effacé : un traitement est archivé, une demande est clôturée
// avec sa décision et sa preuve, et tout changement est journalisé.
import { randomBytes } from 'node:crypto';
import * as db from './db.mjs';

const H = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const json = (s, b) => new Response(JSON.stringify(b), { status: s, headers: H });
const ok = (b) => json(200, b);
const bad = (m) => json(400, { error: m });
const notFound = (m = 'Élément introuvable.') => json(404, { error: m });
const now = () => new Date().toISOString();
const rid = (p) => p + randomBytes(7).toString('base64url').replace(/[-_]/g, '').slice(0, 8);
const str = (v, max = 300) => (v == null ? '' : String(v).trim().slice(0, max));
const dt = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
const today = () => new Date().toISOString().slice(0, 10);

export const BASES = [
  'Contrat de travail',
  'Obligation légale',
  'Intérêt légitime',
  'Consentement',
  'Mission d\'intérêt public',
  'Exécution d\'un contrat',
];
export const SUBJECTS = ['Salariés', 'Candidats', 'Sous-traitants', 'Clients', 'Contacts professionnels', 'Intérimaires', 'Visiteurs'];
export const RISKS = ['Faible', 'Moyen', 'Élevé'];
export const T_STATUS = ['Actif', 'À réviser', 'Archivé'];
export const R_TYPES = ['Accès', 'Rectification', 'Effacement', 'Limitation', 'Opposition', 'Portabilité'];
export const R_STATUS = ['Reçue', 'En cours', 'Traitée', 'Refusée', 'Clôturée'];
export const R_CHANNELS = ['Email', 'Courrier', 'Téléphone', 'Sur place', 'Formulaire'];

const addMonth = (day) => {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
};

function cleanTreatment(b, prev = {}) {
  const t = { ...prev };
  for (const k of ['name', 'purpose', 'subjects', 'categories', 'recipients', 'processors', 'retention', 'security', 'transfers', 'owner', 'notes', 'link', 'ref']) {
    if (b[k] !== undefined) t[k] = str(b[k], k === 'notes' || k === 'purpose' ? 2000 : 500);
  }
  if (b.base !== undefined) t.base = BASES.includes(b.base) ? b.base : prev.base || BASES[0];
  if (b.risk !== undefined) t.risk = RISKS.includes(b.risk) ? b.risk : prev.risk || 'Faible';
  if (b.status !== undefined) t.status = T_STATUS.includes(b.status) ? b.status : prev.status || 'Actif';
  if (b.aipd !== undefined) t.aipd = b.aipd === true || b.aipd === 'true' || b.aipd === '1';
  if (b.reviewAt !== undefined) t.reviewAt = dt(b.reviewAt);
  return t;
}
const missingTreatment = (t) => {
  for (const [k, l] of [['name', 'le nom du traitement'], ['purpose', 'la finalité'], ['retention', 'la durée de conservation']]) {
    if (!t[k]) return 'Renseignez ' + l + '.';
  }
  return '';
};
const treatmentWarnings = (t) => {
  const w = [];
  if (!t.reviewAt) w.push('Aucune date de revue');
  else if (t.reviewAt < today()) w.push('Revue en retard');
  if (t.risk === 'Élevé' && !t.aipd) w.push('Analyse d\'impact (AIPD) à réaliser');
  if (/hors\s*ue|etats?-unis|usa|inde|chine/i.test(t.transfers || '')) w.push('Transfert hors Union européenne à encadrer');
  if (!t.owner) w.push('Responsable / DPO non désigné');
  return w;
};

function cleanRequest(b, prev = {}) {
  const r = { ...prev };
  for (const k of ['person', 'personRef', 'notes', 'proof', 'decision', 'relatedTechId']) {
    if (b[k] !== undefined) r[k] = str(b[k], k === 'notes' ? 2000 : 300);
  }
  if (b.type !== undefined) r.type = R_TYPES.includes(b.type) ? b.type : prev.type || R_TYPES[0];
  if (b.channel !== undefined) r.channel = R_CHANNELS.includes(b.channel) ? b.channel : prev.channel || 'Email';
  if (b.status !== undefined) r.status = R_STATUS.includes(b.status) ? b.status : prev.status || 'Reçue';
  if (b.receivedAt !== undefined) r.receivedAt = dt(b.receivedAt);
  return r;
}
const lateRequest = (r) => !['Traitée', 'Refusée', 'Clôturée'].includes(r.status) && r.dueAt && r.dueAt < today();

export async function handleRgpd({ user, m, r1, r2, body, log }) {
  if (user.role !== 'admin') {
    return json(403, { error: 'Le registre RGPD et les demandes de droits sont réservés à l\'administrateur / DPO.' });
  }

  // ----- Réglages DPO -----
  if (r1 === 'settings') {
    if (m === 'GET') return ok((await db.get('settings', 'rgpd')) || { dpo: {}, processors: [] });
    if (m === 'PUT') {
      const cur = (await db.get('settings', 'rgpd')) || { dpo: {}, processors: [] };
      const dpo = { ...cur.dpo };
      for (const k of ['name', 'email', 'phone', 'address', 'delegateName', 'delegateEmail', 'supervisoryAuthority', 'registryUrl']) {
        if (body.dpo && body.dpo[k] !== undefined) dpo[k] = str(body.dpo[k], 300);
      }
      let processors = cur.processors || [];
      if (Array.isArray(body.processors)) {
        processors = body.processors.slice(0, 40).map((p) => ({
          id: str(p.id, 40) || rid('P-'),
          name: str(p.name, 120), purpose: str(p.purpose, 200), country: str(p.country, 80), guarantee: str(p.guarantee, 300),
        })).filter((p) => p.name);
      }
      const next = { dpo, processors, updatedAt: now(), updatedBy: user.login };
      await db.put('settings', 'rgpd', next);
      await log(user, 'réglages DPO modifiés', 'rgpd', 'settings');
      return ok(next);
    }
    return json(405, { error: 'Méthode non autorisée.' });
  }

  // ----- Registre des traitements -----
  if (r1 === 'treatments') {
    if (m === 'GET' && !r2) {
      const all = await db.list('rgpd');
      return ok(all.sort((a, b) => String(a.name).localeCompare(String(b.name))));
    }
    if (m === 'POST' && !r2) {
      const t = cleanTreatment(body);
      const err = missingTreatment(t); if (err) return bad(err);
      t.id = rid('RGPD-'); t.createdAt = now(); t.updatedAt = now(); t.createdBy = user.login;
      if (!t.reviewAt) { const d = new Date(); d.setFullYear(d.getFullYear() + 1); t.reviewAt = d.toISOString().slice(0, 10); }
      t.history = [{ at: now(), by: user.login, action: 'création', version: 1 }];
      await db.put('rgpd', t.id, t);
      await log(user, 'traitement RGPD créé', 'rgpd', t.id, t.name);
      return ok(t);
    }
    if (m === 'PUT' && r2) {
      const t = await db.get('rgpd', r2); if (!t) return notFound('Traitement introuvable.');
      const before = { ...t };
      const next = cleanTreatment(body, t);
      const err = missingTreatment(next); if (err) return bad(err);
      next.updatedAt = now();
      next.history = [...(t.history || []), { at: now(), by: user.login, action: body.review === true || body.review === '1' ? 'revue' : 'modification', version: (t.history || []).length + 1 }].slice(-40);
      await db.put('rgpd', next.id, next);
      await log(user, 'traitement RGPD modifié', 'rgpd', next.id, (before.name || '') + ' → ' + next.name);
      return ok(next);
    }
    if (m === 'POST' && r2 && body.review) {
      const t = await db.get('rgpd', r2); if (!t) return notFound();
      const d = new Date(); d.setFullYear(d.getFullYear() + 1);
      t.reviewAt = d.toISOString().slice(0, 10); t.status = 'Actif'; t.updatedAt = now();
      t.history = [...(t.history || []), { at: now(), by: user.login, action: 'revue annuelle', version: (t.history || []).length + 1 }].slice(-40);
      await db.put('rgpd', t.id, t);
      await log(user, 'revue RGPD enregistrée', 'rgpd', t.id, t.reviewAt);
      return ok(t);
    }
    return json(405, { error: 'Méthode non autorisée.' });
  }

  // ----- Demandes d'exercice de droits -----
  if (r1 === 'requests') {
    if (m === 'GET' && !r2) {
      const all = await db.list('rgpdreq');
      return ok(all.sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt))));
    }
    if (m === 'POST' && !r2) {
      const r = cleanRequest(body);
      if (!r.person) return bad('Indiquez la personne concernée (nom ou référence).');
      if (!r.receivedAt) r.receivedAt = today();
      r.id = rid('DEM-'); r.createdAt = now(); r.updatedAt = now();
      r.dueAt = addMonth(r.receivedAt);
      r.status = 'Reçue';
      r.history = [{ at: now(), by: user.login, action: 'réception', status: 'Reçue' }];
      await db.put('rgpdreq', r.id, r);
      await log(user, 'demande de droits RGPD reçue', 'rgpd', r.id, r.type + ' · ' + r.person);
      return ok(r);
    }
    if (m === 'PUT' && r2) {
      const r = await db.get('rgpdreq', r2); if (!r) return notFound('Demande introuvable.');
      const prev = { status: r.status, decision: r.decision || '' };
      const next = cleanRequest(body, r);
      if (['Traitée', 'Refusée', 'Clôturée'].includes(next.status) && !next.closedAt) next.closedAt = now();
      if (!['Traitée', 'Refusée', 'Clôturée'].includes(next.status)) next.closedAt = '';
      if (next.status === 'Refusée' && !next.decision) return bad('Indiquez le motif du refus : la personne doit être informée par écrit.');
      next.updatedAt = now();
      next.history = [...(r.history || []), { at: now(), by: user.login, action: 'mise à jour', status: next.status }].slice(-40);
      await db.put('rgpdreq', next.id, next);
      await log(user, 'demande RGPD mise à jour', 'rgpd', next.id, JSON.stringify(prev) + ' → ' + JSON.stringify({ status: next.status, decision: next.decision || '' }));
      return ok(next);
    }
    return json(405, { error: 'Méthode non autorisée.' });
  }

  // ----- Synthèse, échéances et export -----
  if (r1 === 'summary' && m === 'GET') {
    const [treatments, requests] = await Promise.all([db.list('rgpd'), db.list('rgpdreq')]);
    return ok({
      treatments: treatments.length,
      active: treatments.filter((t) => t.status === 'Actif').length,
      warnings: treatments.map((t) => ({ id: t.id, name: t.name, warnings: treatmentWarnings(t) })).filter((x) => x.warnings.length),
      requests: requests.length,
      open: requests.filter((r) => !['Traitée', 'Refusée', 'Clôturée'].includes(r.status)).length,
      late: requests.filter(lateRequest).length,
      aipd: treatments.filter((t) => t.risk === 'Élevé').length,
      checkedAt: now(),
    });
  }
  if (r1 === 'export' && m === 'GET') {
    const [treatments, requests, settings] = await Promise.all([db.list('rgpd'), db.list('rgpdreq'), db.get('settings', 'rgpd')]);
    await log(user, 'registre RGPD exporté', 'rgpd', '-');
    return ok({ exportedAt: now(), exportedBy: user.login, company: 'MIMOUNI INDUSTRIEL ÉLECTRICITÉ', settings: settings || {}, treatments, requests });
  }

  return notFound('Route RGPD inconnue.');
}

export { treatmentWarnings, lateRequest };
