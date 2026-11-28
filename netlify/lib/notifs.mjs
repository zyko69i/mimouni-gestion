// Notifications par email : réglages, envoi (Resend) et synthèse quotidienne.
// Si aucune clé n'est configurée, rien n'est perdu : le message est enregistré
// dans la boîte d'envoi avec le statut « non envoyé (clé absente) », ce qui permet
// de vérifier le contenu avant d'activer l'envoi réel.
import { randomBytes } from 'node:crypto';
import * as db from './db.mjs';

const H = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const json = (s, b) => new Response(JSON.stringify(b), { status: s, headers: H });
const ok = (b) => json(200, b);
const bad = (m) => json(400, { error: m });
const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const str = (v, max = 300) => (v == null ? '' : String(v).trim().slice(0, max));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const DEFAULT_SETTINGS = {
  enabled: false,
  from: 'MIMOUNI Gestion <onboarding@resend.dev>',
  recipients: [],
  alerts: { habilitations: true, documents: true, maintenances: true, courriers: true, stocks: true, sauvegardes: true },
  horizon: { habilitations: 60, documents: 30, maintenances: 7 },
  lastSentAt: '', lastStatus: '', updatedAt: '',
};

const daysBetween = (a, b) => Math.round((new Date(a + 'T00:00:00Z') - new Date(b + 'T00:00:00Z')) / 864e5);

async function getSettings() {
  const s = (await db.get('settings', 'notifs')) || {};
  return {
    ...DEFAULT_SETTINGS, ...s,
    alerts: { ...DEFAULT_SETTINGS.alerts, ...(s.alerts || {}) },
    horizon: { ...DEFAULT_SETTINGS.horizon, ...(s.horizon || {}) },
    recipients: Array.isArray(s.recipients) ? s.recipients : [],
  };
}

// ---------- Construction de la synthèse ----------
async function buildDigest() {
  const s = await getSettings();
  const d = today();
  const sections = [];

  if (s.alerts.habilitations) {
    const techs = await db.list('technicians');
    const items = [];
    for (const t of techs) {
      for (const h of t.habilitations || []) {
        const label = (t.firstName || '') + ' ' + (t.lastName || '') + ' — ' + (h.kind || '') + (h.symbol ? ' ' + h.symbol : '');
        if (!h.expires) { items.push(label + ' : date de fin manquante'); continue; }
        const n = daysBetween(h.expires, d);
        if (n < 0) items.push(label + ' : expirée depuis ' + Math.abs(n) + ' j');
        else if (n <= (s.horizon.habilitations || 60)) items.push(label + ' : expire dans ' + n + ' j');
        else if (!h.proof) items.push(label + ' : justificatif manquant');
      }
    }
    if (items.length) sections.push({ key: 'habilitations', title: 'Habilitations', items: items.slice(0, 40), total: items.length });
  }

  if (s.alerts.documents) {
    const docs = await db.list('documents');
    const items = docs.filter((x) => x.status !== 'Archivé').filter((x) => {
      if (x.status === 'À réviser' || x.status === 'Remplacé') return true;
      return x.reviewAt && daysBetween(x.reviewAt, d) <= (s.horizon.documents || 30);
    }).map((x) => (x.title || '') + ' (v' + (x.version || '–') + ')' + (x.reviewAt ? ' : revue ' + x.reviewAt : ' : à réviser'));
    if (items.length) sections.push({ key: 'documents', title: 'Documentation à réviser', items: items.slice(0, 40), total: items.length });
  }

  if (s.alerts.maintenances) {
    const mts = await db.list('maintenances');
    const items = mts.filter((m) => m.status !== 'Réalisée' && m.status !== 'Annulée' && m.dueDate && daysBetween(m.dueDate, d) <= (s.horizon.maintenances || 7))
      .map((m) => (m.title || '') + ' : échéance ' + m.dueDate + (daysBetween(m.dueDate, d) < 0 ? ' (en retard)' : ''));
    if (items.length) sections.push({ key: 'maintenances', title: 'Maintenances et contrôles', items: items.slice(0, 40), total: items.length });
  }

  if (s.alerts.courriers) {
    const flows = await db.list('docflows');
    const items = flows.filter((f) => f.direction === 'Envoi' && f.status === 'Attendu' && f.sentAt && daysBetween(f.sentAt, d) < -10)
      .map((f) => (f.name || '') + ' → ' + (f.to || 'destinataire non précisé') + ' : sans retour depuis le ' + f.sentAt);
    const relances = flows.filter((f) => f.followUpAt && f.followUpAt <= d && f.status === 'Attendu')
      .map((f) => (f.name || '') + ' : relance prévue le ' + f.followUpAt);
    const all = [...relances, ...items];
    if (all.length) sections.push({ key: 'courriers', title: 'Courriers en attente de retour', items: all.slice(0, 40), total: all.length });
  }

  if (s.alerts.stocks) {
    const stocks = await db.list('stock');
    const items = stocks.filter((x) => Number(x.minQty) > 0 && Number(x.qty) <= Number(x.minQty))
      .map((x) => (x.name || '') + ' : ' + (x.qty ?? 0) + ' ' + (x.unit || '') + ' (seuil ' + x.minQty + ')');
    if (items.length) sections.push({ key: 'stocks', title: 'Stocks sous le seuil', items: items.slice(0, 40), total: items.length });
  }

  if (s.alerts.sauvegardes) {
    const backups = (await db.listBackups()).filter((b) => b.startsWith('auto-')).sort();
    const last = backups[backups.length - 1];
    const lastDay = last ? last.replace(/^auto-/, '') : '';
    if (!lastDay || daysBetween(d, lastDay) > 2) {
      sections.push({ key: 'sauvegardes', title: 'Sauvegardes', items: [lastDay ? 'Dernière sauvegarde automatique : ' + lastDay : 'Aucune sauvegarde automatique'], total: 1 });
    }
  }

  const total = sections.reduce((n, x) => n + x.total, 0);
  return { settings: s, sections, total, at: now() };
}

