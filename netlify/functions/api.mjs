// API MIMOUNI INDUSTRIEL ÉLECTRICITÉ – une seule fonction, contrôle d'accès
// côté serveur sur CHAQUE route (rôles : admin, chef, technicien).
import { randomBytes } from 'node:crypto';
import * as db from '../lib/db.mjs';
import { hashPassword, verifyPassword, signToken, readToken } from '../lib/auth.mjs';
import { DEMO } from '../lib/demo.mjs';

const COMPANY = 'MIMOUNI INDUSTRIEL ÉLECTRICITÉ';
const H = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: H });
const ok = (body) => json(200, body);
const deny = (msg = 'Action non autorisée pour votre profil.') => json(403, { error: msg });
const bad = (msg) => json(400, { error: msg });
const notFound = (msg = 'Introuvable.') => json(404, { error: msg });

const now = () => new Date().toISOString();
const rid = (n = 10) => randomBytes(n).toString('base64url').replace(/[-_]/g, '').slice(0, n);
const EQ_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const eqCode = () => 'EQ-' + Array.from(randomBytes(6), (b) => EQ_ALPHA[b % EQ_ALPHA.length]).join('');
const str = (v, max = 500) => (v == null ? '' : String(v).trim().slice(0, max));
const date = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0; };
// Contrôles de saisie (renvoient un message d'erreur en français, ou '' si tout va bien)
const MAX_HOURS = 10000;
const badHours = (v, label) => {
  if (v === undefined || v === null || v === '') return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return label + ' : nombre invalide.';
  if (n < 0) return label + ' : une valeur négative n\'est pas possible.';
  if (n > MAX_HOURS) return label + ' : valeur trop grande (' + MAX_HOURS + ' h maximum).';
  return '';
};
const badOrder = (a, b, msg) => (a && b && b < a ? msg : '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const badEmail = (v) => (str(v) && !EMAIL_RE.test(str(v)) ? 'Adresse email invalide.' : '');
const badPhone = (v) => (str(v) && !/^[+0-9][0-9 .\-()]{5,24}$/.test(str(v)) ? 'Numéro de téléphone invalide (chiffres, espaces, + . - seulement).' : '');
const firstErr = (...l) => l.find(Boolean) || '';

const ROLES = ['admin', 'chef', 'technicien'];
const TASK_STATUS = ['À faire', 'En cours', 'Bloquée', 'Terminée', 'Annulée'];
const CHANTIER_STATUS = ['En préparation', 'En cours', 'Clôture proposée', 'Clôturé'];
const ABS_TYPES = ['absence', 'retard', 'congé', 'maladie', 'non-présentation'];
const SLOTS = ['journée', 'matin', 'après-midi'];
const HAB_KINDS = ['Électrique (NF C 18-510)', 'Nucléaire (RP / SC / HN)', 'CACES', 'AIPR', 'SST', 'Travail en hauteur', 'Autre'];
const HIST_TYPES = ['intervention', 'remarque', 'photo', 'correction', 'masquage'];
const EQUIP_FIELDS = ['name', 'type', 'category', 'brand', 'manufacturer', 'reference', 'model', 'serial', 'supplier', 'chantierId', 'siteId', 'zone', 'building', 'local', 'location', 'status', 'criticality', 'function', 'power', 'voltage', 'current', 'dimensions', 'ip', 'elecClass', 'conditions', 'manager', 'userId', 'specs'];
const EQUIP_MAX = { specs: 1000, conditions: 300, dimensions: 120, function: 150 };
const EQUIP_DATES = ['commissioned', 'nextControl', 'purchaseDate', 'warrantyUntil'];
const DOC_STATUS = ['Valide', 'À réviser', 'Remplacé', 'Archivé'];
const FLOW_STATUS = ['Attendu', 'Envoyé', 'Reçu', 'Validé', 'Refusé', 'Archivé'];
const MAINT_KINDS = ['Préventive', 'Corrective', 'Contrôle réglementaire'];
const MAINT_STATUS = ['Planifiée', 'En cours', 'Réalisée', 'Annulée'];
const REPORT_TYPES = ['Panne', 'Dégât', 'Demande de maintenance', 'Demande de réparation', 'Transfert', 'Autre'];
const REPORT_STATUS = ['Ouvert', 'En cours', 'Clos', 'Refusé'];

// ---------- Contexte de l'utilisateur et visibilité ----------
async function authenticate(req) {
  const h = req.headers.get('authorization') || '';
  const p = readToken(h.startsWith('Bearer ') ? h.slice(7) : '');
  if (!p) return null;
  const user = await db.get('users', p.u);
  if (!user || !user.active || (user.tokenVersion || 0) !== p.v) return null;
  return user;
}

async function scope(user) {
  const [chantiers, technicians, assignments] = await Promise.all([db.list('chantiers'), db.list('technicians'), db.list('assignments')]);
  if (user.role === 'admin') {
    return { chantierIds: new Set(chantiers.map((c) => c.id)), techIds: new Set(technicians.map((t) => t.id)), chantiers, technicians, assignments };
  }
  if (user.role === 'chef') {
    const mine = chantiers.filter((c) => c.chefId === user.login);
    const chantierIds = new Set(mine.map((c) => c.id));
    const techIds = new Set();
    mine.forEach((c) => (c.team || []).forEach((t) => techIds.add(t)));
    assignments.filter((a) => chantierIds.has(a.chantierId)).forEach((a) => techIds.add(a.techId));
    if (user.technicianId) techIds.add(user.technicianId);
    return { chantierIds, techIds, chantiers, technicians, assignments };
  }
  const me = user.technicianId;
  const chantierIds = new Set(chantiers.filter((c) => (c.team || []).includes(me)).map((c) => c.id));
  assignments.filter((a) => a.techId === me).forEach((a) => chantierIds.add(a.chantierId));
  return { chantierIds, techIds: new Set(me ? [me] : []), chantiers, technicians, assignments };
}

function redactTech(t, user) {
  if (user.role === 'admin' || t.id === user.technicianId) return t;
  // Chef : pas de données personnelles sensibles
  const { address, birthDate, personalNotes, ...rest } = t;
  return rest;
}

function redactAbsence(a, user) {
  if (user.role === 'admin' || a.techId === user.technicianId) return a;
  if (a.type === 'maladie') return { ...a, type: 'absence', motif: '', history: [] };
  return a;
}

const publicUser = (u) => ({ login: u.login, name: u.name, role: u.role, technicianId: u.technicianId || '', active: u.active, createdAt: u.createdAt, demo: !!u.demo });

async function log(user, action, entity, id, detail = '') {
  await db.journal({ who: user ? user.login : 'système', role: user ? user.role : '', action, entity, id, detail: String(detail).slice(0, 300) });
}

// ---------- Connexion ----------
async function login(req) {
  const b = await req.json().catch(() => ({}));
  const loginName = str(b.login, 40).toLowerCase();
  const pw = String(b.password || '');
  if (!loginName || !pw) return bad('Identifiant et mot de passe obligatoires.');
  const rl = (await db.get('ratelimit', loginName)) || { count: 0, since: Date.now() };
  if (Date.now() - rl.since > 15 * 60e3) { rl.count = 0; rl.since = Date.now(); }
  if (rl.count >= 10) return json(429, { error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
  let user = await db.get('users', loginName);
  if (!user && loginName === 'admin' && process.env.MIMOUNI_ADMIN_HASH) {
    // Premier démarrage : création du compte administrateur à partir du hash initial.
    user = { login: 'admin', name: 'Administrateur principal', role: 'admin', hash: process.env.MIMOUNI_ADMIN_HASH, active: true, tokenVersion: 0, createdAt: now() };
    await db.put('users', 'admin', user);
  }
  if (!user || !user.active || !verifyPassword(pw, user.hash)) {
    rl.count += 1; await db.put('ratelimit', loginName, rl);
    return json(401, { error: 'Identifiant ou mot de passe incorrect.' });
  }
  if (rl.count) await db.put('ratelimit', loginName, { count: 0, since: Date.now() });
  await log(user, 'connexion', 'utilisateur', user.login);
  return ok({ token: signToken(user), user: publicUser(user) });
}

// ---------- Données visibles (chargement initial + copie hors ligne) ----------
async function bootstrap(user) {
  const sc = await scope(user);
  const [tasks, absences, equipment, company, sites, vehicles, documents, docflows, maintenances, reports, movements] = await Promise.all([db.list('tasks'), db.list('absences'), db.list('equipment'), db.get('settings', 'company'), db.list('sites'), db.list('vehicles'), db.list('documents'), db.list('docflows'), db.list('maintenances'), db.list('reports'), db.list('movements')]);
  const visChantiers = sc.chantiers.filter((c) => sc.chantierIds.has(c.id));
  const visTasks = tasks.filter((t) => sc.chantierIds.has(t.chantierId));
  const visTechs = sc.technicians.filter((t) => sc.techIds.has(t.id)).map((t) => redactTech(t, user));
  let visAssign;
  if (user.role === 'admin') visAssign = sc.assignments;
  else visAssign = sc.assignments.filter((a) => sc.techIds.has(a.techId) || sc.chantierIds.has(a.chantierId))
    .map((a) => (sc.chantierIds.has(a.chantierId) ? a : { ...a, chantierId: '', other: true }));
  const visAbs = absences.filter((a) => sc.techIds.has(a.techId)).map((a) => redactAbsence(a, user));
  const equipFilter = new Set([...equipment.map((e) => e.id), ...[...sc.chantierIds].map((id) => 'CH-' + id)]);
  if (user.role !== 'admin') {
    // fil d'activité : seulement les chantiers visibles
    const allowedEq = equipment.filter((e) => !e.chantierId || sc.chantierIds.has(e.chantierId)).map((e) => e.id);
    equipFilter.clear(); allowedEq.forEach((i) => equipFilter.add(i)); [...sc.chantierIds].forEach((id) => equipFilter.add('CH-' + id));
  }
  const recent = await db.recentHistory(15, equipFilter);
  const sheetsFrom = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);
  const timesheets = (await db.list('timesheets')).filter((f) => f.date >= sheetsFrom && canSeeSheet(f, user, sc));
  const out = {
    me: publicUser(user), company: company || { name: COMPANY }, serverTime: now(),
    chantiers: visChantiers, tasks: visTasks, technicians: visTechs, assignments: visAssign,
    // Le chef ne voit que le matériel de ses chantiers (et le matériel sans chantier)
    timesheets, absences: visAbs, equipment: user.role === 'chef' ? equipment.filter((e) => !e.chantierId || sc.chantierIds.has(e.chantierId)) : equipment, recent,
    sites: sites.sort((a, b) => String(a.name).localeCompare(String(b.name))), vehicles,
  };
  // Documentation, courriers, maintenance, signalements, mouvements d'équipements
  // (le chef et le technicien ne voient que les éléments de leurs sites ou non rattachés)
  const visSites = user.role === 'admin' ? null : new Set(sc.chantiers.map((c) => c.siteId).filter(Boolean));
  const siteOk = (x) => !visSites || !x.siteId || visSites.has(x.siteId);
  out.documents = documents.filter(siteOk);
  out.docflows = docflows.filter(siteOk);
  out.maintenances = maintenances.filter(siteOk);
  out.reports = reports.filter(siteOk);
  out.movements = user.role === 'admin' ? movements : movements.filter(siteOk);
  if (user.role === 'admin') out.users = (await db.list('users')).map(publicUser);
  else out.users = (await db.list('users')).filter((u) => u.role !== 'technicien' || sc.techIds.has(u.technicianId)).map((u) => ({ login: u.login, name: u.name, role: u.role, technicianId: u.technicianId || '' }));
  return ok(out);
}

// ---------- Techniciens ----------
function techFields(b, prev = {}) {
  return {
    ...prev,
    firstName: str(b.firstName ?? prev.firstName, 80), lastName: str(b.lastName ?? prev.lastName, 80),
    phone: str(b.phone ?? prev.phone, 40), email: str(b.email ?? prev.email, 120), address: str(b.address ?? prev.address, 250),
    position: str(b.position ?? prev.position, 80), entryDate: date(b.entryDate ?? prev.entryDate),
    metier: str(b.metier ?? prev.metier, 60), siteId: str(b.siteId ?? prev.siteId, 20),
    managerId: str(b.managerId ?? prev.managerId, 40),
    skills: Array.isArray(b.skills) ? b.skills.map((s) => str(s, 60)).filter(Boolean).slice(0, 30) : (prev.skills || []),
    notes: str(b.notes ?? prev.notes, 1000), active: b.active === undefined ? (prev.active ?? true) : !!b.active,
  };
}

function habFields(b) {
  // Le type est libre : un nouveau référentiel peut être saisi sans redéploiement.
  const kind = str(b.kind, 60) || 'Autre';
  return { id: rid(), kind, symbol: str(b.symbol, 60), issued: date(b.issued), expires: date(b.expires), org: str(b.org, 120), addedAt: now() };
}

// ---------- Conflits de planning ----------
function slotsOverlap(a, b) { return a === 'journée' || b === 'journée' || a === b; }
async function conflictsFor(a) {
  const [assignments, absences, tech] = await Promise.all([db.list('assignments'), db.list('absences'), db.get('technicians', a.techId)]);
  const out = [];
  assignments.filter((x) => x.id !== a.id && x.techId === a.techId && x.date === a.date && slotsOverlap(x.slot, a.slot))
    .forEach((x) => out.push({ kind: 'double', with: x.id, message: 'Déjà affecté ce jour-là (' + x.slot + ')' }));
  absences.filter((x) => x.techId === a.techId && x.start <= a.date && (x.end || x.start) >= a.date && x.type !== 'retard')
    .forEach(() => out.push({ kind: 'absence', message: 'Absence signalée ce jour-là' }));
  (tech?.habilitations || []).forEach((h) => { if (h.expires && h.expires < a.date && !(tech.habilitations || []).some((o) => o.kind === h.kind && o.symbol === h.symbol && o.expires >= a.date)) out.push({ kind: 'habilitation', message: 'Habilitation ' + (h.symbol || h.kind) + ' expirée' }); });
  return out;
}

// ---------- Pointage (feuilles d'heures) ----------
const TS_STATUS = ['Envoyée', 'Validée', 'Refusée'];
const parisToday = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
function canSeeSheet(f, user, sc) {
  if (user.role === 'admin') return true;
  if (f.techId && f.techId === user.technicianId) return true;
  if (user.role === 'chef') return (f.lines || []).some((l) => sc.chantierIds.has(l.chantierId));
  return false;
}
// Le chef valide seulement si TOUTES les lignes sont sur SES chantiers, et jamais sa propre feuille
function canDecideSheet(f, user, chantiers) {
  if (user.role === 'admin') return '';
  if (user.role !== 'chef') return 'Seul le chef de chantier ou l\'administrateur valide les heures.';
  if (f.techId && f.techId === user.technicianId) return 'Vous ne pouvez pas valider votre propre feuille d\'heures.';
  const mine = (l) => { const c = chantiers.find((x) => x.id === l.chantierId); return c && c.chefId === user.login; };
  if (!(f.lines || []).every(mine)) return 'Cette feuille contient des heures sur un chantier qui n\'est pas le vôtre : l\'administrateur la valide.';
  return '';
}
// Ajoute (+1) ou retire (-1) les heures d'une feuille validée aux heures réalisées
async function applySheet(f, sign) {
  const byTask = {}, byCh = {};
  for (const l of f.lines || []) { if (l.taskId) byTask[l.taskId] = (byTask[l.taskId] || 0) + l.hours; else byCh[l.chantierId] = (byCh[l.chantierId] || 0) + l.hours; }
  const r2 = (n) => Math.max(0, Math.round(n * 100) / 100);
  for (const [id, hrs] of Object.entries(byTask)) { const t = await db.get('tasks', id); if (t) { t.tsHours = r2((t.tsHours || 0) + sign * hrs); await db.put('tasks', id, t); } }
  for (const [id, hrs] of Object.entries(byCh)) { const c = await db.get('chantiers', id); if (c) { c.tsOther = r2((c.tsOther || 0) + sign * hrs); await db.put('chantiers', id, c); } }
}
// Agrégat d'heures par mois / site / chantier / technicien, tenu à jour à chaque validation.
async function applyTimelog(f, sign) {
  const month = String(f.date || '').slice(0, 7);
  if (!month) return;
  const tl = (await db.get('settings', 'timelog')) || { months: {} };
  tl.months = tl.months || {};
  const m = tl.months[month] || { total: 0, bySite: {}, byChantier: {}, byTech: {} };
  const chantiers = await db.list('chantiers');
  const r2 = (n) => Math.max(0, Math.round(n * 100) / 100);
  const add = (obj, key, v) => { if (!key) return; obj[key] = r2((obj[key] || 0) + v); };
  add(m.byTech, f.techId, sign * (f.total || 0));
  (f.lines || []).forEach((l) => {
    add(m.byChantier, l.chantierId, sign * l.hours);
    const c = chantiers.find((x) => x.id === l.chantierId);
    if (c && c.siteId) add(m.bySite, c.siteId, sign * l.hours);
  });
  m.total = r2((m.total || 0) + sign * (f.total || 0));
  tl.months[month] = m; tl.updatedAt = now();
  await db.put('settings', 'timelog', tl);
}

async function checkSheetBody(b, user, sc, techId) {
  const d = date(b.date);
  if (!d) return { err: 'La date est obligatoire.' };
  if (d > parisToday()) return { err: 'On ne peut pas pointer un jour qui n\'est pas encore passé.' };
  if (user.role === 'technicien' && d < new Date(Date.now() - 31 * 864e5).toISOString().slice(0, 10)) return { err: 'Ce jour date de plus d\'un mois : demandez à l\'administrateur.' };
  if (!Array.isArray(b.lines) || !b.lines.length) return { err: 'Ajoutez au moins une ligne (chantier et heures).' };
  if (b.lines.length > 12) return { err: '12 lignes maximum par jour.' };
  const tasks = await db.list('tasks');
  const lines = []; const seen = new Set(); let total = 0;
  for (const [i, l] of b.lines.entries()) {
    const n = 'Ligne ' + (i + 1) + ' : ';
    const chantierId = str(l.chantierId, 20); const taskId = str(l.taskId, 20);
    if (!chantierId) return { err: n + 'choisissez un chantier.' };
    const ch = sc.chantiers.find((c) => c.id === chantierId);
    if (!ch) return { err: n + 'chantier introuvable.' };
    if (user.role !== 'admin' && !sc.chantierIds.has(chantierId)) return { err: n + 'ce chantier ne fait pas partie de vos chantiers.' };
    if (ch.status === 'Clôturé') return { err: n + 'ce chantier est clôturé.' };
    if (taskId) { const t = tasks.find((x) => x.id === taskId); if (!t || t.chantierId !== chantierId) return { err: n + 'la tâche ne correspond pas au chantier.' }; if (t.status === 'Annulée') return { err: n + 'cette tâche est annulée.' }; }
    const hv = Number(l.hours);
    if (!Number.isFinite(hv) || hv <= 0) return { err: n + 'indiquez un nombre d\'heures supérieur à 0.' };
    if (hv > 24) return { err: n + '24 h maximum.' };
    const k = chantierId + '|' + taskId; if (seen.has(k)) return { err: n + 'même chantier et même tâche déjà saisis sur une autre ligne.' }; seen.add(k);
    total += hv; lines.push({ chantierId, taskId, hours: Math.round(hv * 100) / 100, note: str(l.note, 300) });
  }
  if (total > 24) return { err: 'Total de la journée : ' + total + ' h. 24 h maximum.' };
  const warnings = [];
  const abs = (await db.list('absences')).find((a) => a.techId === techId && a.type !== 'retard' && a.status !== 'Refusée' && a.start <= d && (a.end || a.start) >= d);
  if (abs) warnings.push('Une absence est enregistrée ce jour-là.');
  if (total > 10) warnings.push('Plus de 10 h dans la journée.');
  return { d, lines, total: Math.round(total * 100) / 100, warnings };
}

// ---------- Données d'exemple ----------
async function loadDemo(user) {
  const d = DEMO();
  for (const [coll, items] of Object.entries(d.collections)) for (const it of items) await db.put(coll, it.id, { ...it, demo: true });
  for (const h of d.history) await db.appendHistory(h.equipId, { ...h, demo: true }).catch(() => {});
  await log(user, 'données d\'exemple chargées', 'système', '-');
  return ok({ ok: true, counts: Object.fromEntries(Object.entries(d.collections).map(([k, v]) => [k, v.length])) });
}

async function clearDemo(user) {
  let n = 0;
  const demoEq = new Set();
  for (const c of ['sites', 'technicians', 'chantiers', 'tasks', 'assignments', 'absences', 'equipment', 'vehicles', 'timesheets', 'documents', 'docflows', 'maintenances', 'reports', 'movements']) {
    for (const it of await db.list(c)) if (it.demo) { if (c === 'equipment') demoEq.add(it.id); if (c === 'chantiers') demoEq.add('CH-' + it.id); await db.remove(c, it.id); n++; }
  }
  const tl = await db.get('settings', 'timelog'); if (tl && tl.demo) { await db.remove('settings', 'timelog'); n++; }
  for (const k of await db.allHistoryKeys()) if (demoEq.has(k.split('/')[1])) { const e = await db.getKey(k); if (e && e.demo) { await db.deleteKey(k); n++; } }
  await log(user, 'données d\'exemple effacées', 'système', '-', n + ' éléments');
  return ok({ ok: true, removed: n });
}

// ---------- Routeur ----------
export default async (req) => {
  try {
    return await route(req);
  } catch (e) {
    console.error('API error', e && e.message);
    return json(500, { error: 'Erreur serveur. Réessayez.' });
  }
};

async function route(req) {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const m = req.method;
  const [r0, r1, r2, r3] = parts;

  if (r0 === 'health') return ok({ ok: true, name: COMPANY });
  if (r0 === 'login' && m === 'POST') return login(req);
  if (r0 === 'public' && r1 === 'e' && r2 && m === 'GET') {
    const e = await db.get('equipment', r2);
    return e ? ok({ id: e.id, name: e.name }) : notFound('Équipement inconnu.');
  }

  const user = await authenticate(req);
  if (!user) return json(401, { error: 'Connexion requise.' });
  const isAdmin = user.role === 'admin';
  const body = ['POST', 'PUT', 'PATCH'].includes(m) ? await req.json().catch(() => ({})) : {};

  // ----- Moi -----
  if (r0 === 'me' && !r1 && m === 'GET') return ok(publicUser(user));
  if (r0 === 'me' && r1 === 'password' && m === 'POST') {
    if (!verifyPassword(String(body.current || ''), user.hash)) return bad('Mot de passe actuel incorrect.');
    const next = String(body.next || '');
    if (next.length < 10) return bad('Le nouveau mot de passe doit faire au moins 10 caractères.');
    user.hash = hashPassword(next); user.tokenVersion = (user.tokenVersion || 0) + 1;
    await db.put('users', user.login, user);
    await log(user, 'mot de passe changé', 'utilisateur', user.login);
    return ok({ token: signToken(user) });
  }
  if (r0 === 'bootstrap' && m === 'GET') return bootstrap(user);

  // ----- Utilisateurs (admin seul) -----
  if (r0 === 'users') {
    if (!isAdmin) return deny();
    if (m === 'GET') return ok((await db.list('users')).map(publicUser));
    if (m === 'POST' && !r1) {
      const loginName = str(body.login, 40).toLowerCase();
      if (!/^[a-z0-9._-]{3,40}$/.test(loginName)) return bad('Identifiant : 3 à 40 caractères (lettres minuscules, chiffres, . _ -).');
      if (await db.get('users', loginName)) return bad('Cet identifiant existe déjà.');
      if (!ROLES.includes(body.role) || body.role === 'admin') return bad('Rôle invalide (chef ou technicien).');
      if (String(body.password || '').length < 10) return bad('Mot de passe : au moins 10 caractères.');
      const techLink = str(body.technicianId, 40);
      if (techLink && (await db.list('users')).some((x) => x.technicianId === techLink)) return bad('Cette fiche technicien est déjà liée à un autre compte.');
      const u = { login: loginName, name: str(body.name, 80) || loginName, role: body.role, technicianId: str(body.technicianId, 40), hash: hashPassword(body.password), active: true, tokenVersion: 0, createdAt: now(), demo: !!body.demo };
      await db.put('users', loginName, u);
      await log(user, 'compte créé', 'utilisateur', loginName, u.role);
      return ok(publicUser(u));
    }
    if (m === 'PUT' && r1) {
      const u = await db.get('users', r1);
      if (!u) return notFound();
      if (u.login === 'admin' && (body.active === false || (body.role && body.role !== 'admin'))) return bad('Le compte administrateur principal ne peut pas être désactivé.');
      if (body.name !== undefined) u.name = str(body.name, 80);
      if (body.technicianId !== undefined) {
        const techLink = str(body.technicianId, 40);
        if (techLink && (await db.list('users')).some((x) => x.login !== u.login && x.technicianId === techLink)) return bad('Cette fiche technicien est déjà liée à un autre compte.');
        u.technicianId = techLink;
      }
      if (body.role && ROLES.includes(body.role) && body.role !== 'admin') u.role = body.role;
      if (body.active !== undefined) { u.active = !!body.active; u.tokenVersion = (u.tokenVersion || 0) + 1; }
      if (body.password) { if (String(body.password).length < 10) return bad('Mot de passe : au moins 10 caractères.'); u.hash = hashPassword(body.password); u.tokenVersion = (u.tokenVersion || 0) + 1; }
      await db.put('users', u.login, u);
      await log(user, 'compte modifié', 'utilisateur', u.login);
      return ok(publicUser(u));
    }
    return deny();
  }

  // ----- Techniciens -----
  if (r0 === 'technicians') {
    if (m === 'POST' && !r1) {
      if (!isAdmin) return deny();
      const t = { id: 'T' + rid(8), ...techFields(body), habilitations: [], createdAt: now(), updatedAt: now() };
      if (!t.lastName) return bad('Le nom est obligatoire.');
      { const err = firstErr(badPhone(t.phone), badEmail(t.email)); if (err) return bad(err); }
      await db.put('technicians', t.id, t);
      await log(user, 'technicien créé', 'technicien', t.id, t.firstName + ' ' + t.lastName);
      return ok(t);
    }
    if (m === 'PUT' && r1 && !r2) {
      if (!isAdmin) return deny();
      const prev = await db.get('technicians', r1); if (!prev) return notFound();
      const t = { ...techFields(body, prev), updatedAt: now() };
      { const err = firstErr(t.lastName ? '' : 'Le nom est obligatoire.', badPhone(t.phone), badEmail(t.email)); if (err) return bad(err); }
      await db.put('technicians', t.id, t);
      await log(user, 'technicien modifié', 'technicien', t.id);
      return ok(t);
    }
    if (m === 'POST' && r1 && r2 === 'habilitations') {
      if (!isAdmin) return deny();
      const t = await db.get('technicians', r1); if (!t) return notFound();
      const h = habFields(body);
      if (!h.expires) return bad('La date de fin de validité est obligatoire.');
      if (badOrder(h.issued, h.expires, 'x')) return bad('La fin de validité ne peut pas être avant la date de délivrance.');
      t.habilitations = [...(t.habilitations || []), h]; t.updatedAt = now();
      await db.put('technicians', t.id, t);
      await log(user, 'habilitation ajoutée', 'technicien', t.id, h.kind + ' ' + h.symbol + ' → ' + h.expires);
      return ok(t);
    }
    if (m === 'DELETE' && r1 && r2 === 'habilitations' && r3) {
      if (!isAdmin) return deny();
      const t = await db.get('technicians', r1); if (!t) return notFound();
      const h = (t.habilitations || []).find((x) => x.id === r3);
      if (!h) return notFound();
      t.habilitations = (t.habilitations || []).filter((x) => x.id !== r3); t.updatedAt = now();
      await db.put('technicians', t.id, t);
      await log(user, 'habilitation retirée', 'technicien', t.id, (h.kind || '') + ' ' + (h.symbol || ''));
      return ok(t);
    }
    if (m === 'DELETE') return deny('Suppression impossible : désactivez la fiche à la place.');
    return deny();
  }

  // ----- Chantiers -----
  if (r0 === 'chantiers') {
    const sc = await scope(user);
    if (m === 'POST' && !r1) {
      if (!isAdmin) return deny();
      const c = { id: 'C' + rid(8), name: str(body.name, 120), siteId: str(body.siteId, 20), address: str(body.address, 250), client: str(body.client, 120), chefId: str(body.chefId, 40), start: date(body.start), endPlanned: date(body.endPlanned), status: CHANTIER_STATUS.includes(body.status) ? body.status : 'En préparation', team: Array.isArray(body.team) ? body.team.map((x) => str(x, 20)) : [], description: str(body.description, 2000), createdAt: now(), updatedAt: now() };
      if (!c.name) return bad('Le nom du chantier est obligatoire.');
      if (badOrder(c.start, c.endPlanned, 'x')) return bad('La date de fin prévue ne peut pas être avant la date de début.');
      if (sc.chantiers.some((x) => x.name.toLowerCase() === c.name.toLowerCase())) return bad('Un chantier porte déjà ce nom. Ajoutez une précision (lieu, phase…).');
      await db.put('chantiers', c.id, c);
      await log(user, 'chantier créé', 'chantier', c.id, c.name);
      return ok(c);
    }
    if (r1 && !sc.chantierIds.has(r1)) return deny('Ce chantier ne fait pas partie de vos chantiers.');
    if (m === 'PUT' && r1 && !r2) {
      const c = await db.get('chantiers', r1); if (!c) return notFound();
      const prevStatus = c.status;
      if (isAdmin) {
        for (const k of ['name', 'address', 'client', 'chefId', 'description', 'siteId']) if (body[k] !== undefined) c[k] = str(body[k], k === 'description' ? 2000 : 250);
        for (const k of ['start', 'endPlanned']) if (body[k] !== undefined) c[k] = date(body[k]);
        if (body.status && CHANTIER_STATUS.includes(body.status)) c.status = body.status;
        if (Array.isArray(body.team)) c.team = body.team.map((x) => str(x, 20));
        if (!c.name) return bad('Le nom du chantier est obligatoire.');
        if (badOrder(c.start, c.endPlanned, 'x')) return bad('La date de fin prévue ne peut pas être avant la date de début.');
      } else if (user.role === 'chef') {
        // Le chef peut seulement proposer la clôture et gérer l'équipe de SES chantiers
        if (body.status === 'Clôture proposée') c.status = 'Clôture proposée';
        else if (Array.isArray(body.team)) c.team = body.team.map((x) => str(x, 20));
        else return deny('Seul l\'administrateur modifie les informations principales du chantier.');
      } else return deny();
      if (c.status !== prevStatus && ['Clôture proposée', 'Clôturé'].includes(c.status)) {
        const open = (await db.list('tasks')).filter((t) => t.chantierId === c.id && ['À faire', 'En cours', 'Bloquée'].includes(t.status));
        if (open.length) return bad('Clôture impossible : ' + open.length + ' tâche' + (open.length > 1 ? 's' : '') + ' encore à faire, en cours ou bloquée' + (open.length > 1 ? 's' : '') + ' (' + open.slice(0, 3).map((t) => '« ' + t.title + ' »').join(', ') + (open.length > 3 ? '…' : '') + '). Terminez-les ou demandez à l\'administrateur de les annuler.');
        const waiting = (await db.list('timesheets')).filter((f) => f.status === 'Envoyée' && (f.lines || []).some((l) => l.chantierId === c.id));
        if (waiting.length) return bad('Clôture impossible : ' + waiting.length + ' feuille' + (waiting.length > 1 ? 's' : '') + ' d\'heures à valider sur ce chantier.');
      }
      c.updatedAt = now();
      await db.put('chantiers', c.id, c);
      await log(user, 'chantier modifié', 'chantier', c.id, body.status || '');
      return ok(c);
    }
    if (r2 === 'notes' && m === 'GET') return ok(await db.listHistory('CH-' + r1));
    if (r2 === 'notes' && m === 'POST') {
      // Photos / documents / remarques du chantier (ajout seul)
      if (!str(body.content) && !str(body.title) && !(Array.isArray(body.photos) && body.photos.length)) return bad('Ajoutez au moins un titre, un texte ou une photo.');
      const photos = await savePhotos(body.photos);
      if (user.role === 'technicien' && !photos.length) return deny('Le technicien peut ajouter uniquement des photos.');
      const e = { id: rid(12), equipId: 'CH-' + r1, chantierId: r1, type: photos.length ? 'photo' : 'remarque', content: str(body.content, 4000), title: str(body.title, 150), photos, author: user.login, authorName: user.name, at: now() };
      await db.appendHistory(e.equipId, e);
      await log(user, 'ajout chantier', 'chantier', r1, e.type);
      return ok(e);
    }
    if (m === 'DELETE') return deny('Un chantier n\'est jamais effacé : il est archivé (clôturé).');
    return deny();
  }

  // ----- Tâches -----
  if (r0 === 'tasks') {
    const sc = await scope(user);
    if (m === 'POST' && !r1) {
      if (user.role === 'technicien') return deny();
      if (!sc.chantierIds.has(body.chantierId)) return deny('Chantier non autorisé.');
      { const err = firstErr(badHours(body.plannedHours, 'Heures prévues'), badHours(body.doneHours, 'Heures réalisées'), badOrder(date(body.start), date(body.end), 'L\'échéance ne peut pas être avant la date de début.')); if (err) return bad(err); }
      const t = { id: 'K' + rid(8), chantierId: body.chantierId, title: str(body.title, 200), status: TASK_STATUS.includes(body.status) ? body.status : 'À faire', plannedHours: num(body.plannedHours), doneHours: num(body.doneHours), start: date(body.start), end: date(body.end), assignee: str(body.assignee, 20), requiredHab: str(body.requiredHab, 40), blockReason: str(body.blockReason, 300), createdAt: now(), updatedAt: now(), history: [] };
      if (!t.title) return bad('Le titre est obligatoire.');
      await db.put('tasks', t.id, t);
      await log(user, 'tâche créée', 'tâche', t.id, t.title);
      return ok(t);
    }
    if (m === 'PUT' && r1) {
      const t = await db.get('tasks', r1); if (!t) return notFound();
      if (!sc.chantierIds.has(t.chantierId)) return deny();
      const isTech = user.role === 'technicien';
      if (isTech && t.assignee !== user.technicianId) return deny('Vous ne pouvez modifier que vos propres tâches.');
      { const err = firstErr(badHours(body.doneHours, 'Heures réalisées'), isTech ? '' : badHours(body.plannedHours, 'Heures prévues'), isTech ? '' : badOrder(body.start !== undefined ? date(body.start) : t.start, body.end !== undefined ? date(body.end) : t.end, 'L\'échéance ne peut pas être avant la date de début.')); if (err) return bad(err); }
      const conflict = body.baseUpdatedAt && body.baseUpdatedAt !== t.updatedAt;
      const before = { status: t.status, doneHours: t.doneHours, plannedHours: t.plannedHours, by: t.lastBy || '', at: t.updatedAt };
      if (body.status) {
        if (!TASK_STATUS.includes(body.status)) return bad('Statut invalide.');
        if (body.status === 'Annulée' && !isAdmin) return deny('Seul l\'administrateur peut annuler une tâche.');
        if (body.status === 'Bloquée' && !str(body.blockReason || t.blockReason)) return bad('Le motif de blocage est obligatoire.');
        t.status = body.status;
      }
      if (body.blockReason !== undefined) t.blockReason = str(body.blockReason, 300);
      if (body.doneHours !== undefined && Number(body.doneHours) !== Number(t.doneHours || 0)) {
        if (isTech) return deny('Les heures se déclarent dans votre feuille d\'heures (menu « Mes heures »), validée par le chef.');
        t.doneHours = num(body.doneHours);
      }
      if (!isTech) {
        for (const k of ['title']) if (body[k] !== undefined) t[k] = str(body[k], 200);
        if (body.plannedHours !== undefined) t.plannedHours = num(body.plannedHours);
        for (const k of ['start', 'end']) if (body[k] !== undefined) t[k] = date(body[k]);
        for (const k of ['assignee', 'requiredHab']) if (body[k] !== undefined) t[k] = str(body[k], 40);
      }
      t.history = [...(t.history || []), before].slice(-20);
      if (conflict) t.conflicts = [...(t.conflicts || []), { at: now(), by: user.login, previous: before }].slice(-10);
      t.updatedAt = now(); t.lastBy = user.login;
      await db.put('tasks', t.id, t);
      await log(user, conflict ? 'tâche modifiée (CONFLIT signalé)' : 'tâche modifiée', 'tâche', t.id, t.status);
      return ok({ ...t, conflict: !!conflict });
    }
    if (m === 'DELETE') return deny('Une tâche ne s\'efface pas : l\'administrateur peut l\'annuler.');
    return deny();
  }

  // ----- Planning -----
  if (r0 === 'assignments') {
    const sc = await scope(user);
    if (m === 'POST' && !r1) {
      if (user.role === 'technicien') return deny();
      if (!sc.chantierIds.has(body.chantierId)) return deny('Chantier non autorisé.');
      if (user.role === 'chef') {
        const c = sc.chantiers.find((x) => x.id === body.chantierId);
        if (!(c.team || []).includes(body.techId) && !sc.techIds.has(body.techId)) return deny('Ce technicien ne fait pas partie de votre équipe.');
      }
      const a = { id: 'A' + rid(8), techId: str(body.techId, 20), chantierId: body.chantierId, date: date(body.date), slot: SLOTS.includes(body.slot) ? body.slot : 'journée', note: str(body.note, 200), createdBy: user.login, createdAt: now() };
      if (!a.date || !a.techId) return bad('Technicien et date obligatoires.');
      const conflicts = await conflictsFor(a);
      await db.put('assignments', a.id, a);
      await log(user, 'affectation', 'planning', a.id, a.techId + ' ' + a.date + (conflicts.length ? ' (conflit)' : ''));
      return ok({ ...a, conflicts });
    }
    if (m === 'DELETE' && r1) {
      if (user.role === 'technicien') return deny();
      const a = await db.get('assignments', r1); if (!a) return notFound();
      if (!sc.chantierIds.has(a.chantierId)) return deny();
      await db.remove('assignments', a.id);
      await log(user, 'affectation retirée', 'planning', a.id, a.techId + ' ' + a.date);
      return ok({ ok: true });
    }
    return deny();
  }

  // ----- Absences -----
  if (r0 === 'absences') {
    const sc = await scope(user);
    if (m === 'POST' && !r1) {
      const techId = str(body.techId, 20);
      let type = ABS_TYPES.includes(body.type) ? body.type : 'absence';
      let status = 'Signalée';
      if (user.role === 'technicien') {
        if (techId !== user.technicianId) return deny();
        if (type !== 'congé') return deny('Un technicien peut seulement demander un congé.');
        status = 'Demandée';
      } else if (!sc.techIds.has(techId)) return deny('Ce technicien ne fait pas partie de votre équipe.');
      const a = { id: 'B' + rid(8), techId, type, start: date(body.start), end: date(body.end) || date(body.start), time: str(body.time, 10), motif: str(body.motif, 500), status: isAdmin ? 'Validée' : status, author: user.login, createdAt: now(), history: [] };
      if (!a.start) return bad('La date est obligatoire.');
      if (badOrder(a.start, a.end, 'x')) return bad('La date de fin ne peut pas être avant la date de début.');
      if (a.type === 'retard' && !a.time) return bad('Indiquez l\'heure d\'arrivée pour un retard.');
      const all = await db.list('absences');
      if (all.some((x) => x.techId === a.techId && x.type === a.type && x.status !== 'Refusée' && x.start <= a.end && (x.end || x.start) >= a.start)) return bad('Une absence du même type existe déjà sur ces dates pour ce technicien.');
      await db.put('absences', a.id, a);
      await log(user, 'absence signalée', 'absence', a.id, techId);
      return ok(redactAbsence(a, user));
    }
    if (m === 'PUT' && r1) {
      if (!isAdmin) return deny('Seul l\'administrateur valide ou modifie une absence.');
      const a = await db.get('absences', r1); if (!a) return notFound();
      a.history = [...(a.history || []), { type: a.type, start: a.start, end: a.end, status: a.status, motif: a.motif, at: now(), by: user.login }];
      if (body.type && ABS_TYPES.includes(body.type)) a.type = body.type;
      if (body.start) a.start = date(body.start);
      if (body.end) a.end = date(body.end);
      if (badOrder(a.start, a.end, 'x')) return bad('La date de fin ne peut pas être avant la date de début.');
      if (body.motif !== undefined) a.motif = str(body.motif, 500);
      if (['Signalée', 'Demandée', 'Validée', 'Refusée'].includes(body.status)) a.status = body.status;
      await db.put('absences', a.id, a);
      await log(user, 'absence modifiée', 'absence', a.id, a.status);
      return ok(a);
    }
    if (m === 'DELETE') return deny('Une absence ne s\'efface pas : l\'administrateur peut la refuser ou la corriger.');
    return deny();
  }

  // ----- Équipements et historique -----
  if (r0 === 'equipment') {
    if (r1 && user.role === 'chef') {
      const eqc = await db.get('equipment', r1);
      if (eqc && eqc.chantierId && !(await scope(user)).chantierIds.has(eqc.chantierId)) return deny('Ce matériel appartient à un chantier qui n\'est pas le vôtre.');
    }
    if (m === 'POST' && !r1) {
      if (!isAdmin) return deny('Seul l\'administrateur crée les fiches matériel et leurs QR codes.');
      let id = eqCode();
      while (await db.get('equipment', id)) id = eqCode();
      const e = { id, createdAt: now(), updatedAt: now(), createdBy: user.login, labelPrints: 0, qrVersion: 1, qrDisabled: false, qrHistory: [] };
      for (const k of EQUIP_FIELDS) if (body[k] !== undefined) e[k] = str(body[k], EQUIP_MAX[k] || 200);
      for (const k of EQUIP_DATES) e[k] = date(body[k]);
      e.name = str(body.name, 150);
      e.status = str(body.status, 40) || 'En service';
      e.criticality = str(body.criticality, 20) || 'Standard';
      if (!e.name) return bad('La désignation est obligatoire.');
      await db.put('equipment', e.id, e);
      await log(user, 'équipement créé + QR code', 'équipement', e.id, e.name);
      return ok(e);
    }
    if (r1 && !r2 && m === 'GET') { const e = await db.get('equipment', r1); return e ? ok(e) : notFound('Équipement inconnu.'); }
    if (r1 && !r2 && m === 'PUT') {
      if (!isAdmin) return deny('Seul l\'administrateur modifie les informations principales.');
      const e = await db.get('equipment', r1); if (!e) return notFound();
      for (const k of EQUIP_FIELDS) if (body[k] !== undefined) e[k] = str(body[k], EQUIP_MAX[k] || 200);
      for (const k of EQUIP_DATES) if (body[k] !== undefined) e[k] = date(body[k]);
      e.updatedAt = now();
      await db.put('equipment', e.id, e);
      await log(user, 'équipement modifié', 'équipement', e.id);
      return ok(e);
    }
    if (r1 && r2 === 'label' && m === 'POST') {
      if (!isAdmin) return deny('Seul l\'administrateur imprime les étiquettes.');
      const e = await db.get('equipment', r1); if (!e) return notFound();
      e.labelPrints = (e.labelPrints || 0) + 1; e.lastLabelAt = now();
      await db.put('equipment', e.id, e);
      await log(user, 'étiquette imprimée', 'équipement', e.id, 'impression n°' + e.labelPrints);
      return ok(e);
    }
    if (r1 && r2 === 'qr' && m === 'POST') {
      // Création, régénération, désactivation et réactivation du QR code :
      // réservées à l'administrateur (webmaster), jamais à un chef ou un technicien.
      if (!isAdmin) return deny('Seul le webmaster (administrateur) gère les QR codes des équipements.');
      const e = await db.get('equipment', r1); if (!e) return notFound('Équipement inconnu.');
      const action = str(body.action, 20);
      const reason = str(body.reason, 300);
      if (!['regenerate', 'deactivate', 'reactivate'].includes(action)) return bad('Action QR inconnue.');
      if (action !== 'regenerate' && !reason) return bad('Le motif est obligatoire pour désactiver ou réactiver un QR code.');
      e.qrHistory = [...(e.qrHistory || []), { action, at: now(), by: user.login, reason, version: e.qrVersion || 1 }];
      if (action === 'regenerate') { e.qrVersion = (e.qrVersion || 1) + 1; e.qrDisabled = false; e.qrDisabledAt = ''; e.qrDisabledReason = ''; }
      if (action === 'deactivate') { e.qrDisabled = true; e.qrDisabledAt = now(); e.qrDisabledReason = reason; }
      if (action === 'reactivate') { e.qrDisabled = false; e.qrDisabledAt = ''; e.qrDisabledReason = ''; }
      e.updatedAt = now();
      await db.put('equipment', e.id, e);
      await log(user, 'QR code : ' + action, 'équipement', e.id, 'version ' + e.qrVersion);
      return ok(e);
    }
    if (r1 && r2 === 'history' && m === 'GET') {
      if (!(await db.get('equipment', r1))) return notFound();
      return ok(await db.listHistory(r1));
    }
    if (r1 && r2 === 'history' && m === 'POST') {
      const eq = await db.get('equipment', r1); if (!eq) return notFound('Équipement inconnu.');
      let type = HIST_TYPES.includes(body.type) ? body.type : 'intervention';
      let original = null;
      if (type === 'correction' || type === 'masquage') {
        const hist = await db.listHistory(r1);
        original = hist.find((h) => h.id === body.correctsId);
        if (!original) return bad('Entrée d\'origine introuvable.');
        if (type === 'masquage' && !isAdmin) return deny('Seul l\'administrateur peut masquer une entrée (jamais l\'effacer).');
        if (type === 'correction' && user.role === 'technicien' && original.author !== user.login) return deny('Un technicien corrige seulement ses propres entrées.');
        if (!str(body.reason)) return bad('Le motif est obligatoire.');
      }
      { const err = badHours(body.duration, 'Durée'); if (err) return bad(err); }
      // idempotence pour les envois hors ligne rejoués
      const clientId = str(body.clientId, 40);
      if (clientId) {
        const hist = await db.listHistory(r1);
        const dup = hist.find((h) => h.clientId === clientId);
        if (dup) return ok({ ...dup, duplicate: true });
      }
      const photos = await savePhotos(body.photos);
      const e = { id: rid(12), equipId: r1, type, content: str(body.content, 4000), duration: num(body.duration), photos, correctsId: original ? original.id : '', reason: str(body.reason, 500), author: user.login, authorName: user.name, authorRole: user.role, at: now(), clientAt: str(body.clientAt, 40), clientId, offline: !!body.offline };
      if (!e.content && !photos.length && type !== 'masquage') return bad('Contenu ou photo obligatoire.');
      await db.appendHistory(r1, e);
      await log(user, 'historique : ' + type, 'équipement', r1, e.content.slice(0, 80));
      return ok(e);
    }
    if (m === 'DELETE') return deny('L\'historique et les fiches matériel ne peuvent pas être supprimés.');
    return deny();
  }

  if (r0 === 'history' && m === 'DELETE') return deny('L\'historique ne peut pas être supprimé.');

  // ----- Sites (Paluel, Tricastin, Cruas…) -----
  if (r0 === 'sites') {
    if (m === 'GET' && !r1) return ok(await db.list('sites'));
    if (m === 'POST' && !r1) {
      if (!isAdmin) return deny();
      const site = { id: 'S' + rid(6), name: str(body.name, 80), code: str(body.code, 12), address: str(body.address, 200), type: str(body.type, 40) || 'Centrale nucléaire', manager: str(body.manager, 80), notes: str(body.notes, 500), createdAt: now() };
      if (!site.name) return bad('Le nom du site est obligatoire.');
      await db.put('sites', site.id, site);
      await log(user, 'site créé', 'site', site.id, site.name);
      return ok(site);
    }
    if (m === 'PUT' && r1) {
      if (!isAdmin) return deny();
      const site = await db.get('sites', r1); if (!site) return notFound();
      for (const k of ['name', 'code', 'address', 'type', 'manager']) if (body[k] !== undefined) site[k] = str(body[k], 200);
      if (body.notes !== undefined) site.notes = str(body.notes, 500);
      await db.put('sites', site.id, site);
      await log(user, 'site modifié', 'site', site.id, site.name);
      return ok(site);
    }
    return deny();
  }

  // ----- Parc véhicules -----
  if (r0 === 'vehicles') {
    const VEH_STATUS = ['Disponible', 'Affecté', 'Atelier', 'Hors service'];
    const VEH_TYPES = ['Fourgon', 'Camionnette', 'Voiture', 'Utilitaire', 'Camion nacelle', 'Pick-up'];
    if (m === 'GET' && !r1) return ok(await db.list('vehicles'));
    if (m === 'POST' && !r1) {
      if (!isAdmin && user.role !== 'chef') return deny();
      const v = {
        id: 'V' + rid(6), plate: str(body.plate, 20).toUpperCase(), brand: str(body.brand, 40), model: str(body.model, 60),
        type: VEH_TYPES.includes(body.type) ? body.type : 'Fourgon', siteId: str(body.siteId, 20), assignedTo: str(body.assignedTo, 20),
        km: num(body.km), status: VEH_STATUS.includes(body.status) ? body.status : 'Disponible',
        ct: date(body.ct), insurance: date(body.insurance), nextService: date(body.nextService), nextServiceKm: num(body.nextServiceKm),
        fuel: str(body.fuel, 20) || 'Diesel', notes: str(body.notes, 500), createdAt: now(), updatedAt: now(), createdBy: user.login,
      };
      if (!v.plate) return bad('L\'immatriculation est obligatoire.');
      if ((await db.list('vehicles')).some((x) => x.plate === v.plate)) return bad('Un véhicule porte déjà cette immatriculation.');
      await db.put('vehicles', v.id, v);
      await log(user, 'véhicule créé', 'véhicule', v.id, v.plate);
      return ok(v);
    }
    if (m === 'PUT' && r1) {
      if (!isAdmin && user.role !== 'chef') return deny();
      const v = await db.get('vehicles', r1); if (!v) return notFound();
      for (const k of ['plate', 'brand', 'model', 'siteId', 'assignedTo', 'fuel', 'notes']) if (body[k] !== undefined) v[k] = str(body[k], k === 'notes' ? 500 : 60);
      if (body.plate !== undefined) v.plate = str(body.plate, 20).toUpperCase();
      for (const k of ['ct', 'insurance', 'nextService']) if (body[k] !== undefined) v[k] = date(body[k]);
      for (const k of ['km', 'nextServiceKm']) if (body[k] !== undefined) v[k] = num(body[k]);
      if (body.type && VEH_TYPES.includes(body.type)) v.type = body.type;
      if (body.status && VEH_STATUS.includes(body.status)) v.status = body.status;
      v.updatedAt = now();
      await db.put('vehicles', v.id, v);
      await log(user, 'véhicule modifié', 'véhicule', v.id, v.plate);
      return ok(v);
    }
    if (m === 'DELETE' && r1) {
      if (!isAdmin) return deny();
      const v = await db.get('vehicles', r1); if (!v) return notFound();
      await db.remove('vehicles', v.id);
      await log(user, 'véhicule retiré', 'véhicule', v.id, v.plate);
      return ok({ ok: true });
    }
    return deny();
  }

  // ----- Bibliothèque documentaire (électricité, sécurité, nucléaire) -----
  const siteVisible = async (user2, siteId) => {
    if (!siteId) return true;
    if (user2.role === 'admin') return true;
    const sc2 = await scope(user2);
    return sc2.chantiers.some((c) => c.siteId === siteId);
  };
  if (r0 === 'documents') {
    if (m === 'GET' && !r1) {
      const all = await db.list('documents');
      if (user.role === 'admin') return ok(all);
      const sc2 = await scope(user); const ids = new Set(sc2.chantiers.map((c) => c.siteId));
      return ok(all.filter((x) => !x.siteId || ids.has(x.siteId)));
    }
    if (m === 'POST' && !r1) {
      if (!['admin', 'chef'].includes(user.role)) return deny('Seul l\'encadrement ajoute un document.');
      const doc = {
        id: 'DOC-' + rid(6), title: str(body.title, 200), category: str(body.category, 60) || 'Électricité',
        ref: str(body.ref, 80), version: str(body.version, 20) || '1.0', status: DOC_STATUS.includes(body.status) ? body.status : 'Valide',
        siteId: str(body.siteId, 20), owner: str(body.owner, 80), reviewAt: date(body.reviewAt), notes: str(body.notes, 1000),
        link: str(body.link, 500), tags: Array.isArray(body.tags) ? body.tags.map((t) => str(t, 40)).slice(0, 10) : [],
        createdAtTs: now(), updatedAt: now(), createdBy: user.login, history: [],
      };
      if (!doc.title) return bad('Le titre du document est obligatoire.');
      if (!(await siteVisible(user, doc.siteId))) return deny();
      await db.put('documents', doc.id, doc);
      await log(user, 'document ajouté', 'document', doc.id, doc.title);
      return ok(doc);
    }
    if (r1 && m === 'PUT') {
      if (!['admin', 'chef'].includes(user.role)) return deny();
      const doc = await db.get('documents', r1); if (!doc) return notFound('Document inconnu.');
      doc.history = [...(doc.history || []), { at: now(), by: user.login, version: doc.version, status: doc.status }].slice(-30);
      if (body.title !== undefined) doc.title = str(body.title, 200);
      for (const k of ['category', 'ref', 'version', 'owner', 'notes', 'link', 'siteId']) if (body[k] !== undefined) doc[k] = str(body[k], k === 'notes' ? 1000 : 200);
      if (body.status && DOC_STATUS.includes(body.status)) doc.status = body.status;
      if (body.reviewAt !== undefined) doc.reviewAt = date(body.reviewAt);
      doc.updatedAt = now();
      await db.put('documents', doc.id, doc);
      await log(user, 'document modifié', 'document', doc.id, doc.title);
      return ok(doc);
    }
    if (r1 && m === 'DELETE') {
      if (!isAdmin) return deny('Seul l\'administrateur archive un document.');
      const doc = await db.get('documents', r1); if (!doc) return notFound();
      doc.status = 'Archivé'; doc.updatedAt = now();
      await db.put('documents', doc.id, doc);
      await log(user, 'document archivé', 'document', doc.id, doc.title);
      return ok(doc);
    }
    return deny();
  }

  // ----- Courriers et documents administratifs (envois / réceptions) -----
  if (r0 === 'docflows') {
    if (m === 'GET' && !r1) {
      const all = await db.list('docflows');
      if (user.role === 'admin') return ok(all);
      const sc2 = await scope(user); const ids = new Set(sc2.chantiers.map((c) => c.siteId));
      return ok(all.filter((x) => !x.siteId || ids.has(x.siteId)));
    }
    if (m === 'POST' && !r1) {
      if (!['admin', 'chef'].includes(user.role)) return deny('Seul l\'encadrement enregistre un courrier.');
      const f = {
        id: 'FLW-' + rid(6), name: str(body.name, 200), type: str(body.type, 60) || 'Autre',
        direction: body.direction === 'Réception' ? 'Réception' : 'Envoi', to: str(body.to, 120), from: str(body.from, 120),
        siteId: str(body.siteId, 20), chantierId: str(body.chantierId, 20), status: FLOW_STATUS.includes(body.status) ? body.status : 'Attendu',
        ack: !!body.ack, version: str(body.version, 20), owner: str(body.owner, 80), notes: str(body.notes, 1000),
        sentAt: date(body.sentAt), receivedAt: date(body.receivedAt), createdAt: now(), updatedAt: now(), createdBy: user.login, history: [],
      };
      if (!f.name) return bad('Le libellé du courrier est obligatoire.');
      await db.put('docflows', f.id, f);
      await log(user, 'courrier enregistré', 'courrier', f.id, f.name);
      return ok(f);
    }
    if (r1 && m === 'PUT') {
      if (!['admin', 'chef'].includes(user.role)) return deny();
      const f = await db.get('docflows', r1); if (!f) return notFound('Courrier inconnu.');
      f.history = [...(f.history || []), { at: now(), by: user.login, status: f.status, ack: f.ack }].slice(-30);
      for (const k of ['name', 'type', 'to', 'from', 'siteId', 'chantierId', 'version', 'owner', 'notes']) if (body[k] !== undefined) f[k] = str(body[k], k === 'notes' ? 1000 : 200);
      if (body.status && FLOW_STATUS.includes(body.status)) f.status = body.status;
      if (body.ack !== undefined) f.ack = !!body.ack;
      for (const k of ['sentAt', 'receivedAt']) if (body[k] !== undefined) f[k] = date(body[k]);
      f.updatedAt = now();
      await db.put('docflows', f.id, f);
      await log(user, 'courrier mis à jour', 'courrier', f.id, f.status);
      return ok(f);
    }
    if (m === 'DELETE') return deny('Un courrier ne s\'efface pas : il peut être archivé.');
    return deny();
  }

  // ----- Maintenance et contrôles -----
  if (r0 === 'maintenances') {
    if (m === 'GET' && !r1) {
      const all = await db.list('maintenances');
      if (user.role === 'admin') return ok(all);
      const sc2 = await scope(user); const ids = new Set(sc2.chantiers.map((c) => c.siteId));
      return ok(all.filter((x) => !x.siteId || ids.has(x.siteId)));
    }
    if (m === 'POST' && !r1) {
      if (!['admin', 'chef'].includes(user.role)) return deny('Seul l\'encadrement planifie une maintenance.');
      const mt = {
        id: 'MNT-' + rid(6), equipId: str(body.equipId, 30), siteId: str(body.siteId, 20), chantierId: str(body.chantierId, 20),
        title: str(body.title, 200), kind: MAINT_KINDS.includes(body.kind) ? body.kind : 'Préventive',
        status: MAINT_STATUS.includes(body.status) ? body.status : 'Planifiée', dueDate: date(body.dueDate), doneAt: date(body.doneAt),
        assignee: str(body.assignee, 30), provider: str(body.provider, 80), notes: str(body.notes, 1000),
        createdAt: now(), updatedAt: now(), createdBy: user.login, history: [],
      };
      if (!mt.title) return bad('Le libellé de la maintenance est obligatoire.');
      if (!mt.equipId) return bad('Choisissez l\'équipement concerné.');
      await db.put('maintenances', mt.id, mt);
      await log(user, 'maintenance planifiée', 'maintenance', mt.id, mt.title);
      return ok(mt);
    }
    if (r1 && m === 'PUT') {
      if (!['admin', 'chef'].includes(user.role)) return deny();
      const mt = await db.get('maintenances', r1); if (!mt) return notFound('Maintenance inconnue.');
      mt.history = [...(mt.history || []), { at: now(), by: user.login, status: mt.status }].slice(-30);
      for (const k of ['equipId', 'siteId', 'chantierId', 'title', 'assignee', 'provider', 'notes']) if (body[k] !== undefined) mt[k] = str(body[k], k === 'notes' ? 1000 : 200);
      if (body.kind && MAINT_KINDS.includes(body.kind)) mt.kind = body.kind;
      if (body.status && MAINT_STATUS.includes(body.status)) mt.status = body.status;
      for (const k of ['dueDate', 'doneAt']) if (body[k] !== undefined) mt[k] = date(body[k]);
      if (mt.status === 'Réalisée' && !mt.doneAt) mt.doneAt = new Date().toISOString().slice(0, 10);
      mt.updatedAt = now();
      await db.put('maintenances', mt.id, mt);
      await log(user, 'maintenance mise à jour', 'maintenance', mt.id, mt.status);
      return ok(mt);
    }
    if (m === 'DELETE') return deny('Une maintenance ne s\'efface pas : elle peut être annulée.');
    return deny();
  }

  // ----- Signalements terrain (panne, dégât, demande, transfert) -----
  if (r0 === 'reports') {
    if (m === 'GET' && !r1) {
      const all = await db.list('reports');
      if (user.role === 'admin') return ok(all);
      const sc2 = await scope(user); const ids = new Set(sc2.chantiers.map((c) => c.siteId));
      return ok(all.filter((x) => !x.siteId || ids.has(x.siteId)));
    }
    if (m === 'POST' && !r1) {
      const eq = body.equipId ? await db.get('equipment', body.equipId) : null;
      if (body.equipId && !eq) return bad('Équipement inconnu.');
      const rep = {
        id: 'SIG-' + rid(6), equipId: eq ? eq.id : '', siteId: eq ? eq.siteId || '' : str(body.siteId, 20),
        type: REPORT_TYPES.includes(body.type) ? body.type : 'Panne',
        urgency: ['Basse', 'Normale', 'Haute'].includes(body.urgency) ? body.urgency : 'Normale',
        description: str(body.description, 2000), status: 'Ouvert',
        author: user.login, authorName: user.name, photos: await savePhotos(body.photos),
        resolution: '', createdAt: now(), closedAt: '', history: [],
      };
      if (!rep.description) return bad('Décrivez le signalement.');
      await db.put('reports', rep.id, rep);
      await log(user, 'signalement créé', 'signalement', rep.id, rep.type);
      return ok(rep);
    }
    if (r1 && m === 'PUT') {
      if (!['admin', 'chef'].includes(user.role)) return deny('Seul l\'encadrement traite un signalement.');
      const rep = await db.get('reports', r1); if (!rep) return notFound('Signalement inconnu.');
      rep.history = [...(rep.history || []), { at: now(), by: user.login, status: rep.status }].slice(-30);
      if (body.status && REPORT_STATUS.includes(body.status)) { rep.status = body.status; rep.closedAt = body.status === 'Clos' ? now() : ''; }
      if (body.resolution !== undefined) rep.resolution = str(body.resolution, 2000);
      if (body.urgency && ['Basse', 'Normale', 'Haute'].includes(body.urgency)) rep.urgency = body.urgency;
      rep.updatedAt = now();
      await db.put('reports', rep.id, rep);
      await log(user, 'signalement traité', 'signalement', rep.id, rep.status);
      return ok(rep);
    }
    if (m === 'DELETE') return deny('Un signalement ne s\'efface pas : il est conservé pour la traçabilité.');
    return deny();
  }

  // ----- Mouvements d'équipements (transferts entre sites) -----
  if (r0 === 'movements') {
    if (m === 'GET' && !r1) return ok(await db.list('movements'));
    if (m === 'POST' && !r1) {
      if (!isAdmin) return deny('Seul l\'administrateur enregistre un transfert d\'équipement.');
      const eq = await db.get('equipment', str(body.equipId, 30));
      if (!eq) return bad('Équipement inconnu.');
      const mv = {
        id: 'MVT-' + rid(6), equipId: eq.id, fromSite: eq.siteId || '', toSite: str(body.toSite, 20),
        fromLocation: eq.location || '', toLocation: str(body.toLocation, 200), date: date(body.date) || new Date().toISOString().slice(0, 10),
        author: user.login, note: str(body.note, 500), createdAt: now(),
      };
      await db.put('movements', mv.id, mv);
      eq.siteId = mv.toSite || eq.siteId;
      if (mv.toLocation) eq.location = mv.toLocation;
      eq.updatedAt = now();
      await db.put('equipment', eq.id, eq);
      await db.appendHistory(eq.id, { id: rid(12), equipId: eq.id, type: 'remarque', content: 'Transfert vers ' + (mv.toSite || 'site inconnu') + ' – ' + mv.toLocation, duration: 0, photos: [], correctsId: '', reason: '', author: user.login, authorName: user.name, authorRole: user.role, at: now(), clientAt: '', clientId: '', offline: false }).catch(() => {});
      await log(user, 'équipement transféré', 'équipement', eq.id, mv.fromSite + ' → ' + mv.toSite);
      return ok(mv);
    }
    return deny();
  }

  // ----- Photos -----
  if (r0 === 'photos' && r1 && m === 'GET') {
    const p = await db.getPhoto(r1);
    if (!p) return notFound();
    return ok({ id: r1, dataUrl: p });
  }

  // ----- Pointage : feuilles d'heures -----
  if (r0 === 'timesheets') {
    const sc = await scope(user);
    if (m === 'POST' && !r1) {
      let techId = str(body.techId, 20);
      if (user.role === 'technicien') { techId = user.technicianId; if (!techId) return bad('Votre compte n\'est relié à aucune fiche technicien.'); }
      else if (user.role === 'chef') { if (!user.technicianId || techId !== user.technicianId) return deny('Le chef valide les feuilles ; seul le technicien (ou l\'administrateur) les remplit.'); }
      else if (!techId || !(await db.get('technicians', techId))) return bad('Choisissez le technicien.');
      const chk = await checkSheetBody(body, user, sc, techId);
      if (chk.err) return bad(chk.err);
      const id = 'F-' + techId + '-' + chk.d;
      const prev = await db.get('timesheets', id);
      const clientId = str(body.clientId, 40);
      if (prev && clientId && prev.clientId === clientId) return ok({ ...prev, duplicate: true });
      if (prev && prev.status === 'Validée' && !isAdmin) return bad('La feuille du ' + chk.d.split('-').reverse().join('/') + ' est déjà validée : demandez une correction à l\'administrateur.');
      if (prev && prev.status === 'Validée') { await applySheet(prev, -1); await applyTimelog(prev, -1); }
      const f = {
        id, techId, date: chk.d, lines: chk.lines, total: chk.total, comment: str(body.comment, 500), warnings: chk.warnings,
        status: 'Envoyée', refuseReason: '', submittedBy: user.login, submittedAt: now(), clientId, offline: !!body.offline,
        decidedBy: '', decidedAt: '', createdAt: prev ? prev.createdAt : now(), updatedAt: now(),
        history: [...(prev ? prev.history || [] : []), ...(prev ? [{ at: now(), by: user.login, action: 'renvoyée', previous: { status: prev.status, total: prev.total, refuseReason: prev.refuseReason } }] : [])].slice(-30),
      };
      await db.put('timesheets', id, f);
      await log(user, prev ? 'feuille d\'heures renvoyée' : 'feuille d\'heures envoyée', 'pointage', id, f.total + ' h');
      return ok(f);
    }
    if (m === 'POST' && r1 && r2 === 'decision') {
      const f = await db.get('timesheets', r1); if (!f) return notFound('Feuille introuvable.');
      if (!canSeeSheet(f, user, sc)) return deny();
      const why = canDecideSheet(f, user, sc.chantiers); if (why) return deny(why);
      const decision = body.decision;
      if (!['Validée', 'Refusée'].includes(decision)) return bad('Décision invalide.');
      if (!isAdmin && f.status !== 'Envoyée') return bad('Cette feuille a déjà été traitée (' + f.status + ').');
      if (decision === f.status) return bad('Cette feuille est déjà ' + decision.toLowerCase() + '.');
      const reason = str(body.reason, 500);
      if (decision === 'Refusée' && reason.length < 3) return bad('Indiquez le motif du refus.');
      if (f.status === 'Validée') { await applySheet(f, -1); await applyTimelog(f, -1); }
      if (decision === 'Validée') { await applySheet(f, +1); await applyTimelog(f, +1); }
      f.history = [...(f.history || []), { at: now(), by: user.login, action: decision, reason, previous: { status: f.status } }].slice(-30);
      f.status = decision; f.refuseReason = decision === 'Refusée' ? reason : ''; f.decidedBy = user.login; f.decidedAt = now(); f.updatedAt = now();
      await db.put('timesheets', f.id, f);
      await log(user, 'feuille d\'heures ' + decision.toLowerCase(), 'pointage', f.id, reason);
      return ok(f);
    }
    if (m === 'DELETE') return deny('Une feuille d\'heures ne s\'efface pas : elle peut être refusée puis corrigée.');
    return deny();
  }

  // ----- Réglages entreprise -----
  if (r0 === 'settings' && r1 === 'company') {
    if (m === 'GET') return ok((await db.get('settings', 'company')) || { name: COMPANY });
    if (m === 'PUT') {
      if (!isAdmin) return deny();
      const fields = ['legalForm', 'address', 'zipCity', 'phone', 'emergencyPhone', 'email', 'website', 'siret', 'vat', 'ape', 'insurance', 'certifications', 'director', 'hours'];
      const c = { name: COMPANY, activity: 'Électricité industrielle' };
      for (const f of fields) c[f] = str(body[f], 300);
      { const siret = c.siret.replace(/\s/g, ''); const err = firstErr(badEmail(c.email), badPhone(c.phone), badPhone(c.emergencyPhone), siret && !/^\d{14}$/.test(siret) ? 'SIRET invalide : 14 chiffres attendus.' : ''); if (err) return bad(err); }
      c.updatedAt = now();
      await db.put('settings', 'company', c);
      await log(user, 'fiche entreprise modifiée', 'réglages', 'company');
      return ok(c);
    }
    return deny();
  }

  // ----- Statistiques d'heures (agrégat mensuel) -----
  if (r0 === 'stats' && r1 === 'hours') {
    if (user.role === 'technicien') return deny();
    if (m === 'GET') {
      const tl = (await db.get('settings', 'timelog')) || { months: {}, updatedAt: '' };
      return ok(tl);
    }
    if (m === 'POST' && r2 === 'rebuild') {
      if (!isAdmin) return deny();
      const months = {};
      const chantiers = await db.list('chantiers');
      const r2n = (n) => Math.max(0, Math.round(n * 100) / 100);
      for (const f of await db.list('timesheets')) {
        if (f.status !== 'Validée') continue;
        const month = String(f.date || '').slice(0, 7); if (!month) continue;
        const m2 = months[month] || { total: 0, bySite: {}, byChantier: {}, byTech: {} };
        const add = (o, k, v) => { if (k) o[k] = r2n((o[k] || 0) + v); };
        add(m2.byTech, f.techId, f.total || 0);
        for (const l of f.lines || []) { add(m2.byChantier, l.chantierId, l.hours); const c = chantiers.find((x) => x.id === l.chantierId); if (c && c.siteId) add(m2.bySite, c.siteId, l.hours); }
        m2.total = r2n((m2.total || 0) + (f.total || 0));
        months[month] = m2;
      }
      await db.put('settings', 'timelog', { months, updatedAt: now() });
      await log(user, 'heures recalculées', 'statistiques', 'timelog', Object.keys(months).length + ' mois');
      return ok({ months, updatedAt: now() });
    }
    return deny();
  }

  // ----- Journal, sauvegardes, export (admin) -----

  if (r0 === 'journal') { if (!isAdmin || m !== 'GET') return deny(); return ok(await db.listJournal(300)); }
  if (r0 === 'backups') {
    if (!isAdmin) return deny();
    if (m === 'GET' && !r1) return ok(await db.listBackups());
    if (m === 'POST' && !r1) {
      const name = 'manuelle-' + now().replace(/[:.]/g, '-');
      const snap = await db.snapshot();
      await db.putBackup(name, { name, at: now(), by: user.login, data: snap });
      await log(user, 'sauvegarde manuelle', 'sauvegarde', name);
      return ok({ name, counts: Object.fromEntries(Object.entries(snap).map(([k, v]) => [k, v.length])) });
    }
    if (m === 'POST' && r1 && r2 === 'restore') {
      if (body.confirm !== 'RESTAURER') return bad('Pour confirmer, tapez RESTAURER en majuscules.');
      const b = await db.getBackup(r1); if (!b) return notFound('Sauvegarde introuvable.');
      // 1) sauvegarde de sécurité de l'état actuel
      const safety = 'avant-restauration-' + now().replace(/[:.]/g, '-');
      await db.putBackup(safety, { name: safety, at: now(), by: user.login, data: await db.snapshot() });
      // 2) remise EXACTE de l'état sauvegardé : ce qui n'existait pas dans la sauvegarde est retiré
      //    (exception : le compte administrateur principal actuel est conservé pour ne jamais perdre l'accès)
      let written = 0, removed = 0;
      for (const c of db.COLLECTIONS) {
        const items = b.data[c] || [];
        const idOf = (it) => (c === 'users' ? it.login : (c === 'settings' ? 'company' : it.id));
        const keep = new Set(items.map(idOf).filter(Boolean));
        for (const k of await db.keysOf(c + '/')) { const id = k.slice(c.length + 1); if (c === 'users' && id === 'admin') continue; if (!keep.has(id)) { await db.deleteKey(k); removed++; } }
        for (const it of items) { const id = idOf(it); if (!id || (c === 'users' && id === 'admin')) continue; await db.put(c, id, it); written++; }
      }
      const hist = b.data.history || [];
      const hkeep = new Set(hist.map((h) => db.histKey(h)));
      for (const k of await db.allHistoryKeys()) if (!hkeep.has(k)) { await db.deleteKey(k); removed++; }
      for (const h of hist) { await db.appendHistory(h.equipId, h).catch(() => {}); }
      await log(user, 'restauration exacte', 'sauvegarde', r1, written + ' fiches remises, ' + removed + ' retirées ; sécurité : ' + safety);
      return ok({ ok: true, restored: written, removed, safety });
    }
    return deny();
  }
  if (r0 === 'export' && m === 'GET') {
    if (!isAdmin) return deny('Export complet réservé à l\'administrateur.');
    const snap = await db.snapshot();
    snap.users = snap.users.map(publicUser);
    if (url.searchParams.get('photos') === '1') {
      snap.photos = {};
      for (const id of snap.photoIds) snap.photos[id] = await db.getPhoto(id);
    }
    await log(user, 'export complet', 'sauvegarde', '-');
    return ok({ company: COMPANY, exportedAt: now(), by: user.login, data: snap });
  }

  // ----- Données d'exemple (admin) -----
  if (r0 === 'demo') {
    if (!isAdmin) return deny();
    if (m === 'POST') return loadDemo(user);
    if (m === 'DELETE') return clearDemo(user);
    return deny();
  }

  return notFound('Route inconnue.');
}

async function savePhotos(list) {
  const out = [];
  if (!Array.isArray(list)) return out;
  for (const p of list.slice(0, 8)) {
    if (typeof p !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(p) || p.length > 1_500_000) continue;
    const id = 'P' + rid(14);
    await db.putPhoto(id, p);
    out.push(id);
  }
  return out;
}

export const config = { path: '/api/*' };
