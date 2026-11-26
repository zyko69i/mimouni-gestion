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

const ROLES = ['admin', 'chef', 'technicien'];
const TASK_STATUS = ['À faire', 'En cours', 'Bloquée', 'Terminée', 'Annulée'];
const CHANTIER_STATUS = ['En préparation', 'En cours', 'Clôture proposée', 'Clôturé'];
const ABS_TYPES = ['absence', 'retard', 'congé', 'maladie', 'non-présentation'];
const SLOTS = ['journée', 'matin', 'après-midi'];
const HAB_KINDS = ['Électrique (NF C 18-510)', 'CACES', 'AIPR', 'SST', 'Autre'];
const HIST_TYPES = ['intervention', 'remarque', 'photo', 'correction', 'masquage'];

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
  if (a.type === 'maladie') return { ...a, type: 'absence', motif: '', redacted: true };
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
  const [tasks, absences, equipment, company] = await Promise.all([db.list('tasks'), db.list('absences'), db.list('equipment'), db.get('settings', 'company')]);
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
  const out = {
    me: publicUser(user), company: company || { name: COMPANY }, serverTime: now(),
    chantiers: visChantiers, tasks: visTasks, technicians: visTechs, assignments: visAssign,
    absences: visAbs, equipment, recent,
  };
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
    skills: Array.isArray(b.skills) ? b.skills.map((s) => str(s, 60)).filter(Boolean).slice(0, 30) : (prev.skills || []),
    notes: str(b.notes ?? prev.notes, 1000), active: b.active === undefined ? (prev.active ?? true) : !!b.active,
  };
}