function digestText(digest) {
  const lines = ['Synthèse MIMOUNI INDUSTRIEL ÉLECTRICITÉ — ' + new Date().toLocaleDateString('fr-FR'), ''];
  if (!digest.sections.length) lines.push('Aucune alerte : tout est à jour.');
  for (const sec of digest.sections) {
    lines.push('## ' + sec.title + ' (' + sec.total + ')');
    for (const it of sec.items) lines.push('- ' + it);
    if (sec.total > sec.items.length) lines.push('… et ' + (sec.total - sec.items.length) + ' autres');
    lines.push('');
  }
  lines.push('— Message automatique. Ne pas répondre : connectez-vous au logiciel pour traiter ces points.');
  return lines.join('\n');
}

function digestHTML(digest) {
  const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const body = digest.sections.length
    ? digest.sections.map((s) => `<h3 style="margin:22px 0 8px;font:600 15px system-ui;color:#0B2440">${esc(s.title)} <span style="color:#64748B;font-weight:400">(${s.total})</span></h3>
      <ul style="margin:0;padding-left:18px;font:14px/1.6 system-ui;color:#1F2937">${s.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      ${s.total > s.items.length ? `<p style="font:13px system-ui;color:#64748B;margin:6px 0 0">… et ${s.total - s.items.length} autres</p>` : ''}`).join('')
    : '<p style="font:14px system-ui;color:#0E9F6E">Aucune alerte : tout est à jour.</p>';
  return `<div style="background:#F6F8FB;padding:24px">
    <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #E2E8F0;border-radius:14px;overflow:hidden">
      <div style="background:#0B2440;color:#fff;padding:18px 22px;font:600 16px system-ui">MIMOUNI INDUSTRIEL ÉLECTRICITÉ</div>
      <div style="padding:8px 22px 22px">
        <p style="font:14px system-ui;color:#475569">Synthèse du ${esc(new Date(digest.at).toLocaleDateString('fr-FR'))} — ${digest.total} point${digest.total > 1 ? 's' : ''} à traiter.</p>
        ${body}
        <p style="font:12px system-ui;color:#94A3B8;margin-top:26px;border-top:1px solid #E2E8F0;padding-top:12px">Message automatique. Ne pas répondre : connectez-vous au logiciel pour traiter ces points.</p>
      </div>
    </div>
  </div>`;
}

// ---------- Envoi ----------
async function postResend(key, payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data && (data.message || data.name)) || 'Erreur d\'envoi (' + r.status + ')');
  return data;
}

export async function sendMail({ to, subject, text, html, kind = 'synthèse', settings }) {
  const s = settings || await getSettings();
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  const id = 'M-' + randomBytes(6).toString('base64url').replace(/[-_]/g, '');
  const record = { id, at: now(), to: recipients, subject, text, html, kind, status: 'en attente', error: '' };
  let status = 'non envoyé';
  let error = '';
  const key = process.env.RESEND_API_KEY;
  if (!key) { error = 'Clé RESEND_API_KEY absente : message enregistré, non envoyé.'; }
  else if (!recipients.length) { error = 'Aucun destinataire configuré.'; }
  else {
    try {
      await postResend(key, { from: s.from, to: recipients, subject, text, html: html || undefined });
      status = 'envoyé';
    } catch (e) { status = 'échec'; error = e.message; }
  }
  record.status = status; record.error = error;
  await db.put('mails', id, record);
  return record;
}

