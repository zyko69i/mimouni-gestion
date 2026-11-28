// Délégation d'accès par lien : partage en lecture seule, limité dans le temps
// et dans le nombre d'ouvertures, révocable à tout moment.
// Aucun compte n'est créé : le lien donne accès à une seule fiche, avec des
// données filtrées (jamais de données personnelles sensibles ni de montants).
import { randomBytes } from 'node:crypto';
import * as db from './db.mjs';

const H = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const json = (s, b) => new Response(JSON.stringify(b), { status: s, headers: H });
const ok = (b) => json(200, b);
const bad = (m) => json(400, { error: m });
const notFound = (m = 'Lien introuvable.') => json(404, { error: m });
const now = () => new Date().toISOString();
const str = (v, max = 200) => (v == null ? '' : String(v).trim().slice(0, max));
const dt = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
const today = () => new Date().toISOString().slice(0, 10);

export const RESOURCES = {
  equipement: 'Fiche équipement (sans données personnelles)',
  chantier: 'Fiche chantier (avancement, sans montants)',
  document: 'Référence documentaire',
};

const addDays = (day, n) => {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

function publicShare(s) {
  return {
    token: s.token, resource: s.resource, resourceId: s.resourceId, label: s.label,
    recipient: s.recipient || '', note: s.note || '', createdAt: s.createdAt, createdBy: s.createdBy,
    expiresAt: s.expiresAt, maxUses: s.maxUses, uses: s.uses || 0,
    revokedAt: s.revokedAt || '', lastUseAt: s.lastUseAt || '',
  };
}

async function buildPayload(resource, id) {
  if (resource === 'equipement') {
    const e = await db.get('equipment', id);
    if (!e) return null;
    const site = e.siteId ? await db.get('sites', e.siteId) : null;
    const chantier = e.chantierId ? await db.get('chantiers', e.chantierId) : null;
    return {
      title: e.name, reference: e.id,
      fields: [
        ['Type', e.type], ['Catégorie', e.category], ['Marque', e.brand], ['Modèle', e.model],
        ['Puissance', e.power], ['Tension', e.voltage], ['Intensité', e.current], ['Indice de protection', e.ip],
        ['Site', site ? (site.name + (site.code ? ' (' + site.code + ')' : '')) : ''],
        ['Bâtiment / local', [e.building, e.local].filter(Boolean).join(' · ')],
        ['Emplacement', e.location], ['Chantier', chantier ? chantier.name : ''],
        ['Statut', e.status], ['Criticité', e.criticality], ['Mise en service', e.commissioned],
        ['Prochain contrôle', e.nextControl], ['Garantie jusqu\'au', e.warrantyUntil],
        ['Fonction', e.function], ['Caractéristiques', e.specs], ['Conditions d\'utilisation', e.conditions],
      ].filter(([, v]) => v),
    };
  }
  if (resource === 'chantier') {
    const c = await db.get('chantiers', id);
    if (!c) return null;
    const site = c.siteId ? await db.get('sites', c.siteId) : null;
    const tasks = (await db.list('tasks')).filter((t) => t.chantierId === c.id);
    return {
      title: c.name, reference: c.id,
      fields: [
        ['Client', c.client], ['Site', site ? site.name : ''], ['Adresse', c.address],
        ['Statut', c.status], ['Début', c.start], ['Fin prévue', c.endPlanned],
        ['Description', c.description],
      ].filter(([, v]) => v),
      tasks: tasks.filter((t) => t.status !== 'Annulée').map((t) => ({ title: t.title, status: t.status, due: t.dueDate || '' })),
    };
  }
  if (resource === 'document') {
    const d = await db.get('documents', id);
    if (!d) return null;
    return {
      title: d.title, reference: d.ref || d.id,
      fields: [
        ['Catégorie', d.category], ['Version', d.version], ['Statut', d.status],
        ['Responsable', d.owner], ['Prochaine revue', d.reviewAt], ['Notes', d.notes],
      ].filter(([, v]) => v),
      link: d.link || '',
    };
  }
  return null;
}

// ---------- Routes authentifiées ----------
export async function handleShares({ user, m, r1, r2, body, log, scope }) {
  const isAdmin = user.role === 'admin';
  if (user.role === 'technicien') return json(403, { error: 'Les liens de délégation sont réservés à l\'encadrement.' });

  if (r1 === undefined && m === 'GET') {
    const all = await db.list('shares');
    const mine = isAdmin ? all : all.filter((s) => s.createdBy === user.login);
    return ok(mine.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(publicShare));
  }

  if (r1 === undefined && m === 'POST') {
    const resource = RESOURCES[body.resource] ? body.resource : '';
    if (!resource) return bad('Choisissez le type de fiche à partager.');
    const resourceId = str(body.resourceId, 40);
    if (!resourceId) return bad('Choisissez la fiche à partager.');
    const payload = await buildPayload(resource, resourceId);
    if (!payload) return notFound('La fiche à partager est introuvable.');

    // Un chef ne partage que ce qui relève de son périmètre.
    if (!isAdmin) {
      const sc = await scope(user);
      if (resource === 'chantier' && !sc.chantierIds.has(resourceId)) return json(403, { error: 'Ce chantier n\'est pas dans votre périmètre.' });
      if (resource === 'equipement') {
        const e = await db.get('equipment', resourceId);
        if (e && e.chantierId && !sc.chantierIds.has(e.chantierId)) return json(403, { error: 'Cet équipement n\'est pas dans votre périmètre.' });
      }
    }

    const days = Math.min(365, Math.max(1, Number(body.days) || 7));
    const maxUses = Math.min(500, Math.max(1, Number(body.maxUses) || 25));
    const s = {
      token: randomBytes(18).toString('base64url'),
      resource, resourceId, label: payload.title,
      recipient: str(body.recipient, 120), note: str(body.note, 500),
      createdAt: now(), createdBy: user.login,
      expiresAt: dt(body.expiresAt) || addDays(today(), days),
      maxUses, uses: 0, revokedAt: '', lastUseAt: '',
    };
    await db.put('shares', s.token, s);
    await log(user, 'lien de délégation créé', 'partage', s.token.slice(0, 6) + '…', resource + ' ' + resourceId + ' · expire ' + s.expiresAt);
    return ok(publicShare(s));
  }

  if (r1 && r2 === 'revoke' && m === 'POST') {
    const s = await db.get('shares', r1);
    if (!s) return notFound();
    if (!isAdmin && s.createdBy !== user.login) return json(403, { error: 'Seul le créateur du lien ou l\'administrateur peut le révoquer.' });
    if (s.revokedAt) return bad('Ce lien est déjà révoqué.');
    s.revokedAt = now();
    await db.put('shares', s.token, s);
    await log(user, 'lien de délégation révoqué', 'partage', s.token.slice(0, 6) + '…', s.label);
    return ok(publicShare(s));
  }

  return notFound('Route de partage inconnue.');
}

// ---------- Ouverture publique d'un lien (aucune session) ----------
export async function openShare(token) {
  const s = token ? await db.get('shares', token) : null;
  if (!s) return notFound('Lien inconnu ou supprimé.');
  if (s.revokedAt) return json(410, { error: 'Ce lien a été révoqué par son créateur.' });
  if (s.expiresAt && s.expiresAt < today()) return json(410, { error: 'Ce lien a expiré. Demandez-en un nouveau.' });
  if (s.maxUses && (s.uses || 0) >= s.maxUses) return json(429, { error: 'Ce lien a atteint son nombre maximum d\'ouvertures.' });

  const payload = await buildPayload(s.resource, s.resourceId);
  if (!payload) return notFound('La fiche partagée n\'existe plus.');

  s.uses = (s.uses || 0) + 1; s.lastUseAt = now();
  await db.put('shares', s.token, s);
  await db.journal({ who: 'lien de délégation', role: '', action: 'fiche consultée par un lien', entity: 'partage', id: s.token.slice(0, 6) + '…', detail: s.resource + ' ' + s.resourceId });

  return ok({
    company: 'MIMOUNI INDUSTRIEL ÉLECTRICITÉ',
    resource: s.resource, label: payload.title, recipient: s.recipient || '', note: s.note || '',
    createdAt: s.createdAt, expiresAt: s.expiresAt, uses: s.uses, maxUses: s.maxUses,
    readOnly: true, payload,
  });
}