function habFields(b) {
  const kind = HAB_KINDS.includes(b.kind) ? b.kind : 'Autre';
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
  for (const c of ['technicians', 'chantiers', 'tasks', 'assignments', 'absences', 'equipment']) {
    for (const it of await db.list(c)) if (it.demo) { if (c === 'equipment') demoEq.add(it.id); if (c === 'chantiers') demoEq.add('CH-' + it.id); await db.remove(c, it.id); n++; }
  }
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
      if (body.technicianId !== undefined) u.technicianId = str(body.technicianId, 40);
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
      await db.put('technicians', t.id, t);
      await log(user, 'technicien créé', 'technicien', t.id, t.firstName + ' ' + t.lastName);
      return ok(t);
    }
    if (m === 'PUT' && r1 && !r2) {
      if (!isAdmin) return deny();
      const prev = await db.get('technicians', r1); if (!prev) return notFound();
      const t = { ...techFields(body, prev), updatedAt: now() };
      await db.put('technicians', t.id, t);
      await log(user, 'technicien modifié', 'technicien', t.id);
      return ok(t);
    }
    if (m === 'POST' && r1 && r2 === 'habilitations') {
      if (!isAdmin) return deny();
      const t = await db.get('technicians', r1); if (!t) return notFound();
      const h = habFields(body);
      if (!h.expires) return bad('La date de fin de validité est obligatoire.');
      t.habilitations = [...(t.habilitations || []), h]; t.updatedAt = now();
      await db.put('technicians', t.id, t);
      await log(user, 'habilitation ajoutée', 'technicien', t.id, h.kind + ' ' + h.symbol + ' → ' + h.expires);
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
      const c = { id: 'C' + rid(8), name: str(body.name, 120), address: str(body.address, 250), client: str(body.client, 120), chefId: str(body.chefId, 40), start: date(body.start), endPlanned: date(body.endPlanned), status: CHANTIER_STATUS.includes(body.status) ? body.status : 'En préparation', team: Array.isArray(body.team) ? body.team.map((x) => str(x, 20)) : [], description: str(body.description, 2000), createdAt: now(), updatedAt: now() };
      if (!c.name) return bad('Le nom du chantier est obligatoire.');
      await db.put('chantiers', c.id, c);
      await log(user, 'chantier créé', 'chantier', c.id, c.name);
      return ok(c);
    }
    if (r1 && !sc.chantierIds.has(r1)) return deny('Ce chantier ne fait pas partie de vos chantiers.');
    if (m === 'PUT' && r1 && !r2) {
      const c = await db.get('chantiers', r1); if (!c) return notFound();
      if (isAdmin) {
        for (const k of ['name', 'address', 'client', 'chefId', 'description']) if (body[k] !== undefined) c[k] = str(body[k], k === 'description' ? 2000 : 250);
        for (const k of ['start', 'endPlanned']) if (body[k] !== undefined) c[k] = date(body[k]);
        if (body.status && CHANTIER_STATUS.includes(body.status)) c.status = body.status;
        if (Array.isArray(body.team)) c.team = body.team.map((x) => str(x, 20));
      } else if (user.role === 'chef') {
        // Le chef peut seulement proposer la clôture et gérer l'équipe de SES chantiers
        if (body.status === 'Clôture proposée') c.status = 'Clôture proposée';
        else if (Array.isArray(body.team)) c.team = body.team.map((x) => str(x, 20));
        else return deny('Seul l\'administrateur modifie les informations principales du chantier.');
      } else return deny();
      c.updatedAt = now();
      await db.put('chantiers', c.id, c);
      await log(user, 'chantier modifié', 'chantier', c.id, body.status || '');
      return ok(c);
    }
    if (r2 === 'notes' && m === 'GET') return ok(await db.listHistory('CH-' + r1));
    if (r2 === 'notes' && m === 'POST') {
      // Photos / documents / remarques du chantier (ajout seul)
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
      const conflict = body.baseUpdatedAt && body.baseUpdatedAt !== t.updatedAt;
      const before = { status: t.status, doneHours: t.doneHours, plannedHours: t.plannedHours, by: t.lastBy || '', at: t.updatedAt };
      if (body.status) {
        if (!TASK_STATUS.includes(body.status)) return bad('Statut invalide.');
        if (body.status === 'Annulée' && !isAdmin) return deny('Seul l\'administrateur peut annuler une tâche.');
        if (body.status === 'Bloquée' && !str(body.blockReason || t.blockReason)) return bad('Le motif de blocage est obligatoire.');
        t.status = body.status;
      }
      if (body.blockReason !== undefined) t.blockReason = str(body.blockReason, 300);
      if (body.doneHours !== undefined) t.doneHours = num(body.doneHours);
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
    if (m === 'POST' && !r1) {
      if (!isAdmin) return deny('Seul l\'administrateur crée les fiches matériel et leurs QR codes.');
      let id = eqCode();
      while (await db.get('equipment', id)) id = eqCode();
      const e = { id, name: str(body.name, 150), type: str(body.type, 80), brand: str(body.brand, 80), model: str(body.model, 80), serial: str(body.serial, 80), chantierId: str(body.chantierId, 20), location: str(body.location, 200), commissioned: date(body.commissioned), specs: str(body.specs, 1000), createdAt: now(), updatedAt: now(), createdBy: user.login, labelPrints: 0 };
      if (!e.name) return bad('La désignation est obligatoire.');
      await db.put('equipment', e.id, e);
      await log(user, 'équipement créé + QR code', 'équipement', e.id, e.name);
      return ok(e);
    }
    if (r1 && !r2 && m === 'GET') { const e = await db.get('equipment', r1); return e ? ok(e) : notFound('Équipement inconnu.'); }
    if (r1 && !r2 && m === 'PUT') {
      if (!isAdmin) return deny('Seul l\'administrateur modifie les informations principales.');
      const e = await db.get('equipment', r1); if (!e) return notFound();
      for (const k of ['name', 'type', 'brand', 'model', 'serial', 'chantierId', 'location', 'specs']) if (body[k] !== undefined) e[k] = str(body[k], k === 'specs' ? 1000 : 200);
      if (body.commissioned !== undefined) e.commissioned = date(body.commissioned);
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

  // ----- Photos -----
  if (r0 === 'photos' && r1 && m === 'GET') {
    const p = await db.getPhoto(r1);
    if (!p) return notFound();
    return ok({ id: r1, dataUrl: p });
  }

  // ----- Réglages entreprise -----
  if (r0 === 'settings' && r1 === 'company') {
    if (m === 'GET') return ok((await db.get('settings', 'company')) || { name: COMPANY });
    if (m === 'PUT') {
      if (!isAdmin) return deny();
      const fields = ['legalForm', 'address', 'zipCity', 'phone', 'emergencyPhone', 'email', 'website', 'siret', 'vat', 'ape', 'insurance', 'certifications', 'director', 'hours'];
      const c = { name: COMPANY, activity: 'Électricité industrielle' };
      for (const f of fields) c[f] = str(body[f], 300);
      c.updatedAt = now();
      await db.put('settings', 'company', c);
      await log(user, 'fiche entreprise modifiée', 'réglages', 'company');
      return ok(c);
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
      const b = await db.getBackup(r1); if (!b) return notFound('Sauvegarde introuvable.');
      // Sauvegarde de sécurité avant restauration, puis réécriture des fiches (rien n'est effacé)
      await db.putBackup('avant-restauration-' + now().replace(/[:.]/g, '-'), { at: now(), by: user.login, data: await db.snapshot() });
      let n = 0;
      for (const c of db.COLLECTIONS) for (const it of b.data[c] || []) { const id = c === 'users' ? it.login : (c === 'settings' ? 'company' : it.id); if (id) { await db.put(c, id, it); n++; } }
      for (const h of b.data.history || []) { await db.appendHistory(h.equipId, h).catch(() => {}); }
      await log(user, 'restauration', 'sauvegarde', r1, n + ' fiches');
      return ok({ ok: true, restored: n });
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