export async function sendDailyDigest({ force = false } = {}) {
  const s = await getSettings();
  if (!s.enabled && !force) return { skipped: 'notifications désactivées' };
  if (!force && s.lastSentAt && s.lastSentAt.slice(0, 10) === today()) return { skipped: 'déjà envoyée aujourd\'hui' };
  const digest = await buildDigest();
  const subject = '[MIMOUNI] ' + (digest.total ? digest.total + ' point' + (digest.total > 1 ? 's' : '') + ' à traiter' : 'aucune alerte') + ' — ' + new Date().toLocaleDateString('fr-FR');
  const rec = await sendMail({ to: s.recipients, subject, text: digestText(digest), html: digestHTML(digest), kind: 'synthèse', settings: s });
  s.lastSentAt = now(); s.lastStatus = rec.status + (rec.error ? ' — ' + rec.error : '');
  await db.put('settings', 'notifs', s);
  await db.journal({ who: 'système', role: '', action: 'synthèse email', entity: 'notification', id: rec.id, detail: rec.status + ' · ' + s.recipients.join(', ') });
  return { id: rec.id, status: rec.status, error: rec.error, total: digest.total, sections: digest.sections.map((x) => ({ title: x.title, total: x.total })) };
}

export async function handleNotifications({ user, m, r1, body, log }) {
  const isAdmin = user.role === 'admin';

  if (!r1 && m === 'GET') {
    const settings = await getSettings();
    const outbox = (await db.list('mails')).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 20);
    return ok({ settings, configured: !!process.env.RESEND_API_KEY, outbox });
  }

  if (!r1 && m === 'PUT') {
    if (!isAdmin) return json(403, { error: 'Réglages réservés à l\'administrateur.' });
    const cur = await getSettings();
    const next = { ...cur };
    if (body.enabled !== undefined) next.enabled = body.enabled === true || body.enabled === 'true' || body.enabled === '1';
    if (body.from !== undefined) next.from = str(body.from, 200);
    if (body.recipients !== undefined) {
      const list = (Array.isArray(body.recipients) ? body.recipients : String(body.recipients).split(/[,;\s]+/)).map((x) => str(x, 160)).filter(Boolean);
      const invalid = list.find((x) => !EMAIL_RE.test(x));
      if (invalid) return bad('Adresse email invalide : ' + invalid);
      next.recipients = [...new Set(list)].slice(0, 20);
    }
    if (body.alerts && typeof body.alerts === 'object') next.alerts = { ...cur.alerts, ...Object.fromEntries(Object.entries(body.alerts).map(([k, v]) => [k, !!v])) };
    if (body.horizon && typeof body.horizon === 'object') {
      next.horizon = { ...cur.horizon };
      for (const k of ['habilitations', 'documents', 'maintenances']) {
        const n = Number(body.horizon[k]); if (Number.isFinite(n) && n >= 0 && n <= 365) next.horizon[k] = Math.round(n);
      }
    }
    next.updatedAt = now();
    await db.put('settings', 'notifs', next);
    await log(user, 'réglages de notifications modifiés', 'notification', 'settings');
    return ok(next);
  }

  if (r1 === 'test' && m === 'POST') {
    if (!isAdmin) return json(403, { error: 'Réservé à l\'administrateur.' });
    const s = await getSettings();
    const to = str(body.to, 160) || s.recipients[0];
    if (!to) return bad('Ajoutez au moins un destinataire.');
    const digest = await buildDigest();
    const rec = await sendMail({
      to, settings: { ...s, from: str(body.from, 200) || s.from },
      subject: '[MIMOUNI] Test de notification — ' + new Date().toLocaleDateString('fr-FR'),
      text: 'Message de test.\n\n' + digestText(digest), html: digestHTML(digest), kind: 'test',
    });
    await log(user, 'notification de test', 'notification', rec.id, rec.status);
    return ok({ status: rec.status, error: rec.error, to });
  }

  if (r1 === 'digest' && m === 'POST') {
    if (!isAdmin) return json(403, { error: 'Réservé à l\'administrateur.' });
    const r = await sendDailyDigest({ force: true });
    await log(user, 'synthèse email envoyée à la demande', 'notification', r.id || '-', r.status || r.skipped);
    return ok(r);
  }

  return json(405, { error: 'Méthode non autorisée.' });
}
