/* MIMOUNI INDUSTRIEL ÉLECTRICITÉ – application de gestion (V1)
   JavaScript sans framework. Données : API /api (Netlify) + copie locale IndexedDB pour le hors ligne. */
'use strict';
const COMPANY = 'MIMOUNI INDUSTRIEL ÉLECTRICITÉ';
const APP_VERSION = '1.1.0';

// ---------------- utilitaires ----------------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayISO = () => { const d = new Date(); return iso(d); };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseD = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return iso(d); };
const fmtD = (s) => (s ? parseD(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–');
const fmtDT = (s) => (s ? new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–');
const daysUntil = (s) => Math.round((parseD(s) - parseD(todayISO())) / 864e5);
const h = (n) => (Math.round((n || 0) * 10) / 10).toLocaleString('fr-FR') + ' h';
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const ROLE_LABEL = { admin: 'Administrateur', chef: 'Chef d\'équipe', technicien: 'Technicien' };
const TASK_STATUS = ['À faire', 'En cours', 'Bloquée', 'Terminée', 'Annulée'];
const ABS_TYPES = ['absence', 'retard', 'congé', 'maladie', 'non-présentation'];
const HAB_KINDS = ['Électrique (NF C 18-510)', 'CACES', 'AIPR', 'SST', 'Autre'];

const ICON = {
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  site: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/></svg>',
  scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c.8-3.5 3.6-5 7-5s6.2 1.5 7 5M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.4 2.2 4 5"/></svg>',
  abs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M9 14l6 4M15 14l-6 4"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h8"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></svg>',
};

// ---------------- stockage local (IndexedDB) ----------------
const idb = (() => {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('mimouni', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('queue', { keyPath: 'qid' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = async (store, mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction(store, mode); const s = t.objectStore(store); const out = fn(s); t.oncomplete = () => res(out instanceof IDBRequest ? out.result : out); t.onerror = () => rej(t.error); }); };
  return {
    get: (k) => tx('kv', 'readonly', (s) => s.get(k)),
    set: (k, v) => tx('kv', 'readwrite', (s) => s.put(v, k)),
    del: (k) => tx('kv', 'readwrite', (s) => s.delete(k)),
    clear: () => tx('kv', 'readwrite', (s) => s.clear()),
    qAll: () => tx('queue', 'readonly', (s) => s.getAll()),
    qAdd: (item) => tx('queue', 'readwrite', (s) => s.put(item)),
    qDel: (qid) => tx('queue', 'readwrite', (s) => s.delete(qid)),
    qClear: () => tx('queue', 'readwrite', (s) => s.clear()),
  };
})();

// ---------------- état ----------------
const S = { token: localStorage.getItem('mimouni_token') || '', me: null, data: null, online: navigator.onLine, queue: [], rejected: [], route: '', lastSync: null, apiError: false };

// ---------------- API ----------------
class Offline extends Error {}
async function api(method, path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (S.token) headers.Authorization = 'Bearer ' + S.token;
  let r;
  try {
    if (!navigator.onLine) throw new Offline();
    r = await fetch('/api/' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch (e) {
    setOnline(false);
    if (opts.queueable) {
      await queueAdd({ method, path, body, label: opts.label || path, photos: (body && body.photos ? body.photos.length : 0), kind: opts.kind || 'autre' });
      return { queued: true };
    }
    throw new Offline('Pas de connexion : cette action demande Internet.');
  }
  setOnline(true);
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== 'login') { logout(true); throw new Error('Session expirée, reconnectez-vous.'); }
  if (!r.ok) { const err = new Error(data.error || 'Erreur ' + r.status); err.status = r.status; throw err; }
  return data;
}

async function loadData() {
  try {
    const d = await api('GET', 'bootstrap');
    S.data = d; S.me = d.me; S.lastSync = new Date().toISOString();
    await idb.set('bootstrap', d);
  } catch (e) {
    if (e instanceof Offline || !navigator.onLine) {
      const d = await idb.get('bootstrap');
      if (d) { S.data = d; S.me = d.me; }
      else throw e;
    } else throw e;
  }
}
async function refresh() { await loadData(); render(); }

// ---------------- file d'attente hors ligne ----------------
async function queueAdd(item) {
  item.qid = uid(); item.at = new Date().toISOString();
  if (item.body && !item.body.clientId) item.body.clientId = item.qid;
  if (item.body) item.body.offline = true;
  await idb.qAdd(item); S.queue = await idb.qAll(); paintStatus();
  initAI();
}
async function queueRefresh() { S.queue = await idb.qAll(); paintStatus();
  initAI(); }

function queueSummary(q) {
  const inter = q.filter((x) => x.kind === 'intervention').length;
  const sheets = q.filter((x) => x.kind === 'pointage').length;
  const photos = q.reduce((s, x) => s + (x.photos || 0), 0);
  const other = q.length - inter - sheets;
  const parts = [];
  if (inter) parts.push(inter + ' intervention' + (inter > 1 ? 's' : ''));
  if (sheets) parts.push(sheets + ' feuille' + (sheets > 1 ? 's' : '') + ' d\'heures');
  if (other) parts.push(other + ' autre' + (other > 1 ? 's' : '') + ' saisie' + (other > 1 ? 's' : ''));
  if (photos) parts.push(photos + ' photo' + (photos > 1 ? 's' : ''));
  return `${q.length} élément${q.length > 1 ? 's' : ''} en attente (${parts.join(', ')})`;
}

let syncModalOpen = false;
async function proposeSync() {
  await queueRefresh();
  if (!S.queue.length || !navigator.onLine || syncModalOpen || !S.token) return;
  syncModalOpen = true;
  const detail = S.queue.map((q) => `<li>${esc(q.label)} <span class="muted small">– saisi le ${fmtDT(q.at)}</span></li>`).join('');
  modal(`<h2>Connexion rétablie</h2>
    <p><b>${esc(queueSummary(S.queue))}.</b> Envoyer maintenant ?</p>
    <details id="sync-detail"><summary>Voir le détail</summary><ul>${detail}</ul></details>
    <div class="actions"><button class="btn" data-act="later">Plus tard</button><button class="btn primary" data-act="send">Envoyer</button></div>`,
  (root, close) => {
    root.querySelector('[data-act=later]').onclick = () => { syncModalOpen = false; close(); toast('Les saisies restent enregistrées sur l\'appareil.'); };
    root.querySelector('[data-act=send]').onclick = async () => { syncModalOpen = false; close(); await sendQueue(); };
  }, () => { syncModalOpen = false; });
}

async function sendQueue() {
  const q = (await idb.qAll()).sort((a, b) => a.at.localeCompare(b.at));
  let sent = 0, failed = 0;
  for (const item of q) {
    try {
      await api(item.method, item.path, item.body);
      await idb.qDel(item.qid); sent++;
    } catch (e) {
      if (e.status && e.status >= 400 && e.status < 500) {
        // Jamais perdu : copie gardée dans « Envois refusés » pour correction ou renvoi
        S.rejected = [...(S.rejected || []), { ...item, error: e.message, rejectedAt: new Date().toISOString() }]; await rejectedSave();
        await idb.qDel(item.qid); failed++; toast('Refusé par le serveur : ' + e.message + ' – copie gardée dans « Envois refusés ».', 7000);
      }
      else { failed++; break; }
    }
  }
  await queueRefresh();
  if (sent) toast(`✔ Envoyé et sauvegardé le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
  if (failed && !sent) { S.apiError = true; paintStatus();
  initAI(); }
  await refresh().catch(() => {});
}

function setOnline(v) { if (S.online !== v) { S.online = v; paintStatus();
  initAI(); } }
window.addEventListener('online', () => { setOnline(true); proposeSync(); });
window.addEventListener('offline', () => { setOnline(false); });

// ---------------- interface : modale, toast ----------------
function modal(html, init, onClose) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog">${html}</div>`;
  document.body.appendChild(bg);
  const close = () => { bg.remove(); onClose && onClose(); };
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  init && init(bg.firstElementChild, close);
  return close;
}
let toastT;
function toast(msg, ms = 3800) {
  let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), ms);
}
function confirmBox(msg, okLabel = 'Confirmer') {
  return new Promise((res) => modal(`<p>${msg}</p><div class="actions"><button class="btn" data-a="n">Annuler</button><button class="btn primary" data-a="y">${esc(okLabel)}</button></div>`,
    (root, close) => { root.querySelector('[data-a=n]').onclick = () => { close(); res(false); }; root.querySelector('[data-a=y]').onclick = () => { close(); res(true); }; }));
}

// Formulaire générique dans une modale
function formModal({ title, fields, submitLabel = 'Enregistrer', onSubmit, intro = '' }) {
  const fh = fields.map((f) => {
    const v = f.value ?? '';
    const req = f.required ? 'required' : '';
    if (f.type === 'select') return `<label class="f">${esc(f.label)}<select name="${f.name}" ${req}>${f.options.map((o) => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select></label>`;
    if (f.type === 'textarea') return `<label class="f">${esc(f.label)}<textarea name="${f.name}" ${req} placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea></label>`;
    if (f.type === 'checks') return `<div class="f"><b class="small">${esc(f.label)}</b><div class="checks">${f.options.map(([val, lab]) => `<label><input type="checkbox" name="${f.name}" value="${esc(val)}" ${(v || []).includes(val) ? 'checked' : ''}> ${esc(lab)}</label>`).join('') || '<span class="muted">Aucun</span>'}</div></div>`;
    if (f.type === 'photos') return `<label class="f">${esc(f.label)}<input type="file" name="${f.name}" accept="image/*" multiple ${f.capture ? 'capture="environment"' : ''}></label>`;
    return `<label class="f">${esc(f.label)}<input type="${f.type || 'text'}" name="${f.name}" value="${esc(v)}" ${req} ${f.step ? `step="${f.step}"` : ''} ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''} placeholder="${esc(f.placeholder || '')}" ${f.autocomplete ? `autocomplete="${f.autocomplete}"` : ''} ${f.maxlength ? `maxlength="${f.maxlength}"` : ''}></label>`;
  }).join('');
  modal(`<h2>${esc(title)}</h2>${intro}<form>${fh}<p class="err" data-err></p><div class="actions"><button type="button" class="btn" data-a="c">Annuler</button><button class="btn primary" type="submit">${esc(submitLabel)}</button></div></form>`,
    (root, close) => {
      const form = root.querySelector('form');
      root.querySelector('[data-a=c]').onclick = close;
      form.onsubmit = async (e) => {
        e.preventDefault();
        const vals = {};
        for (const f of fields) {
          if (f.type === 'checks') vals[f.name] = $$(`input[name="${f.name}"]:checked`, form).map((i) => i.value);
          else if (f.type === 'photos') vals[f.name] = await compressFiles(form.elements[f.name].files);
          else vals[f.name] = form.elements[f.name].value.trim();
        }
        const btn = form.querySelector('[type=submit]'); btn.disabled = true;
        try { await onSubmit(vals); close(); } catch (err) { root.querySelector('[data-err]').textContent = err.message; btn.disabled = false; }
      };
    });
}

// Compression des photos côté appareil (max 1280 px, JPEG 0,7)
async function compressFiles(files) {
  const out = [];
  for (const file of [...(files || [])].slice(0, 6)) {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    out.push(c.toDataURL('image/jpeg', 0.7)); URL.revokeObjectURL(url);
  }
  return out;
}

// ---------------- recherches dans les données ----------------
const D = () => S.data || { chantiers: [], tasks: [], technicians: [], assignments: [], absences: [], equipment: [], users: [], recent: [], timesheets: [] };
// Heures réalisées d'une tâche = heures pointées et VALIDÉES (feuilles d'heures) + ajustement manuel éventuel
const realH = (t) => Math.round(((t.tsHours || 0) + (t.doneHours || 0)) * 100) / 100;
const techById = (id) => D().technicians.find((t) => t.id === id);
const techName = (id) => { const t = techById(id); return t ? `${t.firstName} ${t.lastName}`.trim() : (id ? 'Technicien (hors équipe)' : '–'); };
const chantierById = (id) => D().chantiers.find((c) => c.id === id);
const userName = (login) => { const u = (D().users || []).find((x) => x.login === login); return u ? u.name : (login || '–'); };
const isAdmin = () => S.me && S.me.role === 'admin';
const isChef = () => S.me && S.me.role === 'chef';
const isTech = () => S.me && S.me.role === 'technicien';
const demoTag = (x) => (x && x.demo ? ' <span class="pill demo">Exemple</span>' : '');
const absLabel = (a) => (({ absence: 'Absent', retard: 'Retard', 'congé': 'Congé', maladie: 'Maladie', 'non-présentation': 'Non-présentation' }[a.type] || a.type));

// ---------------- calculs ----------------
// Jours fériés français (fixes + Pâques)
function easter(y) { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), hh = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - hh - k) % 7, m = Math.floor((a + 11 * hh + 22 * l) / 451), mo = Math.floor((hh + l - 7 * m + 114) / 31), da = ((hh + l - 7 * m + 114) % 31) + 1; return new Date(y, mo - 1, da); }
const holidayCache = {};
function isHoliday(s) {
  const y = Number(s.slice(0, 4));
  if (!holidayCache[y]) {
    const e = easter(y); const plus = (n) => { const d = new Date(e); d.setDate(d.getDate() + n); return iso(d); };
    holidayCache[y] = new Set([`${y}-01-01`, `${y}-05-01`, `${y}-05-08`, `${y}-07-14`, `${y}-08-15`, `${y}-11-01`, `${y}-11-11`, `${y}-12-25`, plus(1), plus(39), plus(50)]);
  }
  return holidayCache[y].has(s);
}
const isWorkDay = (s) => { const w = parseD(s).getDay(); return w !== 0 && w !== 6 && !isHoliday(s); };
function workDaysBetween(a, b) { let n = 0; let d = a; while (d < b) { if (isWorkDay(d)) n++; d = addDays(d, 1); } return n; }
function addWorkDays(s, n) { let d = s; let k = 0; while (k < n) { d = addDays(d, 1); if (isWorkDay(d)) k++; } return d; }

const tasksOf = (cid) => D().tasks.filter((t) => t.chantierId === cid && t.status !== 'Annulée');
// Avancement (%) = heures prévues des tâches terminées ÷ heures prévues de toutes les tâches × 100
function progressOf(cid) {
  const ts = tasksOf(cid);
  const total = ts.reduce((s, t) => s + (t.plannedHours || 0), 0);
  const done = ts.filter((t) => t.status === 'Terminée').reduce((s, t) => s + (t.plannedHours || 0), 0);
  const real = ts.reduce((s, t) => s + realH(t), 0) + ((chantierById(cid) || {}).tsOther || 0);
  const realDone = ts.filter((t) => t.status === 'Terminée').reduce((s, t) => s + realH(t), 0);
  return { total, done, real, pct: total ? Math.round((done / total) * 1000) / 10 : 0, gap: realDone - done, remaining: total - done };
}
// Date de fin estimée (toujours une estimation)
function estimateOf(c) {
  const p = progressOf(c.id); const today = todayISO();
  const elapsed = c.start && c.start < today ? workDaysBetween(c.start, today) : 0;
  if (!p.total) return { reliable: false, reason: 'Aucune tâche chiffrée.' };
  if (p.pct >= 100) return { reliable: true, date: today, done: true };
  if (p.pct < 10 || elapsed < 5) return { reliable: false, reason: 'Estimation pas encore fiable (moins de 10 % d\'avancement ou moins de 5 jours écoulés).' };
  const rate = p.done / elapsed;
  const days = Math.ceil(p.remaining / rate);
  const date = addWorkDays(today, days);
  let delta = 0;
  if (c.endPlanned) delta = date > c.endPlanned ? workDaysBetween(c.endPlanned, date) : -workDaysBetween(date, c.endPlanned);
  return { reliable: true, date, delta, rate, days };
}
function isLate(c) {
  if (c.status === 'Clôturé') return false;
  const e = estimateOf(c);
  if (e.reliable && c.endPlanned && e.date > c.endPlanned) return true;
  return !!(c.endPlanned && c.endPlanned < todayISO() && progressOf(c.id).pct < 100);
}
const taskLate = (t) => t.status !== 'Terminée' && t.status !== 'Annulée' && t.end && t.end < todayISO();

// Habilitations : J-60 orange, J-30 rouge, expirée
function habStatus(hb) {
  if (!hb.expires) return { cls: '', label: 'Sans date' };
  const n = daysUntil(hb.expires);
  if (n < 0) return { cls: 'red', label: 'Expirée', n, level: 3 };
  if (n <= 30) return { cls: 'red', label: `Expire dans ${n} j`, n, level: 2 };
  if (n <= 60) return { cls: 'orange', label: `Expire dans ${n} j`, n, level: 1 };
  return { cls: 'green', label: 'Valide', n, level: 0 };
}
// Seule la dernière habilitation de chaque type/symbole compte (les anciennes restent en historique)
function currentHabs(t) {
  const m = new Map();
  (t.habilitations || []).forEach((hb) => { const k = hb.kind + '|' + hb.symbol; const prev = m.get(k); if (!prev || (hb.expires || '') > (prev.expires || '')) m.set(k, hb); });
  return [...m.values()];
}
function habAlerts() {
  const out = [];
  D().technicians.forEach((t) => currentHabs(t).forEach((hb) => { const st = habStatus(hb); if (st.level >= 1) out.push({ t, hb, st }); }));
  return out.sort((a, b) => a.st.n - b.st.n);
}

// Conflits de planning
const overlap = (a, b) => a === 'journée' || b === 'journée' || a === b;
function absentOn(techId, day) { return D().absences.find((a) => a.techId === techId && a.type !== 'retard' && a.status !== 'Refusée' && a.start <= day && (a.end || a.start) >= day); }
function assignConflicts(a) {
  const out = [];
  D().assignments.forEach((x) => { if (x.id !== a.id && x.techId === a.techId && x.date === a.date && overlap(x.slot, a.slot)) out.push('Double affectation (' + x.slot + ')'); });
  if (absentOn(a.techId, a.date)) out.push('Technicien absent ce jour-là');
  const t = techById(a.techId);
  if (t) currentHabs(t).forEach((hb) => { if (hb.expires && hb.expires < a.date) out.push('Habilitation ' + hb.symbol + ' expirée'); });
  return out;
}
function allConflicts() {
  const from = addDays(todayISO(), -1);
  return D().assignments.filter((a) => a.date >= from).map((a) => ({ a, c: assignConflicts(a) })).filter((x) => x.c.length);
}

// ---------------- graphiques SVG ----------------
const PALETTE = ['#C8102E', '#111111', '#8A8D91', '#8E0B20', '#2B2B2B', '#C9CBCE', '#E08A00'];
function donut(items, { size = 170, center = '' } = {}) {
  const total = items.reduce((s, i) => s + i.v, 0);
  if (!total) return '<p class="muted">Pas encore de données.</p>';
  const r = 60, cx = size / 2, cy = size / 2, sw = 26; let a0 = -Math.PI / 2; let paths = '';
  items.forEach((it, i) => {
    if (!it.v) return;
    const frac = it.v / total; const a1 = a0 + frac * Math.PI * 2;
    const col = it.c || PALETTE[i % PALETTE.length];
    if (frac >= 0.9999) paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}"/>`;
    else { const large = frac > 0.5 ? 1 : 0; paths += `<path d="M${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}" fill="none" stroke="${col}" stroke-width="${sw}"/>`; }
    a0 = a1;
  });
  const legend = items.map((it, i) => `<span><i style="background:${it.c || PALETTE[i % PALETTE.length]}"></i>${esc(it.l)} : <b>${it.v}</b></span>`).join('');
  return `<div class="chart" style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img">${paths}<text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="20" font-weight="800">${esc(center || total)}</text></svg><div class="legend" style="flex-direction:column">${legend}</div></div>`;
}
function hbars(items, { unit = '%', max = 100 } = {}) {
  if (!items.length) return '<p class="muted">Pas encore de données.</p>';
  return items.map((it) => `<div style="margin:.45rem 0"><div class="row" style="justify-content:space-between"><span class="small"><b>${esc(it.l)}</b></span><span class="small">${esc(String(it.v).replace('.', ','))} ${unit}${it.late ? ' <span class="pill red">En retard</span>' : ''}</span></div><div class="bar"><i style="width:${Math.min(100, (it.v / (max || 1)) * 100)}%;background:${it.late ? '#8E0B20' : '#C8102E'}"></i></div></div>`).join('');
}
function groupedBars(items) {
  if (!items.length) return '<p class="muted">Pas encore de données.</p>';
  const max = Math.max(1, ...items.flatMap((i) => [i.a, i.b]));
  const W = 560, rowH = 34, H = items.length * rowH + 10, lx = 170;
  let svg = '';
  items.forEach((it, i) => {
    const y = 6 + i * rowH; const wa = ((W - lx - 60) * it.a) / max, wb = ((W - lx - 60) * it.b) / max;
    svg += `<text x="0" y="${y + 17}" font-size="12">${esc(it.l.length > 26 ? it.l.slice(0, 25) + '…' : it.l)}</text>`;
    svg += `<rect x="${lx}" y="${y}" width="${wa}" height="12" fill="#8A8D91"/><text x="${lx + wa + 4}" y="${y + 10}" font-size="10">${h(it.a)}</text>`;
    svg += `<rect x="${lx}" y="${y + 14}" width="${wb}" height="12" fill="#C8102E"/><text x="${lx + wb + 4}" y="${y + 24}" font-size="10">${h(it.b)}</text>`;
  });
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" width="100%">${svg}</svg><div class="legend"><span><i style="background:#8A8D91"></i>Heures prévues</span><span><i style="background:#C8102E"></i>Heures réalisées</span></div></div>`;
}

// ---------------- connexion ----------------
const brandHTML = () => `<div class="brand"><b>MIMOUNI</b><span class="brand-rest"> INDUSTRIEL ÉLECTRICITÉ</span></div>`;
function viewLogin(msg = '', equipInfo = null) {
  $('#app').innerHTML = `<div class="login"><div class="box">
    <div class="name"><b>MIMOUNI</b><br>INDUSTRIEL ÉLECTRICITÉ</div>
    <p class="muted small" style="margin-top:.3rem">Logiciel de gestion</p>
    <p class="login-intro">Connexion pour l'administrateur, les chefs d'équipe et les techniciens. Utilisez l'identifiant et le mot de passe donnés par l'administrateur.</p>
    ${equipInfo ? `<div class="notice" style="margin:.8rem 0"><b>Accès réservé.</b><br>Équipement : <b>${esc(equipInfo.name)}</b> <span class="muted">(${esc(equipInfo.id)})</span><br>Connectez-vous pour voir la fiche et ajouter une intervention.</div>` : ''}
    <form id="login-form" novalidate style="margin-top:.6rem">
      <label class="f">Identifiant<input name="login" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="ex. : admin, prenom.nom"></label>
      <label class="f">Mot de passe<span class="pw-wrap"><input name="password" type="password" autocomplete="current-password"><button type="button" class="pw-eye" id="pw-eye" aria-label="Afficher le mot de passe" aria-pressed="false">${EYE_OPEN}</button></span></label>
      <p class="err" id="login-err" role="alert">${esc(msg)}</p>
      <button class="btn primary bigbtn" type="submit">Se connecter</button>
    </form>
    <p class="login-forgot">Mot de passe oublié ? Demandez à l'administrateur.</p>
  </div></div>`;
  const f = $('#login-form');
  $('#pw-eye').onclick = () => {
    const show = f.password.type === 'password';
    f.password.type = show ? 'text' : 'password';
    const b = $('#pw-eye'); b.innerHTML = show ? EYE_SHUT : EYE_OPEN;
    b.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'); b.setAttribute('aria-pressed', String(show));
    f.password.focus();
  };
  f.oninput = () => { $('#login-err').textContent = ''; };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = $('#login-err'); const btn = f.querySelector('button[type=submit]');
    const login = f.login.value.trim(); const pw = f.password.value;
    if (!login && !pw) { err.textContent = 'Entrez votre identifiant et votre mot de passe.'; f.login.focus(); return; }
    if (!login) { err.textContent = 'Entrez votre identifiant.'; f.login.focus(); return; }
    if (!pw) { err.textContent = 'Entrez votre mot de passe.'; f.password.focus(); return; }
    if (!navigator.onLine) { err.textContent = 'Pas de connexion internet. Connectez-vous au réseau puis réessayez.'; return; }
    btn.disabled = true; btn.textContent = 'Connexion…';
    try {
      const r = await api('POST', 'login', { login, password: pw });
      S.token = r.token; localStorage.setItem('mimouni_token', r.token);
      await start();
    } catch (ex) {
      const m = String(ex && ex.message || '');
      err.textContent = /incorrect/i.test(m) ? 'Identifiant ou mot de passe incorrect. Vérifiez les majuscules, ou demandez à l\'administrateur.'
        : /tentatives/i.test(m) ? m
        : /réseau|connexion|fetch|hors ligne/i.test(m) ? 'Le serveur ne répond pas. Vérifiez votre connexion internet puis réessayez.'
        : (m || 'Connexion impossible. Réessayez.');
      btn.disabled = false; btn.textContent = 'Se connecter';
    }
  };
}
const EYE_OPEN = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_SHUT = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-7 0-11-7-11-7a19 19 0 0 1 5.1-5.9M9.9 5.2A9.6 9.6 0 0 1 12 5c7 0 11 7 11 7a19 19 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2"/><path d="M1 1l22 22"/></svg>';
async function logout(expired) {
  S.token = ''; S.me = null; S.data = null; localStorage.removeItem('mimouni_token');
  await idb.del('bootstrap').catch(() => {});
  viewLogin(expired ? 'Session expirée, reconnectez-vous.' : '');
}

// ---------------- coque de l'application ----------------
function navItems() {
  const r = S.me.role;
  const items = [
    ['#/', 'home', r === 'technicien' ? 'Mon activité' : 'Tableau de bord'],
    ['#/chantiers', 'site', 'Chantiers'],
    ['#/planning', 'cal', 'Planning'],
    ['#/pointage', 'clock', r === 'technicien' ? 'Mes heures' : 'Pointage des heures'],
    ['#/techniciens', 'users', r === 'technicien' ? 'Ma fiche' : 'Techniciens'],
    ['#/absences', 'abs', 'Présences et absences'],
    ['#/materiel', 'box', 'Matériel'],
    ['#/scanner', 'scan', 'Scanner'],
  ];
  if (r !== 'technicien') items.push(['#/rapports', 'doc', 'Rapports']);
  if (r !== 'technicien') items.push(['#/alertes', 'bell', 'Alertes']);
  if (r === 'admin') items.push(['#/journal', 'list', 'Journal d\'activité'], ['#/reglages', 'gear', 'Réglages']);
  items.push(['#/profil', 'user', 'Mon profil']);
  return items;
}
function renderShell() {
  $('#app').innerHTML = `
  <button class="menu-toggle" id="menu-toggle" aria-label="Menu">☰</button>
  <div class="layout">
    <nav class="side" id="side">${navItems().map(([href, ic, lab]) => `<a href="${href}" data-nav="${href}">${ICON[ic]}<span>${esc(lab)}</span></a>`).join('')}
      <div class="sep"></div><div class="small" style="padding:.3rem .7rem;color:#aaa">${esc(S.me.name)}<br>${esc(ROLE_LABEL[S.me.role])}</div>
      <a href="#" id="logout-side"><span>Se déconnecter</span></a></nav>
    <main id="view"></main>
  </div>`;
  $('#logout-side').onclick = (e) => { e.preventDefault(); logout(); };
  const side = $('#side');
  const toggle = $('#menu-toggle');
  toggle.style.opacity = '0';
  toggle.style.pointerEvents = 'none';
  let scrollTimer;
  window.addEventListener('scroll', () => {
    toggle.style.opacity = '1';
    toggle.style.pointerEvents = 'auto';
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(async () => {
      if (window.innerWidth < 900 && !document.querySelector('.side.open')) {
        toggle.style.opacity = '0';
        toggle.style.pointerEvents = 'none';
      }
    }, 1200);
  }, { passive: true });
  // Show briefly on load then hide
  setTimeout(async () => {
    if (window.innerWidth < 900) {
      toggle.style.opacity = '1';
      toggle.style.pointerEvents = 'auto';
      setTimeout(async () => { toggle.style.opacity = '0'; toggle.style.pointerEvents = 'none'; }, 1500);
    }
  }, 500);
  toggle.onclick = () => side.classList.toggle('open');
  document.addEventListener('click', (e) => {
    if (window.innerWidth < 900 && side.classList.contains('open') && !side.contains(e.target) && e.target !== toggle) {
      side.classList.remove('open');
    }
  });
  side.querySelectorAll('a').forEach(a => a.onclick = () => { if (window.innerWidth < 900) side.classList.remove('open'); });
  paintStatus();
  initAI();
}
function paintStatus() {
  const dot = $('#net-dot'); if (!dot) return;
  const on = navigator.onLine && S.online;
  dot.className = 'dot' + (S.apiError ? ' err' : on ? '' : ' off');
  $('#net-label').textContent = S.apiError ? 'Erreur' : on ? 'En ligne' : 'Hors ligne';
  const b = $('#sync-badge');
  const rj = (S.rejected || []).length;
  if (rj) { b.textContent = rj + ' refusé' + (rj > 1 ? 's' : '') + (S.queue.length ? ' · ' + S.queue.length + ' en attente' : ''); b.className = 'badge-sync rejected'; }
  else if (S.queue.length) { b.textContent = S.queue.length + ' en attente'; b.className = 'badge-sync pending'; }
  else { b.textContent = 'Sauvegardé'; b.className = 'badge-sync'; }
}

// Sur téléphone, chaque ligne de tableau devient une carte (libellé de la colonne devant chaque valeur)
function cardifyTables(root = document) {
  $$('table', root).forEach((tb) => {
    const ths = $$('thead th', tb); if (!ths.length) return;
    tb.classList.add('cards');
    const labels = ths.map((th) => th.textContent.trim());
    $$('tbody tr', tb).forEach((tr) => [...tr.children].forEach((td, i) => {
      if (td.hasAttribute('colspan')) { td.dataset.label = ''; return; }
      if (td.dataset.label === undefined) td.dataset.label = labels[i] || '';
      td.classList.toggle('vide', !td.textContent.trim() && !td.querySelector('button,img,input,select'));
    }));
  });
}
let cardT = null;
new MutationObserver(() => { cancelAnimationFrame(cardT); cardT = requestAnimationFrame(() => cardifyTables()); }).observe(document.documentElement, { childList: true, subtree: true });
const ROUTES = {};
async function render() {
  if (!S.me) return;
  if (!$('#view')) renderShell();
  const hash = location.hash || '#/';
  const [, name = '', id = ''] = hash.split('/');
  const key = name || 'home';
  $$('[data-nav]').forEach((a) => { const n = a.dataset.nav.split('/')[1] || 'home'; const map = { chantier: 'chantiers', technicien: 'techniciens', equipement: 'materiel' }; a.classList.toggle('active', n === (map[key] || key)); });
  const view = $('#view');
  const fn = ROUTES[key] || ROUTES.home;
  try { await fn(view, decodeURIComponent(id)); }
  catch (e) { view.innerHTML = `<div class="card"><p class="err">${esc(e.message)}</p></div>`; }
  window.scrollTo(0, 0);
}
let lastBg = 0;
async function backgroundRefresh() {
  if (!navigator.onLine || !S.token || Date.now() - lastBg < 15000) return;
  lastBg = Date.now();
  const before = JSON.stringify(S.data);
  try { await loadData(); } catch { return; }
  if (JSON.stringify(S.data) !== before && !$('.modal-bg') && !camStream) render();
}
window.addEventListener('hashchange', async () => { stopCamera(); await render(); backgroundRefresh(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') backgroundRefresh(); });

// ---------------- démarrage ----------------
async function start() {
  await queueRefresh().catch(() => {});
  await rejectedLoad().catch(() => {});
  const m = location.pathname.match(/^\/e\/([A-Za-z0-9-]+)/);
  const eqFromUrl = m ? m[1] : null;
  if (!S.token) {
    let info = null;
    if (eqFromUrl) { try { info = await api('GET', 'public/e/' + eqFromUrl); } catch { info = { id: eqFromUrl, name: 'Équipement ' + eqFromUrl }; } sessionStorage.setItem('mimouni_after_login', eqFromUrl); }
    return viewLogin('', info);
  }
  try { await loadData(); }
  catch (e) { if (!S.token) return; return viewLogin(e.message); }
  if (!S.me) return viewLogin();
  const after = eqFromUrl || sessionStorage.getItem('mimouni_after_login');
  sessionStorage.removeItem('mimouni_after_login');
  if (eqFromUrl) history.replaceState(null, '', '/');
  renderShell();
  if (after) location.hash = '#/equipement/' + after; else render();
  if (after && location.hash === '#/equipement/' + after) render();
  proposeSync();
}
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
document.addEventListener('DOMContentLoaded', start);

// ================= VUES =================
const kpi = (v, l, cls = '', href = '') => `<a class="kpi ${cls}" ${href ? `href="${href}"` : ''} style="text-decoration:none;color:inherit;display:block;cursor:pointer"><div class="v">${v}</div><div class="l">${esc(l)}</div></a>`;
const statusPill = (s) => `<span class="pill ${s === 'Terminée' || s === 'Clôturé' ? 'green' : s === 'Bloquée' ? 'red' : s === 'En cours' ? 'dark' : s === 'Annulée' ? '' : s === 'Clôture proposée' ? 'orange' : ''}">${esc(s)}</span>`;

function seniority(entryDate) {
  if (!entryDate) return '';
  const start = parseD(entryDate);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) { years--; months += 12; }
  if (now.getDate() < start.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  if (years > 0 && months > 0) return `${years} an${years > 1 ? 's' : ''} ${months} mois`;
  if (years > 0) return `${years} an${years > 1 ? 's' : ''}`;
  if (months > 0) return `${months} mois`;
  const days = Math.floor((now - start) / 86400000);
  return days <= 0 ? 'Aujourd\'hui' : `${days} jour${days > 1 ? 's' : ''}`;
}

function presentToday() {
  const day = todayISO();
  const techs = D().technicians.filter((t) => t.active !== false);
  const assignedIds = new Set(D().assignments.filter((a) => a.date === day).map((a) => a.techId));
  const absents = techs.filter((t) => absentOn(t.id, day));
  const present = techs.filter((t) => assignedIds.has(t.id) && !absentOn(t.id, day));
  return { present: present.length, assigned: assignedIds.size, absents: absents.length, total: techs.length };
}

ROUTES.home = async (v) => {
  if (isTech()) return viewMyActivity(v);
  const d = D(); const day = todayISO();
  const active = d.chantiers.filter((c) => c.status === 'En cours');
  const late = d.chantiers.filter(isLate);
  const tasks = d.tasks.filter((t) => t.status !== 'Annulée');
  const blocked = tasks.filter((t) => t.status === 'Bloquée');
  const pendingTasks = tasks.filter(taskLate);
  const habs = habAlerts();
  const pr = presentToday();
  const planned = d.chantiers.reduce((s, c) => s + progressOf(c.id).total, 0);
  const real = d.chantiers.reduce((s, c) => s + progressOf(c.id).real, 0);
  const gap = d.chantiers.reduce((s, c) => s + progressOf(c.id).gap, 0);
  const month = day.slice(0, 7);
  const absMonth = d.absences.filter((a) => (a.start || '').slice(0, 7) === month || (a.end || '').slice(0, 7) === month);
  const absCount = {}; absMonth.forEach((a) => { const l = absLabel(a); absCount[l] = (absCount[l] || 0) + 1; });
  const conflicts = allConflicts();
  const eqCount = d.equipment.length;
  const pendingInter = (d.recent || []).filter(e => e.type === 'intervention' && !e.done).length || pendingTasks.length;
  v.innerHTML = `
  <div class="head"><h1>Tableau de bord</h1><span class="muted small">${isChef() ? 'Vos chantiers et votre équipe' : 'Vue globale de l\'entreprise'} – ${fmtD(day)}</span></div>
  ${(() => { const n = (d.timesheets || []).filter((f) => f.status === 'Envoyée' && canDecideLocal(f)).length; return n ? `<div class="notice" style="margin-bottom:1rem">${ICON.clock} <b>${n} feuille${n > 1 ? 's' : ''} d'heures à valider</b> – <a href="#/pointage">ouvrir le pointage</a></div>` : ''; })()}
  ${!d.chantiers.length && isAdmin() ? `<div class="notice" style="margin-bottom:1rem">Aucune donnée pour l'instant. Créez vos techniciens et chantiers, ou chargez des données d'exemple dans <a href="#/reglages">Réglages</a>.</div>` : ''}
  <div class="grid g4" style="margin-bottom:1.5rem">
    ${kpi(pr.total, 'Techniciens', '', '#/techniciens')}
    ${kpi(active.length, 'Chantiers actifs', '', '#/chantiers')}
    ${kpi(pendingTasks.length, 'Tâches en retard', pendingTasks.length ? 'red' : 'ok', '#/chantiers')}
    ${kpi(habs.length, 'Habilitations à renouveler', habs.length ? 'red' : 'ok', '#/techniciens')}
  </div>
  <div class="grid g3" style="margin-bottom:1.5rem">
    ${kpi(`${pr.present}/${pr.total}`, 'Présents (affectés et non absents)', '', '#/planning')}
    ${kpi(pr.absents, 'Absents aujourd\'hui', pr.absents ? 'red' : 'ok', '#/absences')}
    ${kpi(late.length, 'Chantiers en retard', late.length ? 'red' : 'ok', '#/chantiers')}
    ${kpi(h(planned) + ' / ' + h(real), 'Heures prévues / réalisées', '', '#/chantiers')}
    ${kpi(eqCount, 'Équipements', '', '#/materiel')}
    ${kpi(blocked.length, 'Tâches bloquantes', blocked.length ? 'red' : 'ok', '#/chantiers')}
  </div>
  <div class="grid g2">
    <div class="card"><h2>Avancement des chantiers</h2>${hbars(d.chantiers.filter((c) => c.status !== 'Clôturé').map((c) => ({ l: c.name, v: progressOf(c.id).pct, late: isLate(c) })).sort((a, b) => b.v - a.v))}</div>
    <div class="card"><h2>Répartition des tâches</h2>${donut(['À faire', 'En cours', 'Bloquée', 'Terminée'].map((s, i) => ({ l: s, v: tasks.filter((t) => t.status === s).length, c: ['#94A3B8', '#17365D', '#DC2626', '#16A34A'][i] })))}</div>
    <div class="card"><h2>Heures prévues et réalisées</h2>${groupedBars(d.chantiers.filter((c) => progressOf(c.id).total).map((c) => ({ l: c.name, a: progressOf(c.id).total, b: progressOf(c.id).real })))}</div>
    <div class="card"><h2>Centre d'alertes</h2>${habs.length || late.length || blocked.length ? `<div class="list">${habs.slice(0,3).map(({ t, hb, st }) => `<a class="item" href="#/technicien/${t.id}" style="text-decoration:none;color:inherit"><span>Habilitation – ${esc(t.firstName + ' ' + t.lastName)}</span><span class="pill ${st.cls}">${esc(st.label)}</span></a>`).join('')}${late.slice(0,2).map(c => `<a class="item" href="#/chantier/${c.id}" style="text-decoration:none;color:inherit"><span>Chantier en retard – ${esc(c.name)}</span><span class="pill red">Retard</span></a>`).join('')}${blocked.slice(0,2).map(t => `<a class="item" href="#/chantier/${t.chantierId}" style="text-decoration:none;color:inherit"><span>Tâche bloquante – ${esc(t.title)}</span><span class="pill red">Bloquée</span></a>`).join('')}</div>` : '<p class="muted">Aucune alerte prioritaire.</p>'}</div>
    <div class="card"><h2>Habilitations à renouveler</h2>${habs.length ? `<div class="list">${habs.map(({ t, hb, st }) => `<div class="item"><a href="#/technicien/${t.id}">${esc(t.firstName + ' ' + t.lastName)}</a><span>${esc(hb.symbol || hb.kind)} – ${fmtD(hb.expires)} <span class="pill ${st.cls}">${esc(st.label)}</span></span></div>`).join('')}</div>` : '<p class="muted">Aucune habilitation à renouveler dans les 60 jours.</p>'}</div>
    <div class="card"><h2>Activité récente</h2>${recentFeed()}</div>
  </div>`;
};

function recentFeed() {
  const r = D().recent || [];
  if (!r.length) return '<p class="muted">Aucune intervention pour l\'instant.</p>';
  return `<div class="timeline">${r.map((e) => { const eq = D().equipment.find((x) => x.id === e.equipId); const ch = e.chantierId ? chantierById(e.chantierId) : null; const link = eq ? `<a href="#/equipement/${eq.id}">${esc(eq.name)}</a>` : ch ? `<a href="#/chantier/${ch.id}">${esc(ch.name)}</a>` : ''; return `<div class="ev ${e.type}"><b>${esc(e.type)}</b> – ${link}<br><span class="small">${esc((e.content || '').slice(0, 90))}${e.photos && e.photos.length ? ' · ' + e.photos.length + ' photo(s)' : ''}</span><br><span class="muted small">${esc(e.authorName || e.author)} · ${fmtDT(e.at)}</span></div>`; }).join('')}</div>`;
}

async function viewMyActivity(v) {
  const me = S.me; const tid = me.technicianId; const day = todayISO();
  const t = techById(tid);
  const myTasks = D().tasks.filter((x) => x.assignee === tid && !['Terminée', 'Annulée'].includes(x.status));
  const week = D().assignments.filter((a) => a.techId === tid && a.date >= day && a.date <= addDays(day, 7)).sort((a, b) => a.date.localeCompare(b.date));
  v.innerHTML = `<div class="head"><h1>Mon activité</h1><span class="muted small">${esc(me.name)}</span></div>
  <a class="btn primary bigbtn" href="#/scanner" style="margin-bottom:.6rem">${ICON.scan} Scanner un équipement</a>
  <a class="btn dark bigbtn" href="#/pointage" style="margin-bottom:1rem">${ICON.clock} Pointer mes heures du jour</a>
  ${(() => { const ref = (D().timesheets || []).filter((f) => f.techId === tid && f.status === 'Refusée'); return ref.length ? `<div class="notice" style="margin-bottom:1rem"><b>${ref.length} feuille${ref.length > 1 ? 's' : ''} d'heures refusée${ref.length > 1 ? 's' : ''}</b> : <a href="#/pointage">corriger et renvoyer</a>.</div>` : ''; })()}
  ${!tid ? '<div class="notice">Votre compte n\'est pas encore relié à une fiche technicien. Prévenez l\'administrateur.</div>' : ''}
  <div class="grid g2">
  <div class="card"><h2>Mes tâches en cours</h2>${myTasks.map((x) => `<div class="list"><div class="item"><a href="#/chantier/${x.chantierId}">${esc(x.title)}</a><span>${statusPill(x.status)}</span></div></div>`).join('') || '<p class="muted">Aucune tâche.</p>'}</div>
  <div class="card"><h2>Mon planning (7 jours)</h2>${week.map((a) => `<div class="list"><div class="item"><span>${fmtD(a.date)} · ${esc(a.slot)}</span><span>${esc(chantierById(a.chantierId)?.name || '–')}</span></div></div>`).join('') || '<p class="muted">Rien de prévu.</p>'}</div>
  <div class="card"><h2>Mes habilitations</h2>${t ? habTable(t) : '–'}</div>
  <div class="card"><h2>Activité récente</h2>${recentFeed()}</div></div>`;
}

// ---------------- Chantiers ----------------
ROUTES.chantiers = async (v) => {
  const list = D().chantiers.slice().sort((a, b) => (a.status === 'Clôturé') - (b.status === 'Clôturé') || a.name.localeCompare(b.name));
  const total = list.length;
  const enCours = list.filter(c => c.status === 'En cours').length;
  const termines = list.filter(c => c.status === 'Clôturé').length;
  const enRetard = list.filter(isLate).length;
  const q = (PL.chQ || '').toLowerCase();
  const filter = PL.chFilter || 'all';
  let filtered = list.filter(c => !q || (c.name + ' ' + (c.client||'') + ' ' + (c.address||'')).toLowerCase().includes(q));
  if (filter === 'cours') filtered = filtered.filter(c => c.status === 'En cours');
  else if (filter === 'termine') filtered = filtered.filter(c => c.status === 'Clôturé');
  else if (filter === 'retard') filtered = filtered.filter(isLate);
  v.innerHTML = `<div class="head"><h1>Gestion des chantiers</h1>${isAdmin() ? '<button class="btn primary" id="new-ch">+ Nouveau chantier</button>' : ''}</div>
  <div class="grid g4" style="margin-bottom:1rem">
    ${kpi(total, 'Total chantiers')}
    ${kpi(enCours, 'En cours')}
    ${kpi(termines, 'Terminés', 'ok')}
    ${kpi(enRetard, 'En retard', enRetard ? 'red' : 'ok')}
  </div>
  <div class="card" style="margin-bottom:1rem">
    <div class="row" style="gap:0.5rem;flex-wrap:wrap">
      <input class="inp" id="chq" placeholder="Rechercher nom, client, adresse…" value="${esc(PL.chQ || '')}" style="flex:1;min-width:160px">
      <button class="btn sm ${filter==='all'?'dark':''}" data-f="all">Tous</button>
      <button class="btn sm ${filter==='cours'?'dark':''}" data-f="cours">En cours</button>
      <button class="btn sm ${filter==='termine'?'dark':''}" data-f="termine">Terminés</button>
      <button class="btn sm ${filter==='retard'?'dark':''}" data-f="retard">En retard</button>
    </div>
  </div>
  ${filtered.length ? `<div class="grid g3">${filtered.map((c) => { const p = progressOf(c.id); const late = isLate(c); return `<a class="card" href="#/chantier/${c.id}" style="text-decoration:none;color:inherit;display:block"><div class="row" style="justify-content:space-between"><b>${esc(c.name)}</b>${statusPill(c.status)}</div><p class="muted small" style="margin:.3rem 0">${esc(c.client || '')} · ${esc(c.address || '')}</p><div class="bar"><i style="width:${p.pct}%"></i></div><div class="row small" style="justify-content:space-between;margin-top:.3rem"><span><b>${String(p.pct).replace('.', ',')} %</b> d'avancement</span>${late ? '<span class="pill red">En retard</span>' : ''}${demoTag(c)}</div></a>`; }).join('')}</div>` : '<div class="card"><p class="muted">Aucun chantier correspondant.</p></div>'}`;
  const b = $('#new-ch'); if (b) b.onclick = () => chantierForm();
  $('#chq', v).oninput = (e) => { PL.chQ = e.target.value; clearTimeout(PL.chT); PL.chT = setTimeout(() => render(), 250); };
  $$('[data-f]', v).forEach(btn => btn.onclick = () => { PL.chFilter = btn.dataset.f; render(); });
};

function chantierForm(c = null) {
  const chefs = (D().users || []).filter((u) => u.role === 'chef' || u.role === 'admin');
  formModal({
    title: c ? 'Modifier le chantier' : 'Nouveau chantier',
    fields: [
      { name: 'name', label: 'Nom du chantier', required: true, value: c?.name, maxlength: 120 },
      { name: 'client', label: 'Client', value: c?.client },
      { name: 'address', label: 'Adresse', value: c?.address },
      { name: 'chefId', label: 'Chef de chantier responsable', type: 'select', options: [['', '– Aucun –'], ...chefs.map((u) => [u.login, u.name + ' (' + ROLE_LABEL[u.role] + ')'])], value: c?.chefId },
      { name: 'start', label: 'Date de début', type: 'date', value: c?.start },
      { name: 'endPlanned', label: 'Date de fin prévue', type: 'date', value: c?.endPlanned },
      { name: 'status', label: 'Statut', type: 'select', options: ['En préparation', 'En cours', 'Clôture proposée', 'Clôturé'], value: c?.status || 'En préparation' },
      { name: 'team', label: 'Équipe', type: 'checks', options: D().technicians.filter((t) => t.active !== false).map((t) => [t.id, t.firstName + ' ' + t.lastName]), value: c?.team || [] },
      { name: 'description', label: 'Description', type: 'textarea', value: c?.description },
    ],
    onSubmit: async (vals) => {
      const r = c ? await api('PUT', 'chantiers/' + c.id, vals) : await api('POST', 'chantiers', vals);
      toast(c ? 'Chantier modifié' : 'Chantier créé'); await loadData(); location.hash = '#/chantier/' + r.id; render();
    },
  });
}

ROUTES.chantier = async (v, id) => {
  const c = chantierById(id);
  if (!c) { v.innerHTML = '<div class="card"><p class="err">Chantier introuvable ou non autorisé.</p><a href="#/chantiers">Retour</a></div>'; return; }
  const p = progressOf(c.id); const est = estimateOf(c);
  const tasks = D().tasks.filter((t) => t.chantierId === c.id).sort((a, b) => (a.end || '').localeCompare(b.end || ''));
  const equip = D().equipment.filter((e) => e.chantierId === c.id);
  const canTask = isAdmin() || (isChef() && c.chefId === S.me.login);
  let notes = [];
  try { notes = await api('GET', `chantiers/${c.id}/notes`); await idb.set('notes-' + c.id, notes); } catch { notes = (await idb.get('notes-' + c.id)) || []; }
  const estHTML = est.reliable
    ? `<div class="estim" title="Calcul : heures restantes ÷ rythme réel (heures prévues des tâches terminées par jour ouvré écoulé). Ce n'est pas un engagement."><span class="tag">ⓘ Estimation</span><br>Fin prévue : <b>${fmtD(c.endPlanned)}</b> – Fin estimée : <b>${fmtD(est.date)}</b>${est.delta ? ` (<b style="color:${est.delta > 0 ? 'var(--rouge)' : 'var(--vert)'}">${est.delta > 0 ? '+' : ''}${est.delta} jours ouvrés</b>)` : ''}</div>`
    : `<div class="estim"><span class="tag">ⓘ Estimation</span><br>${esc(est.reason)}<br>Fin prévue : <b>${fmtD(c.endPlanned)}</b></div>`;
  v.innerHTML = `
  <div class="head"><div><a href="#/chantiers" class="small">← Chantiers</a><h1>${esc(c.name)}${demoTag(c)}</h1></div>
    <div class="row">${statusPill(c.status)}
      ${isAdmin() ? '<button class="btn sm" id="edit-ch">Modifier</button><button class="btn sm" style="background:#DC2626;color:#fff" id="del-ch">Supprimer</button>' : ''}
      ${isChef() && c.status === 'En cours' ? '<button class="btn sm" id="propose">Proposer la clôture</button>' : ''}
      ${isAdmin() && c.status === 'Clôture proposée' ? '<button class="btn sm primary" id="close-ch">Valider la clôture</button>' : ''}
      ${!isTech() ? '<button class="btn sm dark" id="pdf">Rapport PDF</button>' : ''}</div></div>
  <div class="grid g4" style="margin-bottom:1rem">
    ${kpi(String(p.pct).replace('.', ',') + ' %', 'Avancement')}
    ${kpi(h(p.total), 'Heures prévues')}
    ${kpi(h(p.real), 'Heures réalisées')}
    ${kpi((p.gap > 0 ? '+' : '') + h(p.gap), 'Écart (tâches terminées)', p.gap > 0 ? 'red' : 'ok')}
  </div>
  <div class="grid g2">
    <div class="card"><h2>Informations</h2>
      <table><tr><th>Client</th><td>${esc(c.client || '–')}</td></tr><tr><th>Adresse</th><td>${esc(c.address || '–')}</td></tr>
      <tr><th>Responsable</th><td>${esc(userName(c.chefId))}</td></tr><tr><th>Dates prévues</th><td>${fmtD(c.start)} → ${fmtD(c.endPlanned)}</td></tr>
      <tr><th>Équipe</th><td>${(c.team || []).map((t) => esc(techName(t))).join(', ') || '–'} ${canTask ? '<button class="btn sm" id="team">Modifier l\'équipe</button>' : ''}</td></tr></table>
      ${c.description ? `<p>${esc(c.description)}</p>` : ''}</div>
    <div class="card"><h2>Avancement</h2><div class="bar" style="height:16px"><i style="width:${p.pct}%"></i></div>
      <p class="small muted">Avancement = heures prévues des tâches terminées (${h(p.done)}) ÷ heures prévues de toutes les tâches (${h(p.total)}).</p>${estHTML}</div>
  </div>
  <div class="card"><div class="head"><h2>Tâches</h2>${canTask ? '<button class="btn primary sm" id="new-task">+ Tâche</button>' : ''}</div>
    <div class="table-wrap"><table><thead><tr><th>Tâche</th><th>Statut</th><th>Prévu</th><th>Réalisé</th><th>Échéance</th><th>Affecté à</th><th></th></tr></thead><tbody>
    ${tasks.map((t) => { const mine = isTech() && t.assignee === S.me.technicianId; const edit = canTask || mine; return `<tr><td>${esc(t.title)}${t.status === 'Bloquée' ? `<br><span class="small err">Bloquée : ${esc(t.blockReason)}</span>` : ''}${t.conflicts && t.conflicts.length && !isTech() ? '<br><span class="pill orange">Conflit de modification signalé</span>' : ''}</td><td>${statusPill(t.status)}</td><td>${h(t.plannedHours)}</td><td>${h(realH(t))}</td><td>${fmtD(t.end)} ${taskLate(t) ? '<span class="pill red">Retard</span>' : ''}</td><td>${esc(techName(t.assignee))}</td><td>${edit ? `<button class="btn sm" data-task="${t.id}">Mettre à jour</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="7" class="muted">Aucune tâche.</td></tr>'}
    </tbody></table></div></div>
  <div class="grid g2">
    <div class="card"><h2>Matériel installé</h2>${equip.map((e) => `<div class="list"><div class="item"><a href="#/equipement/${e.id}">${esc(e.name)}</a><span class="muted small">${esc(e.id)}</span></div></div>`).join('') || '<p class="muted">Aucun équipement.</p>'}</div>
    <div class="card"><div class="head"><h2>Photos, documents et remarques</h2><button class="btn sm" id="add-note">+ Ajouter</button></div>
      <div class="timeline">${notes.slice().reverse().map((n) => `<div class="ev"><b>${esc(n.title || n.type)}</b> <span class="muted small">· ${esc(n.authorName)} · ${fmtDT(n.at)}</span><div>${esc(n.content)}</div>${photosHTML(n.photos)}</div>`).join('') || '<p class="muted">Rien pour l\'instant.</p>'}</div></div>
  </div>`;
  bindPhotos(v);
  const on = (sel, fn) => { const el = $(sel, v); if (el) el.onclick = fn; };
  on('#edit-ch', () => chantierForm(c));
  on('#del-ch', async () => { if (await confirmBox(`Supprimer définitivement le chantier « ${esc(c.name)} » ? Cette action est irréversible.`, 'Supprimer')) { await api('DELETE', 'chantiers/' + c.id); toast('Chantier supprimé'); location.hash = '#/chantiers'; refresh(); } });
  on('#pdf', () => chantierPDF(c));
  on('#propose', async () => { if (await confirmBox('Proposer la clôture de ce chantier à l\'administrateur ?')) { try { await api('PUT', 'chantiers/' + c.id, { status: 'Clôture proposée' }); } catch (e) { return alertBox(e.message, 'Clôture impossible pour l\'instant'); } toast('Clôture proposée'); refresh(); } });
  on('#close-ch', async () => { if (await confirmBox('Valider la clôture ? Le chantier passera en « Clôturé » (archivé, jamais effacé).')) { try { await api('PUT', 'chantiers/' + c.id, { status: 'Clôturé' }); } catch (e) { return alertBox(e.message, 'Clôture impossible pour l\'instant'); } toast('Chantier clôturé'); refresh(); } });
  on('#team', () => formModal({ title: 'Équipe du chantier', fields: [{ name: 'team', label: 'Techniciens', type: 'checks', options: D().technicians.filter((t) => t.active !== false).map((t) => [t.id, t.firstName + ' ' + t.lastName]), value: c.team || [] }], onSubmit: async (vals) => { await api('PUT', 'chantiers/' + c.id, { team: vals.team }); toast('Équipe mise à jour'); refresh(); } }));
  on('#new-task', () => taskForm(c));
  on('#add-note', () => formModal({ title: 'Ajouter au chantier', fields: isTech() ? [{ name: 'photos', label: 'Photos', type: 'photos', capture: true }, { name: 'content', label: 'Légende', type: 'textarea' }] : [{ name: 'title', label: 'Titre (ex. plan, schéma électrique, remarque)' }, { name: 'content', label: 'Texte', type: 'textarea' }, { name: 'photos', label: 'Photos / scans de plans', type: 'photos' }], onSubmit: async (vals) => { await api('POST', `chantiers/${c.id}/notes`, vals); toast('Ajouté'); refresh(); } }));
  $$('[data-task]', v).forEach((b) => (b.onclick = () => taskUpdate(D().tasks.find((t) => t.id === b.dataset.task), c)));
};

function taskForm(c) {
  formModal({ title: 'Nouvelle tâche', fields: [
    { name: 'title', label: 'Titre', required: true, maxlength: 200 },
    { name: 'plannedHours', label: 'Heures prévues', type: 'number', step: '0.5', min: '0', max: '10000', required: true },
    { name: 'start', label: 'Début', type: 'date' }, { name: 'end', label: 'Échéance', type: 'date' },
    { name: 'assignee', label: 'Affectée à', type: 'select', options: [['', '– Personne –'], ...(c.team || []).map((t) => [t, techName(t)])] },
    { name: 'requiredHab', label: 'Habilitation requise (ex. B2V)' },
  ], onSubmit: async (vals) => { await api('POST', 'tasks', { ...vals, chantierId: c.id }); toast('Tâche créée'); refresh(); } });
}
function taskUpdate(t, c) {
  const statuses = isAdmin() ? TASK_STATUS : TASK_STATUS.filter((s) => s !== 'Annulée');
  const fields = [
    { name: 'status', label: 'Statut', type: 'select', options: statuses, value: t.status },
    { name: 'blockReason', label: 'Motif de blocage (obligatoire si « Bloquée »)', value: t.blockReason, placeholder: 'attente matériel, attente client, consignation…' },
  ];
  if (!isTech()) fields.push({ name: 'doneHours', label: `Ajustement d'heures hors pointage (les heures pointées validées : ${h(t.tsHours || 0)} s'ajoutent)`, type: 'number', step: '0.5', min: '0', max: '10000', value: t.doneHours || 0 });
  const intro = isTech() ? '<p class="muted small">Vos heures se déclarent dans « Mes heures » (feuille du jour), puis le chef les valide.</p>' : '';
  if (!isTech()) fields.push({ name: 'plannedHours', label: 'Heures prévues', type: 'number', step: '0.5', min: '0', max: '10000', value: t.plannedHours }, { name: 'end', label: 'Échéance', type: 'date', value: t.end }, { name: 'assignee', label: 'Affectée à', type: 'select', options: [['', '– Personne –'], ...(c.team || []).map((x) => [x, techName(x)])], value: t.assignee });
  formModal({ title: t.title, intro, fields, onSubmit: async (vals) => {
    const r = await api('PUT', 'tasks/' + t.id, { ...vals, baseUpdatedAt: t.updatedAt }, { queueable: true, kind: 'tâche', label: 'Tâche « ' + t.title + ' » : ' + vals.status });
    if (r.queued) { toast('Hors ligne : modification enregistrée sur l\'appareil.'); return; }
    toast(r.conflict ? 'Enregistré – conflit signalé (une autre personne avait modifié la tâche).' : 'Tâche mise à jour'); refresh();
  } });
}

const photoCache = {};
function photosHTML(ids) { return ids && ids.length ? `<div class="photos">${ids.map((id) => `<img data-photo="${esc(id)}" alt="Photo" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">`).join('')}</div>` : ''; }
async function bindPhotos(root) {
  for (const img of $$('img[data-photo]', root)) {
    const id = img.dataset.photo;
    try {
      if (!photoCache[id]) { const local = await idb.get('photo-' + id); photoCache[id] = local || (await api('GET', 'photos/' + id)).dataUrl; if (!local) idb.set('photo-' + id, photoCache[id]); }
      img.src = photoCache[id];
      img.onclick = () => modal(`<img src="${photoCache[id]}" style="width:100%;border-radius:8px"><div class="actions"><button class="btn" data-x>Fermer</button></div>`, (r, close) => { r.querySelector('[data-x]').onclick = close; });
    } catch { img.alt = 'Photo indisponible hors ligne'; }
  }
}

// ---------------- Planning ----------------
const PL = { mode: 'week', anchor: todayISO() };
function weekStart(s) { const d = parseD(s); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return iso(d); }
ROUTES.planning = async (v) => {
  let days;
  if (PL.mode === 'day') days = [PL.anchor];
  else if (PL.mode === 'week') { const s = weekStart(PL.anchor); days = Array.from({ length: 7 }, (_, i) => addDays(s, i)); }
  else { const d = parseD(PL.anchor); const first = iso(new Date(d.getFullYear(), d.getMonth(), 1)); const n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); days = Array.from({ length: n }, (_, i) => addDays(first, i)); }
  let techs = D().technicians.filter((t) => t.active !== false);
  if (isTech()) techs = techs.filter((t) => t.id === S.me.technicianId);
  const canEdit = !isTech();
  const title = PL.mode === 'day' ? parseD(PL.anchor).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : PL.mode === 'week' ? `Semaine du ${fmtD(days[0])} au ${fmtD(days[6])}` : parseD(PL.anchor).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const cell = (t, day) => {
    const as = D().assignments.filter((a) => a.techId === t.id && a.date === day);
    const ab = absentOn(t.id, day);
    const conf = as.some((a) => assignConflicts(a).length);
    const we = !isWorkDay(day);
    if (PL.mode === 'month') return `<td class="${we ? 'we' : ''} ${conf ? 'conflict' : ''}" title="${esc(as.map((a) => (chantierById(a.chantierId)?.name || 'Autre chantier') + ' (' + a.slot + ')').join(', '))}">${as.length ? `<b>${as.length}</b>` : ''}${ab ? '<span class="chip abs" style="padding:0 2px">A</span>' : ''}</td>`;
    return `<td class="${we ? 'we' : ''} ${conf ? 'conflict' : ''}">${ab ? `<span class="chip abs">${esc(absLabel(ab))}</span>` : ''}${as.map((a) => { const c = chantierById(a.chantierId); const bad = assignConflicts(a).length; return `<span class="chip ${a.other ? 'other' : ''} ${bad ? 'bad' : ''}" data-as="${a.id}" title="${esc(assignConflicts(a).join(' · '))}">${esc(c ? c.name : 'Autre chantier')} · ${esc(a.slot)}${bad ? ' ⚠' : ''}</span>`; }).join('')}</td>`;
  };
  const conflicts = allConflicts().filter((x) => days.includes(x.a.date));
  v.innerHTML = `<div class="head"><h1>Planning</h1>${canEdit ? '<button class="btn primary" id="new-as">+ Affecter</button>' : ''}</div>
  <div class="card"><div class="row" style="justify-content:space-between">
    <div class="row">${['day', 'week', 'month'].map((m) => `<button class="btn sm ${PL.mode === m ? 'dark' : ''}" data-mode="${m}">${{ day: 'Jour', week: 'Semaine', month: 'Mois' }[m]}</button>`).join('')}</div>
    <div class="row"><button class="btn sm" data-nav-d="-1">‹</button><b>${esc(title)}</b><button class="btn sm" data-nav-d="1">›</button><button class="btn sm" data-today>Aujourd'hui</button></div></div>
    ${conflicts.length ? `<p class="err small" id="conflict-list">⚠ ${conflicts.length} conflit(s) : ${conflicts.map((x) => esc(techName(x.a.techId) + ' le ' + fmtD(x.a.date) + ' – ' + x.c.join(', '))).join(' · ')}</p>` : '<p class="muted small">Aucun conflit sur la période.</p>'}
    <div class="table-wrap"><table class="plan ${PL.mode === 'month' ? 'month' : ''}"><thead><tr><th class="tech">Technicien</th>${days.map((d) => `<th data-d="${d}" class="${!isWorkDay(d) ? 'we' : ''}">${PL.mode === 'month' ? parseD(d).getDate() : parseD(d).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</th>`).join('')}</tr></thead>
    <tbody>${techs.map((t) => `<tr><td class="tech" style="cursor:pointer" data-tech="${t.id}"><b>${esc(t.firstName + ' ' + t.lastName)}</b>${demoTag(t)}${canEdit ? ` <button class="btn sm" style="margin-top:4px;padding:2px 8px;font-size:0.7rem" data-assign="${t.id}">+ Affecter</button>` : ''}</td>${days.map((d) => cell(t, d)).join('')}</tr>`).join('') || `<tr><td class="muted" colspan="${days.length + 1}">Aucun technicien.</td></tr>`}</tbody></table></div>
    <p class="muted small">Rouge = conflit (double affectation, absence ou habilitation expirée). ${canEdit ? 'Touchez une affectation pour la retirer.' : ''}</p></div>`;
  // Sur téléphone, la semaine ne tient pas en largeur : on fait défiler jusqu'au jour d'aujourd'hui
  { const wrap = $('.table-wrap', v); const target = days.includes(todayISO()) ? todayISO() : PL.anchor; const th = wrap && wrap.querySelector(`th[data-d="${target}"]`);
    if (wrap && th && wrap.scrollWidth > wrap.clientWidth) { const first = wrap.querySelector('th.tech'); wrap.scrollLeft = Math.max(0, th.offsetLeft - (first ? first.offsetWidth : 0)); } }
  $$('[data-mode]', v).forEach((b) => (b.onclick = () => { PL.mode = b.dataset.mode; render(); }));
  $$('[data-nav-d]', v).forEach((b) => (b.onclick = () => { const k = Number(b.dataset.navD); if (PL.mode === 'day') PL.anchor = addDays(PL.anchor, k); else if (PL.mode === 'week') PL.anchor = addDays(PL.anchor, 7 * k); else { const d = parseD(PL.anchor); PL.anchor = iso(new Date(d.getFullYear(), d.getMonth() + k, 1)); } render(); }));
  $('[data-today]', v).onclick = () => { PL.anchor = todayISO(); render(); };
  if (canEdit) {
    $('#new-as', v).onclick = () => assignForm();
    $$('[data-assign]', v).forEach((b) => (b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); assignForm(b.dataset.assign); }));
    $$('[data-as]', v).forEach((el) => (el.onclick = async () => { const a = D().assignments.find((x) => x.id === el.dataset.as); if (!a || a.other) return; if (await confirmBox(`Retirer l'affectation de ${esc(techName(a.techId))} le ${fmtD(a.date)} ?`, 'Retirer')) { await api('DELETE', 'assignments/' + a.id); toast('Affectation retirée'); refresh(); } }));
  }
  $$('[data-tech]', v).forEach((td) => (td.onclick = (e) => { if (e.target.closest('[data-assign]')) return; location.hash = '#/technicien/' + td.dataset.tech; }));
};
function assignForm(preTech = null) {
  const ch = D().chantiers.filter((c) => c.status !== 'Clôturé');
  formModal({ title: 'Affecter un technicien', fields: [
    { name: 'techId', label: 'Technicien', type: 'select', required: true, options: D().technicians.filter((t) => t.active !== false).map((t) => [t.id, t.firstName + ' ' + t.lastName]), value: preTech },
    { name: 'chantierId', label: 'Chantier', type: 'select', required: true, options: ch.map((c) => [c.id, c.name]) },
    { name: 'date', label: 'Date', type: 'date', required: true, value: PL.anchor },
    { name: 'slot', label: 'Créneau', type: 'select', options: ['journée', 'matin', 'après-midi'] },
    { name: 'note', label: 'Remarque' },
  ], submitLabel: 'Affecter', onSubmit: async (vals) => {
    const r = await api('POST', 'assignments', vals);
    if (r.conflicts && r.conflicts.length) toast('⚠ Affecté, mais conflit : ' + r.conflicts.map((c) => c.message).join(' · '), 6000); else toast('Affectation enregistrée');
    PL.anchor = vals.date; refresh();
  } });
}

// ---------------- Techniciens ----------------
function habTable(t, all = false) {
  const list = all ? (t.habilitations || []).slice().sort((a, b) => (b.expires || '').localeCompare(a.expires || '')) : currentHabs(t);
  if (!list.length) return '<p class="muted">Aucune habilitation enregistrée.</p>';
  const cur = new Set(currentHabs(t).map((x) => x.id));
  return `<div class="table-wrap"><table><thead><tr><th>Type</th><th>Symbole</th><th>Délivrée</th><th>Fin de validité</th><th>État</th></tr></thead><tbody>${list.map((hb) => { const st = habStatus(hb); return `<tr class="click" data-hab="${hb.id}" style="${cur.has(hb.id) ? '' : 'opacity:.55'};cursor:pointer"><td>${esc(hb.kind)}</td><td><b>${esc(hb.symbol)}</b></td><td>${fmtD(hb.issued)}</td><td>${fmtD(hb.expires)}</td><td>${cur.has(hb.id) ? `<span class="pill ${st.cls}">${esc(st.label)}</span>` : '<span class="pill">Remplacée (historique)</span>'}</td></tr>`; }).join('')}</tbody></table></div>`;
}
ROUTES.techniciens = async (v) => {
  if (isTech()) { location.hash = '#/technicien/' + S.me.technicianId; return; }
  const q = (PL.techQ || '').toLowerCase();
  const list = D().technicians.filter((t) => !q || (t.firstName + ' ' + t.lastName + ' ' + (t.skills || []).join(' ')).toLowerCase().includes(q)).sort((a, b) => a.lastName.localeCompare(b.lastName));
  v.innerHTML = `<div class="head"><h1>Techniciens <span class="muted small">(${D().technicians.length})</span></h1>${isAdmin() ? '<button class="btn primary" id="new-t">+ Nouveau technicien</button>' : ''}</div>
  <div class="card"><input class="inp" id="tq" placeholder="Rechercher un nom ou une compétence…" value="${esc(PL.techQ || '')}">
  <div class="table-wrap"><table><thead><tr><th>Nom</th><th>Poste</th><th>Compétences</th><th>Habilitations</th><th>Aujourd'hui</th></tr></thead><tbody>
  ${list.map((t) => { const worst = currentHabs(t).map(habStatus).sort((a, b) => b.level - a.level)[0]; const ab = absentOn(t.id, todayISO()); return `<tr class="click" data-t="${t.id}"><td><b>${esc(t.firstName + ' ' + t.lastName)}</b>${demoTag(t)}${t.active === false ? ' <span class="pill">Inactif</span>' : ''}</td><td>${esc(t.position || '')}</td><td class="small">${esc((t.skills || []).join(', '))}</td><td>${worst ? `<span class="pill ${worst.cls}">${esc(worst.label)}</span>` : '–'}</td><td>${ab ? `<span class="pill">${esc(absLabel(ab))}</span>` : '<span class="pill green">Disponible</span>'}</td></tr>`; }).join('') || '<tr><td colspan="5" class="muted">Aucun technicien.</td></tr>'}
  </tbody></table></div></div>`;
  $('#tq', v).oninput = (e) => { PL.techQ = e.target.value; clearTimeout(PL.tqT); PL.tqT = setTimeout(async () => { render().then(() => { const i = $('#tq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }); }, 300); };
  $$('[data-t]', v).forEach((r) => (r.onclick = () => (location.hash = '#/technicien/' + r.dataset.t)));
  const b = $('#new-t', v); if (b) b.onclick = () => techForm();
};
function techForm(t = null) {
  formModal({ title: t ? 'Modifier la fiche' : 'Nouveau technicien', fields: [
    { name: 'firstName', label: 'Prénom', value: t?.firstName }, { name: 'lastName', label: 'Nom', required: true, value: t?.lastName },
    { name: 'position', label: 'Poste', value: t?.position }, { name: 'phone', label: 'Téléphone', type: 'tel', value: t?.phone },
    { name: 'email', label: 'Email', type: 'email', value: t?.email }, { name: 'address', label: 'Adresse (visible admin seul)', value: t?.address },
    { name: 'entryDate', label: 'Date d\'entrée', type: 'date', value: t?.entryDate },
    { name: 'skills', label: 'Compétences (séparées par des virgules)', value: (t?.skills || []).join(', '), placeholder: 'Automatisme, HTA/BT, câblage armoire, variation de vitesse…' },
    { name: 'photo', label: 'Photo de profil', type: 'photos', capture: true },
    { name: 'active', label: 'Statut', type: 'select', options: [['1', 'Actif'], ['0', 'Inactif (parti)']], value: t && t.active === false ? '0' : '1' },
    { name: 'notes', label: 'Notes', type: 'textarea', value: t?.notes },
  ], onSubmit: async (vals) => {
    const body = { ...vals, skills: vals.skills.split(',').map((s) => s.trim()).filter(Boolean), active: vals.active === '1' };
    if (vals.photo && vals.photo.length) body.photo = vals.photo[0];
    const r = t ? await api('PUT', 'technicians/' + t.id, body) : await api('POST', 'technicians', body);
    toast('Fiche enregistrée'); await loadData(); location.hash = '#/technicien/' + r.id; render();
  } });
}
ROUTES.technicien = async (v, id) => {
  const t = techById(id);
  if (!t) { v.innerHTML = '<div class="card"><p class="err">Fiche introuvable ou non autorisée.</p></div>'; return; }
  const as = D().assignments.filter((a) => a.techId === t.id && a.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 15);
  const abs = D().absences.filter((a) => a.techId === t.id).sort((a, b) => b.start.localeCompare(a.start));
  const tasks = D().tasks.filter((x) => x.assignee === t.id);
  v.innerHTML = `<div class="head"><div>${!isTech() ? '<a href="#/techniciens" class="small">← Techniciens</a>' : ''}<h1>${esc(t.firstName + ' ' + t.lastName)}${demoTag(t)}</h1></div>${isAdmin() ? '<div class="row"><button class="btn sm" id="edit-t">Modifier</button><button class="btn sm primary" id="add-hab">+ Habilitation</button><button class="btn sm" style="background:#DC2626;color:#fff" id="del-t">Supprimer</button></div>' : ''}</div>
  <div class="grid g2">
    <div class="card" style="text-align:center">
      ${t.photo ? `<img src="${esc(t.photo)}" alt="Photo" style="width:140px;height:140px;object-fit:cover;border-radius:50%;border:4px solid var(--navy);margin-bottom:1rem">` : `<div style="width:140px;height:140px;border-radius:50%;background:#E2E8F0;margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;font-size:3rem;color:var(--navy)">${esc((t.firstName||'')[0]||'')}${(t.lastName||'')[0]||''}</div>`}
      <h2 style="margin:0">${esc(t.firstName + ' ' + t.lastName)}</h2>
      <p class="muted">${esc(t.position || 'Technicien')}</p>
    </div>
    <div class="card"><h2>Coordonnées</h2><table><tr><th>Poste</th><td>${esc(t.position || '–')}</td></tr><tr><th>Téléphone</th><td>${esc(t.phone || '–')}</td></tr><tr><th>Email</th><td>${esc(t.email || '–')}</td></tr>${t.address !== undefined ? `<tr><th>Adresse</th><td>${esc(t.address || '–')}</td></tr>` : ''}<tr><th>Entrée</th><td>${fmtD(t.entryDate)}${t.entryDate ? ` <span class="pill">${seniority(t.entryDate)}</span>` : ''}</td></tr><tr><th>Compétences</th><td>${(t.skills || []).map((s) => `<span class="pill">${esc(s)}</span>`).join(' ') || '–'}</td></tr></table></div>
    <div class="card"><h2>Habilitations ${isAdmin() ? `<button class="btn sm" id="add-hab-icon" style="float:right;padding:4px 10px" title="Ajouter une habilitation">${ICON.list || '+'} Ajouter</button>` : ''}</h2>${habTable(t, true)}<p class="muted small">Alertes : orange à 60 jours, rouge à 30 jours, puis « Expirée ». Un renouvellement ajoute une ligne, l'ancienne reste en historique.</p></div>
    <div class="card"><h2>Prochaines affectations ${!isTech() ? `<button class="btn sm" id="add-as-icon" style="float:right;padding:4px 10px" title="Affecter">${ICON.cal || '+'} Affecter</button>` : ''}</h2>${as.map((a) => `<a class="list" href="#/chantier/${a.chantierId}" style="text-decoration:none;color:inherit"><div class="item"><span>${fmtD(a.date)} · ${esc(a.slot)}</span><span>${esc(chantierById(a.chantierId)?.name || 'Autre chantier')}</span></div></a>`).join('') || '<p class="muted">Aucune.</p>'}</div>
    <div class="card"><h2>Présences et absences ${isAdmin() || isChef() ? `<button class="btn sm" id="add-abs-icon" style="float:right;padding:4px 10px" title="Signaler une absence">${ICON.abs || '+'} Signaler</button>` : ''}</h2>${abs.map((a) => `<div class="list click" data-abs="${a.id}" style="cursor:pointer"><div class="item"><span>${esc(absLabel(a))} · ${fmtD(a.start)}${a.end && a.end !== a.start ? ' → ' + fmtD(a.end) : ''}</span><span class="pill">${esc(a.status)}</span></div></div>`).join('') || '<p class="muted">Aucune absence.</p>'}</div>
    <div class="card"><h2>Historique des tâches</h2>${tasks.map((x) => `<div class="list"><div class="item"><a href="#/chantier/${x.chantierId}">${esc(x.title)}</a><span>${statusPill(x.status)} ${h(realH(x))}</span></div></div>`).join('') || '<p class="muted">Aucune.</p>'}</div>
  </div>`;
  const e1 = $('#edit-t', v); if (e1) e1.onclick = () => techForm(t);
  const eDel = $('#del-t', v); if (eDel) eDel.onclick = async () => { if (await confirmBox(`Supprimer définitivement le technicien ${esc(t.firstName + ' ' + t.lastName)} ? Cette action est irréversible.`, 'Supprimer')) { await api('DELETE', 'technicians/' + t.id); toast('Technicien supprimé'); location.hash = '#/techniciens'; refresh(); } };
  const addHab = $('#add-hab-icon', v); if (addHab) addHab.onclick = () => { const e2 = $('#add-hab', v); if (e2) e2.click(); else formModal({ title: 'Ajouter / renouveler une habilitation', fields: [{ name: 'kind', label: 'Type', type: 'select', options: HAB_KINDS }, { name: 'symbol', label: 'Symbole / catégorie', required: true }, { name: 'issued', label: 'Date de délivrance', type: 'date' }, { name: 'expires', label: 'Fin de validité', type: 'date', required: true }, { name: 'org', label: 'Organisme' }], onSubmit: async (vals) => { await api('POST', `technicians/${t.id}/habilitations`, vals); toast('Habilitation ajoutée'); refresh(); } }); };
  const addAs = $('#add-as-icon', v); if (addAs) addAs.onclick = () => assignForm(t.id);
  const addAbs = $('#add-abs-icon', v); if (addAbs) addAbs.onclick = () => formModal({ title: 'Signaler une absence', fields: [{ name: 'type', label: 'Type', type: 'select', options: [['maladie', 'Maladie'], ['congé', 'Congé'], ['retard', 'Retard'], ['absence', 'Absence']] }, { name: 'start', label: 'Début', type: 'date', required: true }, { name: 'end', label: 'Fin', type: 'date' }, { name: 'motif', label: 'Motif', type: 'textarea' }], onSubmit: async (vals) => { await api('POST', 'absences', { ...vals, techId: t.id }); toast('Absence signalée'); refresh(); } });
  $$('[data-hab]', v).forEach((tr) => (tr.onclick = () => { if (isAdmin()) { const hb = (t.habilitations || []).find(h => h.id === tr.dataset.hab); if (hb) formModal({ title: 'Renouveler / modifier l\'habilitation', fields: [{ name: 'kind', label: 'Type', type: 'select', options: HAB_KINDS, value: hb.kind }, { name: 'symbol', label: 'Symbole', value: hb.symbol, required: true }, { name: 'issued', label: 'Date de délivrance', type: 'date', value: hb.issued }, { name: 'expires', label: 'Fin de validité', type: 'date', value: hb.expires, required: true }, { name: 'org', label: 'Organisme', value: hb.org }], onSubmit: async (vals) => { await api('POST', `technicians/${t.id}/habilitations`, vals); toast('Habilitation mise à jour'); refresh(); } }); } }));
  $$('[data-abs]', v).forEach((el) => (el.onclick = () => { location.hash = '#/absences'; }));
  const e2 = $('#add-hab', v); if (e2) e2.onclick = () => formModal({ title: 'Ajouter / renouveler une habilitation', fields: [
    { name: 'kind', label: 'Type', type: 'select', options: HAB_KINDS }, { name: 'symbol', label: 'Symbole / catégorie (ex. B2V BR, R486 B, Opérateur)', required: true },
    { name: 'issued', label: 'Date de délivrance', type: 'date' }, { name: 'expires', label: 'Fin de validité', type: 'date', required: true }, { name: 'org', label: 'Organisme' },
  ], onSubmit: async (vals) => { await api('POST', `technicians/${t.id}/habilitations`, vals); toast('Habilitation enregistrée'); refresh(); } });
};

// ---------------- Présences et absences ----------------
ROUTES.absences = async (v) => {
  const list = D().absences.slice().sort((a, b) => b.start.localeCompare(a.start));
  const day = todayISO();
  const todayAbs = list.filter((a) => a.start <= day && (a.end || a.start) >= day);
  v.innerHTML = `<div class="head"><h1>Présences et absences</h1><button class="btn primary" id="new-abs">${isTech() ? 'Demander un congé' : '+ Signaler'}</button></div>
  <div class="grid g4" style="margin-bottom:1rem">${kpi(todayAbs.length, 'Absents / retards aujourd\'hui', todayAbs.length ? 'red' : 'ok')}${kpi(list.filter((a) => a.status === 'Signalée' || a.status === 'Demandée').length, 'À valider')}</div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Technicien</th><th>Type</th><th>Dates</th><th>Motif</th><th>Statut</th><th>Signalé par</th><th></th></tr></thead><tbody>
  ${list.map((a) => `<tr><td>${esc(techName(a.techId))}${demoTag(a)}</td><td><span class="pill ${a.type === 'maladie' ? 'red' : ''}">${esc(absLabel(a))}</span></td><td>${fmtD(a.start)}${a.end && a.end !== a.start ? ' → ' + fmtD(a.end) : ''}${a.time ? ' · ' + esc(a.time) : ''}</td><td class="small">${esc(a.motif || '')}</td><td><span class="pill ${a.status === 'Validée' ? 'green' : a.status === 'Refusée' ? 'red' : 'orange'}">${esc(a.status)}</span></td><td class="small">${esc(userName(a.author))}</td><td>${isAdmin() && a.status !== 'Validée' ? `<button class="btn sm" data-val="${a.id}">Valider</button> <button class="btn sm" data-ref="${a.id}">Refuser</button>` : ''}${isAdmin() ? ` <button class="btn sm" data-edit-abs="${a.id}">Corriger</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Aucune absence.</td></tr>'}
  </tbody></table></div>${isChef() ? '<p class="muted small">Pour respecter la vie privée, un arrêt maladie apparaît comme « Absent » : seul l\'administrateur voit le motif.</p>' : ''}</div>`;
  $('#new-abs', v).onclick = () => {
    const techs = isTech() ? [[S.me.technicianId, 'Moi']] : D().technicians.filter((t) => t.active !== false).map((t) => [t.id, t.firstName + ' ' + t.lastName]);
    formModal({ title: isTech() ? 'Demande de congé' : 'Signaler une absence', fields: [
      { name: 'techId', label: 'Technicien', type: 'select', options: techs, required: true },
      { name: 'type', label: 'Type', type: 'select', options: isTech() ? ['congé'] : ABS_TYPES.map((x) => [x, absLabel({ type: x })]) },
      { name: 'start', label: 'Du', type: 'date', required: true, value: todayISO() }, { name: 'end', label: 'Au', type: 'date' },
      { name: 'time', label: 'Heure (pour un retard)', type: 'time' }, { name: 'motif', label: 'Commentaire / motif', type: 'textarea' },
    ], onSubmit: async (vals) => { const r = await api('POST', 'absences', vals, { queueable: true, kind: 'absence', label: 'Absence ' + techName(vals.techId) + ' le ' + fmtD(vals.start) }); toast(r.queued ? 'Hors ligne : signalement enregistré sur l\'appareil.' : 'Signalement enregistré'); if (!r.queued) refresh(); } });
  };
  $$('[data-val]', v).forEach((b) => (b.onclick = async () => { await api('PUT', 'absences/' + b.dataset.val, { status: 'Validée' }); toast('Validée'); refresh(); }));
  $$('[data-ref]', v).forEach((b) => (b.onclick = async () => { await api('PUT', 'absences/' + b.dataset.ref, { status: 'Refusée' }); toast('Refusée'); refresh(); }));
  $$('[data-edit-abs]', v).forEach((b) => (b.onclick = () => { const a = D().absences.find((x) => x.id === b.dataset.editAbs); formModal({ title: 'Corriger l\'absence (correction tracée)', fields: [
    { name: 'type', label: 'Type', type: 'select', options: ABS_TYPES.map((x) => [x, absLabel({ type: x })]), value: a.type }, { name: 'start', label: 'Du', type: 'date', value: a.start }, { name: 'end', label: 'Au', type: 'date', value: a.end }, { name: 'motif', label: 'Motif', type: 'textarea', value: a.motif },
  ], onSubmit: async (vals) => { await api('PUT', 'absences/' + a.id, vals); toast('Absence corrigée'); refresh(); } }); }));
};

// ---------------- Matériel et QR codes ----------------
// Lien permanent imprimé sur les étiquettes : toujours l'adresse définitive du site
const CANONICAL = 'https://mimouni-industriel-electricite.vercel.app';
const equipURL = (id) => CANONICAL + '/e/' + id;
function qrSVG(text, cell = 4) { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: cell, margin: 2, scalable: true }); }
function labelHTML(e) {
  return `<div class="label"><div class="qr">${qrSVG(equipURL(e.id))}</div><div class="txt"><div class="co"><i></i>MIMOUNI INDUSTRIEL ÉLECTRICITÉ</div><div class="nm">${esc(e.name)}</div><div class="cd">${esc(e.id)}</div></div></div>`;
}
ROUTES.materiel = async (v) => {
  const q = (PL.eqQ || '').toLowerCase();
  const list = D().equipment.filter((e) => !q || (e.name + ' ' + e.id + ' ' + e.type + ' ' + e.location).toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
  v.innerHTML = `<div class="head"><h1>Matériel installé <span class="muted small">(${D().equipment.length})</span></h1>${isAdmin() ? '<button class="btn primary" id="new-eq">+ Nouvel équipement</button>' : ''}</div>
  <div class="card"><input class="inp" id="eqq" placeholder="Rechercher (désignation, code, type, emplacement)…" value="${esc(PL.eqQ || '')}">
  <div class="table-wrap"><table><thead><tr><th>Code</th><th>Désignation</th><th>Type</th><th>Chantier / site</th><th>Emplacement</th></tr></thead><tbody>
  ${list.map((e) => `<tr class="click" data-e="${e.id}"><td><b>${esc(e.id)}</b></td><td>${esc(e.name)}${demoTag(e)}</td><td>${esc(e.type)}</td><td>${esc(chantierById(e.chantierId)?.name || '–')}</td><td>${esc(e.location)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Aucun équipement.</td></tr>'}
  </tbody></table></div></div>`;
  $('#eqq', v).oninput = (ev) => { PL.eqQ = ev.target.value; clearTimeout(PL.eqT); PL.eqT = setTimeout(() => render().then(() => { const i = $('#eqq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }), 300); };
  $$('[data-e]', v).forEach((r) => (r.onclick = () => (location.hash = '#/equipement/' + r.dataset.e)));
  const b = $('#new-eq', v); if (b) b.onclick = () => equipForm();
};
function equipForm(e = null) {
  formModal({ title: e ? 'Modifier l\'équipement' : 'Nouvel équipement', intro: e ? '' : '<p class="muted small">Un identifiant permanent et son QR code seront créés automatiquement (jamais réutilisés).</p>', fields: [
    { name: 'name', label: 'Désignation', required: true, value: e?.name, maxlength: 150 },
    { name: 'type', label: 'Type', type: 'select', options: ['Armoire', 'TGBT', 'Tableau divisionnaire', 'Variateur', 'Moteur', 'Disjoncteur', 'Transformateur', 'Automate', 'Éclairage', 'Autre'], value: e?.type },
    { name: 'brand', label: 'Marque', value: e?.brand }, { name: 'model', label: 'Modèle', value: e?.model }, { name: 'serial', label: 'N° de série', value: e?.serial },
    { name: 'chantierId', label: 'Chantier / site', type: 'select', options: [['', '–'], ...D().chantiers.map((c) => [c.id, c.name])], value: e?.chantierId },
    { name: 'location', label: 'Emplacement précis', value: e?.location }, { name: 'commissioned', label: 'Mise en service', type: 'date', value: e?.commissioned },
    { name: 'specs', label: 'Caractéristiques électriques', type: 'textarea', value: e?.specs },
  ], submitLabel: e ? 'Enregistrer' : 'Créer la fiche et le QR code', onSubmit: async (vals) => {
    const r = e ? await api('PUT', 'equipment/' + e.id, vals) : await api('POST', 'equipment', vals);
    toast(e ? 'Équipement modifié' : 'Fiche créée – QR code ' + r.id); await loadData(); location.hash = '#/equipement/' + r.id; render();
  } });
}
function printLabel(e) {
  $('#print-area').innerHTML = labelHTML(e);
  api('POST', `equipment/${e.id}/label`).catch(() => {});
  setTimeout(() => window.print(), 50);
}
ROUTES.equipement = async (v, id) => {
  let e = D().equipment.find((x) => x.id === id);
  if (!e) { try { e = await api('GET', 'equipment/' + id); } catch { /* */ } }
  if (!e) { v.innerHTML = `<div class="card"><p class="err">Équipement « ${esc(id)} » introuvable.</p><a href="#/scanner">Retour au scanner</a></div>`; return; }
  let hist = []; let fromCache = false;
  try { hist = await api('GET', `equipment/${e.id}/history`); await idb.set('hist-' + e.id, hist); }
  catch { hist = (await idb.get('hist-' + e.id)) || []; fromCache = true; }
  const pending = S.queue.filter((q) => q.path === `equipment/${e.id}/history`);
  const corrections = {}; const masks = {};
  hist.forEach((x) => { if (x.type === 'correction') (corrections[x.correctsId] = corrections[x.correctsId] || []).push(x); if (x.type === 'masquage') masks[x.correctsId] = x; });
  const entryHTML = (x) => {
    const corr = corrections[x.id] || []; const mask = masks[x.id];
    const canCorrect = (!isTech() || x.author === S.me.login) && x.type !== 'masquage';
    return `<div class="ev ${x.type} ${corr.length ? 'corrected' : ''}" data-entry="${x.id}">
      <b>${esc({ intervention: 'Intervention', remarque: 'Remarque', photo: 'Photo', correction: 'Correction', masquage: 'Masquage' }[x.type] || x.type)}</b>
      <span class="muted small">· ${esc(x.authorName || x.author)} · ${fmtDT(x.at)}${x.duration ? ' · ' + h(x.duration) : ''}${x.offline ? ' · saisie hors ligne' : ''}</span>
      ${x.type === 'correction' ? `<div class="small">Corrige l'entrée du ${fmtDT((hist.find((o) => o.id === x.correctsId) || {}).at)} – motif : ${esc(x.reason)}</div>` : ''}
      ${x.type === 'masquage' ? `<div class="small">L'administrateur a masqué l'entrée du ${fmtDT((hist.find((o) => o.id === x.correctsId) || {}).at)} – motif : ${esc(x.reason)}</div>` : ''}
      ${mask && !isAdmin() ? '<div class="content muted">Contenu masqué par l\'administrateur (conservé dans l\'historique).</div>' : `<div class="content">${esc(x.content)}</div>`}
      ${corr.length ? `<div class="small" style="color:var(--orange)">Corrigée le ${fmtDT(corr[corr.length - 1].at)} par ${esc(corr[corr.length - 1].authorName)} – l'original reste visible.</div>` : ''}
      ${photosHTML(x.photos)}
      <div class="row" style="margin-top:.3rem">${canCorrect ? `<button class="btn sm" data-correct="${x.id}">Corriger</button>` : ''}${isAdmin() && x.type !== 'masquage' && !mask ? `<button class="btn sm" data-mask="${x.id}">Masquer</button>` : ''}</div></div>`;
  };
  const ordered = hist.slice().reverse();
  v.innerHTML = `<div class="head"><div><a href="#/materiel" class="small">← Matériel</a><h1>${esc(e.name)}${demoTag(e)}</h1><span class="muted">${esc(e.id)}</span></div>${isAdmin() ? '<div class="row"><button class="btn sm" id="edit-eq">Modifier</button><button class="btn sm dark" id="print-eq">Imprimer l\'étiquette</button><button class="btn sm" style="background:#DC2626;color:#fff" id="del-eq">Supprimer</button></div>' : ''}</div>
  <button class="btn primary bigbtn" id="add-int" style="margin-bottom:1rem">+ Ajouter une intervention, une remarque ou des photos</button>
  <div class="grid g2">
    <div class="card"><h2>Fiche</h2><table>
      <tr><th>Type</th><td>${esc(e.type || '–')}</td></tr><tr><th>Marque / modèle</th><td>${esc([e.brand, e.model].filter(Boolean).join(' – ') || '–')}</td></tr>
      <tr><th>N° de série</th><td>${esc(e.serial || '–')}</td></tr><tr><th>Chantier / site</th><td>${chantierById(e.chantierId) ? `<a href="#/chantier/${e.chantierId}">${esc(chantierById(e.chantierId).name)}</a>` : '–'}</td></tr>
      <tr><th>Emplacement</th><td>${esc(e.location || '–')}</td></tr><tr><th>Mise en service</th><td>${fmtD(e.commissioned)}</td></tr><tr><th>Caractéristiques</th><td>${esc(e.specs || '–')}</td></tr></table></div>
    ${isAdmin() ? `<div class="card"><h2>QR code permanent et étiquette (50 × 30 mm)</h2><p class="small muted">Lien permanent : ${esc(equipURL(e.id))}<br>Étiquettes imprimées : ${e.labelPrints || 0}. Une réimpression garde toujours le même QR code.</p><div class="label-preview" id="label-prev">${labelHTML(e)}</div></div>` : ''}
  </div>
  <div class="card"><h2>Historique des interventions</h2><p class="muted small">Historique en ajout seul : rien ne peut être supprimé. Une correction s'ajoute à la suite et l'original reste visible.${fromCache ? ' <b>Copie locale (hors ligne).</b>' : ''}</p>
    <div class="timeline">${pending.map((q) => `<div class="ev pending"><b>En attente d'envoi</b> <span class="muted small">· saisi le ${fmtDT(q.at)}</span><div>${esc(q.body.content)}</div>${q.photos ? `<span class="small">${q.photos} photo(s)</span>` : ''}</div>`).join('')}${ordered.map(entryHTML).join('') || (pending.length ? '' : '<p class="muted">Aucune intervention.</p>')}</div></div>`;
  bindPhotos(v);
  const on = (s, f) => { const el = $(s, v); if (el) el.onclick = f; };
  on('#edit-eq', () => equipForm(e));
  on('#del-eq', async () => { if (await confirmBox(`Supprimer définitivement l\'équipement « ${esc(e.name)} » ? Cette action est irréversible.`, 'Supprimer')) { await api('DELETE', 'equipment/' + e.id); toast('Équipement supprimé'); location.hash = '#/materiel'; refresh(); } });
  on('#print-eq', () => printLabel(e));
  on('#add-int', () => formModal({ title: 'Nouvelle saisie – ' + e.name, fields: [
    { name: 'type', label: 'Type', type: 'select', options: [['intervention', 'Intervention'], ['remarque', 'Remarque'], ['photo', 'Photos']] },
    { name: 'content', label: 'Description', type: 'textarea', placeholder: 'Ce qui a été fait, constaté, mesuré…' },
    { name: 'duration', label: 'Durée (heures)', type: 'number', step: '0.25', min: '0', max: '10000' },
    { name: 'photos', label: 'Photos (compressées automatiquement)', type: 'photos', capture: true },
  ], onSubmit: async (vals) => {
    if (!vals.content && !vals.photos.length) throw new Error('Ajoutez une description ou une photo.');
    const body = { ...vals, clientAt: new Date().toISOString(), clientId: uid() };
    const r = await api('POST', `equipment/${e.id}/history`, body, { queueable: true, kind: 'intervention', label: 'Intervention sur ' + e.name });
    toast(r.queued ? 'Hors ligne : enregistré sur l\'appareil (envoi au retour du réseau).' : 'Intervention enregistrée'); render();
  } }));
  $$('[data-correct]', v).forEach((b) => (b.onclick = () => { const o = hist.find((x) => x.id === b.dataset.correct); formModal({ title: 'Corriger une entrée', intro: `<div class="notice small">Original (${fmtDT(o.at)}) : ${esc(o.content)}</div><p class="muted small">L'original n'est pas effacé : la correction est ajoutée et liée à l'entrée d'origine.</p>`, fields: [
    { name: 'content', label: 'Information corrigée', type: 'textarea', required: true }, { name: 'reason', label: 'Motif de la correction', required: true },
  ], onSubmit: async (vals) => { const r = await api('POST', `equipment/${e.id}/history`, { ...vals, type: 'correction', correctsId: o.id, clientId: uid() }, { queueable: true, kind: 'correction', label: 'Correction sur ' + e.name }); toast(r.queued ? 'Hors ligne : correction en attente.' : 'Correction ajoutée'); render(); } }); }));
  $$('[data-mask]', v).forEach((b) => (b.onclick = () => formModal({ title: 'Masquer une entrée', intro: '<p class="muted small">L\'entrée n\'est jamais effacée : elle est masquée pour les chefs et techniciens, avec un motif tracé.</p>', fields: [{ name: 'reason', label: 'Motif', required: true }], onSubmit: async (vals) => { await api('POST', `equipment/${e.id}/history`, { type: 'masquage', correctsId: b.dataset.mask, reason: vals.reason }); toast('Entrée masquée (tracé)'); render(); } })));
};

// ---------------- Scanner ----------------
let camStream = null, scanTimer = null;
function stopCamera() { if (scanTimer) cancelAnimationFrame(scanTimer); scanTimer = null; if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; } }
function handleCode(raw) {
  const txt = String(raw || '').trim();
  const m = txt.match(/\/e\/([A-Za-z0-9-]+)/) || txt.match(/^(EQ-[A-Za-z0-9]+)$/i);
  if (!m) { toast('QR code non reconnu : ce n\'est pas une étiquette MIMOUNI INDUSTRIEL ÉLECTRICITÉ.'); return false; }
  stopCamera(); if (navigator.vibrate) navigator.vibrate(80);
  location.hash = '#/equipement/' + m[1].toUpperCase();
  return true;
}
function decodeCanvas(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const r = window.jsQR ? jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' }) : null;
  return r ? r.data : null;
}
ROUTES.scanner = async (v) => {
  v.innerHTML = `<div class="head"><h1>Scanner</h1></div>
  <div class="scanbox" id="scanbox"><video id="cam" playsinline muted></video><div class="frame"></div><div class="msg" id="scan-msg">Visez l'étiquette QR de l'équipement</div></div>
  <div style="max-width:520px;margin:1rem auto">
    <button class="btn primary bigbtn" id="start-cam">${ICON.scan} Ouvrir la caméra</button>
    <label class="btn bigbtn" style="margin-top:.6rem">Lire le QR code depuis une photo<input type="file" id="qr-file" accept="image/*" capture="environment" hidden></label>
    <form id="manual" class="row" style="margin-top:.8rem"><input class="inp" name="code" placeholder="Ou saisir le code (ex. EQ-AB12CD)" style="flex:1;margin:0" autocapitalize="characters"><button class="btn dark">Ouvrir</button></form>
    <p class="muted small">La fiche s'ouvre selon vos droits. Sans réseau, la copie locale de l'appareil est utilisée.</p>
  </div>`;
  const video = $('#cam', v);
  const startCam = async () => {
    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.srcObject = camStream; await video.play();
      $('#start-cam', v).classList.add('hidden');
      const detector = 'BarcodeDetector' in window ? new BarcodeDetector({ formats: ['qr_code'] }) : null;
      const canvas = document.createElement('canvas');
      const loop = async () => {
        if (!camStream) return;
        if (video.readyState >= 2) {
          try {
            if (detector) { const codes = await detector.detect(video); if (codes.length && handleCode(codes[0].rawValue)) return; }
            else { canvas.width = video.videoWidth / 2; canvas.height = video.videoHeight / 2; canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height); const c = decodeCanvas(canvas); if (c && handleCode(c)) return; }
          } catch { /* image suivante */ }
        }
        scanTimer = requestAnimationFrame(loop);
      };
      loop();
    } catch (err) { $('#scan-msg', v).textContent = 'Caméra indisponible : autorisez l\'accès ou utilisez la photo / le code.'; }
  };
  $('#start-cam', v).onclick = startCam;
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && navigator.permissions) {
    navigator.permissions.query({ name: 'camera' }).then((p) => { if (p.state === 'granted') startCam(); }).catch(() => {});
  }
  $('#qr-file', v).onchange = async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    const url = URL.createObjectURL(f); const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); const s = Math.min(1, 1200 / Math.max(img.width, img.height)); c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); const code = decodeCanvas(c); if (!code || !handleCode(code)) { if (!code) toast('Aucun QR code lisible sur la photo.'); } };
    img.src = url;
  };
  $('#manual', v).onsubmit = (ev) => { ev.preventDefault(); const c = ev.target.code.value.trim().toUpperCase(); if (c) handleCode(c.startsWith('EQ-') ? c : 'EQ-' + c); };
};

// ---------------- Rapports PDF et exports ----------------
function loadScript(src) { return new Promise((res, rej) => { if ($(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Chargement impossible : ' + src)); document.head.appendChild(s); }); }
function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(async () => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
const slug = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);

async function chantierPDF(c) {
  await loadScript('/vendor/jspdf.umd.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 15; let y = 0;
  const company = D().company || {};
  const header = () => {
    doc.setFillColor(17, 17, 17); doc.rect(0, 0, W, 24, 'F');
    doc.setFillColor(200, 16, 46); doc.rect(0, 24, W, 2, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
    doc.text('MIMOUNI INDUSTRIEL ÉLECTRICITÉ', M, 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('Électricité industrielle – Rapport de chantier', M, 18.5);
    doc.text('Édité le ' + new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), W - M, 18.5, { align: 'right' });
    doc.setTextColor(17, 17, 17); y = 34;
  };
  const need = (hh) => { if (y + hh > 280) { doc.addPage(); header(); } };
  const section = (t) => { need(14); doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(200, 16, 46); doc.text(t.toUpperCase(), M, y); doc.setDrawColor(200, 16, 46); doc.line(M, y + 1.5, W - M, y + 1.5); doc.setTextColor(17, 17, 17); y += 8; };
  const kv = (k, val) => { need(7); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(k, M, y); doc.setFont('helvetica', 'normal'); const lines = doc.splitTextToSize(String(val || '–'), W - M - 60); doc.text(lines, M + 48, y); y += Math.max(6, lines.length * 4.6); };
  const table = (cols, rows) => {
    const widths = cols.map((c) => c.w); const draw = (cells, bold, fill) => {
      const lines = cells.map((cell, i) => doc.splitTextToSize(String(cell ?? ''), widths[i] - 2));
      const hh = Math.max(...lines.map((l) => l.length)) * 4.2 + 2.5; need(hh);
      if (fill) { doc.setFillColor(242, 242, 242); doc.rect(M, y - 4, W - 2 * M, hh, 'F'); }
      doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(8.8);
      let x = M; lines.forEach((l, i) => { doc.text(l, x + 1, y); x += widths[i]; }); y += hh;
      doc.setDrawColor(225, 226, 228); doc.line(M, y - 4, W - M, y - 4);
    };
    draw(cols.map((c) => c.t), true, true); rows.forEach((r) => draw(r, false, false)); y += 3;
  };
  header();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(doc.splitTextToSize(c.name, W - 2 * M), M, y); y += 9;
  const p = progressOf(c.id); const est = estimateOf(c);
  section('Informations du chantier');
  kv('Client', c.client); kv('Adresse', c.address); kv('Responsable', userName(c.chefId)); kv('Statut', c.status);
  kv('Début', fmtD(c.start)); kv('Fin prévue', fmtD(c.endPlanned));
  kv('Équipe', (c.team || []).map(techName).join(', '));
  section('Avancement et heures');
  kv('Avancement', String(p.pct).replace('.', ',') + ' % (heures prévues des tâches terminées ÷ heures prévues totales)');
  kv('Heures prévues', h(p.total)); kv('Heures réalisées', h(p.real)); kv('Écart (tâches terminées)', (p.gap > 0 ? '+' : '') + h(p.gap));
  kv('Fin estimée (estimation)', est.reliable ? fmtD(est.date) + (est.delta ? ` (${est.delta > 0 ? '+' : ''}${est.delta} jours ouvrés par rapport à la fin prévue)` : '') : est.reason);
  section('Tâches');
  table([{ t: 'Tâche', w: 66 }, { t: 'Statut', w: 24 }, { t: 'Prévu', w: 18 }, { t: 'Réalisé', w: 18 }, { t: 'Échéance', w: 22 }, { t: 'Affecté à', w: 32 }],
    D().tasks.filter((t) => t.chantierId === c.id).map((t) => [t.title + (t.status === 'Bloquée' ? ' (bloquée : ' + t.blockReason + ')' : ''), t.status, h(t.plannedHours), h(realH(t)), fmtD(t.end), techName(t.assignee)]));
  const equip = D().equipment.filter((e) => e.chantierId === c.id);
  section('Équipements installés');
  if (equip.length) table([{ t: 'Code', w: 28 }, { t: 'Désignation', w: 70 }, { t: 'Type', w: 30 }, { t: 'Emplacement', w: 52 }], equip.map((e) => [e.id, e.name, e.type, e.location]));
  else kv('', 'Aucun équipement enregistré.');
  const interv = [];
  for (const e of equip) { try { (await api('GET', `equipment/${e.id}/history`)).forEach((x) => interv.push({ ...x, eq: e.name })); } catch { /* hors ligne */ } }
  section('Interventions sur le matériel');
  // Les entrées masquées par l'administrateur (et les lignes de masquage) ne sortent pas dans le rapport remis au client
  const masked = new Set(interv.filter((x) => x.type === 'masquage').map((x) => x.correctsId));
  const shown = interv.filter((x) => x.type !== 'masquage' && !masked.has(x.id));
  const TYPE_FR = { intervention: 'Intervention', remarque: 'Remarque', photo: 'Photo', correction: 'Correction' };
  if (shown.length) table([{ t: 'Date', w: 28 }, { t: 'Équipement', w: 36 }, { t: 'Type', w: 22 }, { t: 'Détail', w: 62 }, { t: 'Auteur', w: 32 }], shown.sort((a, b) => a.at.localeCompare(b.at)).map((x) => [fmtDT(x.at), x.eq, TYPE_FR[x.type] || x.type, x.content + (x.reason ? ' (motif : ' + x.reason + ')' : ''), x.authorName || x.author]));
  else kv('', 'Aucune intervention enregistrée.');
  // Photos du chantier (notes du chantier + interventions affichées) en vignettes
  const pics = [];
  try { (await api('GET', `chantiers/${c.id}/notes`)).forEach((n) => (n.photos || []).forEach((id) => pics.push({ id, at: n.at, cap: n.title || n.content || 'Photo du chantier' }))); } catch { /* hors ligne */ }
  shown.forEach((x) => (x.photos || []).forEach((id) => pics.push({ id, at: x.at, cap: x.eq + (x.content ? ' – ' + x.content : '') })));
  pics.sort((a, b) => a.at.localeCompare(b.at));
  if (pics.length) {
    section('Photos du chantier');
    const TW = 42, TH = 32, GAP = 3.3, PER = 4; let col = 0;
    for (const ph of pics.slice(0, 24)) {
      let data = photoCache[ph.id];
      if (!data) { try { data = (await api('GET', 'photos/' + ph.id)).dataUrl; photoCache[ph.id] = data; } catch { continue; } }
      const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = data; });
      if (!img) continue;
      if (col === 0) need(TH + 12);
      const x0 = M + col * (TW + GAP);
      const r = Math.min(TW / img.width, TH / img.height); const w = img.width * r, hh = img.height * r;
      doc.setDrawColor(225, 226, 228); doc.rect(x0, y, TW, TH);
      try { doc.addImage(data, /png/i.test(data.slice(0, 30)) ? 'PNG' : 'JPEG', x0 + (TW - w) / 2, y + (TH - hh) / 2, w, hh); } catch { /* image illisible */ }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(90, 90, 90);
      doc.text(doc.splitTextToSize(fmtDT(ph.at) + ' · ' + ph.cap, TW).slice(0, 2), x0, y + TH + 3); doc.setTextColor(17, 17, 17);
      col++; if (col === PER) { col = 0; y += TH + 10; }
    }
    if (col) y += TH + 10;
    if (pics.length > 24) kv('', (pics.length - 24) + ' autre(s) photo(s) dans le logiciel.');
  }
  need(30); y += 4; doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text('Visa du responsable', M, y); doc.text('Visa du client', W / 2 + 5, y); doc.setDrawColor(138, 141, 145); doc.rect(M, y + 2, W / 2 - M - 5, 20); doc.rect(W / 2 + 5, y + 2, W / 2 - M - 5, 20);
  const pages = doc.getNumberOfPages();
  const contact = [company.address, company.zipCity, company.phone, company.email, company.siret ? 'SIRET ' + company.siret : ''].filter(Boolean).join(' · ');
  for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(138, 141, 145); doc.text('MIMOUNI INDUSTRIEL ÉLECTRICITÉ' + (contact ? ' – ' + contact : ''), M, 290); doc.text(`Page ${i} / ${pages}`, W - M, 290, { align: 'right' }); }
  const name = `Rapport-${slug(c.name)}-${todayISO()}.pdf`;
  download(name, doc.output('blob'));
  toast('Rapport PDF généré : ' + name);
}

const csvD = (s) => (s ? fmtD(s) : '');
function csv(rows) { return '\ufeff' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n'); }
ROUTES.rapports = async (v) => {
  if (isTech()) { v.innerHTML = '<div class="card"><p>Les rapports sont réservés aux chefs de chantier et à l\'administrateur.</p></div>'; return; }
  v.innerHTML = `<div class="head"><h1>Rapports et exports</h1></div>
  <div class="grid g2">
  <div class="card"><h2>Rapport PDF de chantier</h2><label class="f">Chantier<select id="rp-ch">${D().chantiers.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label><button class="btn primary" id="rp-go" ${D().chantiers.length ? '' : 'disabled'}>Générer le PDF</button>
    <p class="muted small">En-tête MIMOUNI INDUSTRIEL ÉLECTRICITÉ, infos et dates du chantier, avancement, heures, tâches, matériel, interventions, zone de visa.</p></div>
  <div class="card"><h2>Exports tableur (CSV)</h2><div class="row"><button class="btn" id="x-tasks">Tâches et heures</button><button class="btn" id="x-abs">Absences</button><button class="btn" id="x-ts">Feuilles d'heures</button>${isAdmin() ? '<button class="btn" id="x-habs">Habilitations</button>' : ''}</div><p class="muted small">${isChef() ? 'Limité à vos chantiers et à votre équipe.' : 'Ouvrable dans Excel.'}</p></div>
  ${isAdmin() ? `<div class="card"><h2>Export complet (ZIP)</h2><p class="small">Toutes les données (JSON) et toutes les photos, dans un fichier ZIP daté.</p><button class="btn dark" id="x-all">Exporter tout (ZIP)</button><p class="muted small" id="x-all-msg"></p></div>` : ''}
  </div>`;
  $('#rp-go', v).onclick = async () => { const c = chantierById($('#rp-ch', v).value); if (c) { try { await chantierPDF(c); } catch (e) { toast(e.message); } } };
  $('#x-tasks', v).onclick = () => download(`taches-${todayISO()}.csv`, new Blob([csv([['Chantier', 'Tâche', 'Statut', 'Heures prévues', 'Heures réalisées', 'Échéance', 'Affecté à'], ...D().tasks.map((t) => [chantierById(t.chantierId)?.name, t.title, t.status, String(t.plannedHours).replace('.', ','), String(realH(t)).replace('.', ','), csvD(t.end), techName(t.assignee)])])], { type: 'text/csv' }));
  $('#x-abs', v).onclick = () => download(`absences-${todayISO()}.csv`, new Blob([csv([['Technicien', 'Type', 'Du', 'Au', 'Statut', 'Motif'], ...D().absences.map((a) => [techName(a.techId), absLabel(a), csvD(a.start), csvD(a.end), a.status, a.motif])])], { type: 'text/csv' }));
  const xh = $('#x-habs', v); if (xh) xh.onclick = () => download(`habilitations-${todayISO()}.csv`, new Blob([csv([['Technicien', 'Type', 'Symbole', 'Délivrée', 'Fin de validité', 'État'], ...D().technicians.flatMap((t) => currentHabs(t).map((hb) => [t.firstName + ' ' + t.lastName, hb.kind, hb.symbol, csvD(hb.issued), csvD(hb.expires), habStatus(hb).label]))])], { type: 'text/csv' }));
  $('#x-ts', v).onclick = () => download(`feuilles-heures-${todayISO()}.csv`, new Blob([csv([['Date', 'Technicien', 'Chantier', 'Tâche', 'Heures', 'Détail', 'Statut', 'Décidé par', 'Motif du refus'], ...(D().timesheets || []).slice().sort((a, b) => a.date.localeCompare(b.date)).flatMap((f) => (f.lines || []).map((l) => [csvD(f.date), techName(f.techId), chantierById(l.chantierId)?.name || 'Autre chantier', (D().tasks.find((t) => t.id === l.taskId) || {}).title || '', String(l.hours).replace('.', ','), l.note, f.status === 'Envoyée' ? 'À valider' : f.status, userName(f.decidedBy), f.refuseReason]))])], { type: 'text/csv' }));
  const xa = $('#x-all', v); if (xa) xa.onclick = () => exportAll($('#x-all-msg', v));
};
async function exportAll(msgEl) {
  msgEl.textContent = 'Préparation de l\'export…';
  await loadScript('/vendor/jszip.min.js');
  const r = await api('GET', 'export');
  const zip = new JSZip();
  zip.file('donnees.json', JSON.stringify(r, null, 2));
  zip.file('LISEZMOI.txt', `Export complet – MIMOUNI INDUSTRIEL ÉLECTRICITÉ\nDate : ${fmtDT(r.exportedAt)}\nContenu : donnees.json (toutes les fiches et l'historique) et le dossier photos/.\nLes mots de passe ne sont jamais exportés.\n`);
  let n = 0;
  for (const id of r.data.photoIds || []) {
    try { const p = await api('GET', 'photos/' + id); zip.file(`photos/${id}.jpg`, p.dataUrl.split(',')[1], { base64: true }); n++; msgEl.textContent = `Photos : ${n}/${r.data.photoIds.length}`; } catch { /* */ }
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  download(`export-mimouni-${todayISO()}.zip`, blob);
  msgEl.textContent = `Export terminé : ${Object.values(r.data).filter(Array.isArray).reduce((s, a) => s + a.length, 0)} éléments, ${n} photo(s).`;
}

// ---------------- Alertes ----------------
ROUTES.alertes = async (v) => {
  const habs = habAlerts(); const late = D().chantiers.filter(isLate); const blocked = D().tasks.filter((t) => t.status === 'Bloquée'); const conf = allConflicts();
  const sec = (t, items) => `<div class="card"><h2>${esc(t)} <span class="pill ${items.length ? 'red' : 'green'}">${items.length}</span></h2>${items.join('') || '<p class="muted">Rien à signaler.</p>'}</div>`;
  v.innerHTML = `<div class="head"><h1>Alertes</h1></div><div class="grid g2">
  ${sec('Habilitations à renouveler', habs.map(({ t, hb, st }) => `<div class="list"><div class="item"><span>Habilitation <b>${esc(hb.symbol || hb.kind)}</b> de <a href="#/technicien/${t.id}">${esc(t.firstName + ' ' + t.lastName)}</a> – ${st.level === 3 ? 'expirée depuis le' : 'expire le'} ${fmtD(hb.expires)}</span><span class="pill ${st.cls}">${esc(st.label)}</span></div></div>`))}
  ${sec('Chantiers en retard', late.map((c) => `<div class="list"><div class="item"><a href="#/chantier/${c.id}">${esc(c.name)}</a><span class="small">fin prévue ${fmtD(c.endPlanned)}</span></div></div>`))}
  ${sec('Tâches bloquées', blocked.map((t) => `<div class="list"><div class="item"><a href="#/chantier/${t.chantierId}">${esc(t.title)}</a><span class="small">${esc(t.blockReason)}</span></div></div>`))}
  ${sec('Conflits de planning', conf.map(({ a, c }) => `<div class="list"><div class="item"><span>${esc(techName(a.techId))} – ${fmtD(a.date)}</span><span class="small">${esc(c.join(', '))}</span></div></div>`))}
  ${sec('Saisies non synchronisées (cet appareil)', S.queue.map((q) => `<div class="list"><div class="item"><span>${esc(q.label)}</span><span class="small">${fmtDT(q.at)}</span></div></div>`))}
  </div>`;
};

// ---------------- Journal (admin) ----------------
ROUTES.journal = async (v) => {
  if (!isAdmin()) { v.innerHTML = '<div class="card">Réservé à l\'administrateur.</div>'; return; }
  const j = await api('GET', 'journal');
  v.innerHTML = `<div class="head"><h1>Journal d'activité</h1><span class="muted small">Ajout seul – 300 dernières actions</span></div><div class="card"><div class="table-wrap"><table><thead><tr><th>Date</th><th>Qui</th><th>Action</th><th>Élément</th><th>Détail</th></tr></thead><tbody>${j.map((x) => `<tr><td class="small">${fmtDT(x.at)}</td><td>${esc(x.who)}</td><td>${esc(x.action)}</td><td class="small">${esc(x.entity)} ${esc(x.id)}</td><td class="small">${esc(x.detail)}</td></tr>`).join('')}</tbody></table></div></div>`;
};

// ---------------- Réglages (admin) ----------------
const COMPANY_FIELDS = [['legalForm', 'Forme juridique'], ['address', 'Adresse du siège'], ['zipCity', 'Code postal / Ville'], ['phone', 'Téléphone standard'], ['emergencyPhone', 'Téléphone urgences / astreinte'], ['email', 'Email général'], ['website', 'Site internet'], ['siret', 'SIRET'], ['vat', 'N° TVA intracommunautaire'], ['ape', 'Code APE / NAF'], ['insurance', 'Assurance décennale / RC (assureur, n° de police)'], ['certifications', 'Qualifications / certifications'], ['director', 'Dirigeant'], ['hours', 'Horaires d\'ouverture']];
ROUTES.reglages = async (v) => {
  if (!isAdmin()) { v.innerHTML = '<div class="card">Réservé à l\'administrateur.</div>'; return; }
  const co = D().company || {};
  let backups = []; try { backups = await api('GET', 'backups'); } catch { /* */ }
  const users = D().users || [];
  v.innerHTML = `<div class="head"><h1>Réglages</h1></div>
  <div class="grid g2">
  <div class="card"><h2>Fiche contact de l'entreprise</h2>
    <table><tr><th>Raison sociale</th><td><b>MIMOUNI INDUSTRIEL ÉLECTRICITÉ</b><br><span class="muted small">Électricité industrielle</span></td></tr>
    ${COMPANY_FIELDS.map(([k, l]) => `<tr><th>${esc(l)}</th><td>${co[k] ? esc(co[k]) : '<span class="muted">[À COMPLÉTER]</span>'}</td></tr>`).join('')}</table>
    <button class="btn" id="edit-co" style="margin-top:.6rem">Compléter / modifier</button><p class="muted small">Ces informations apparaissent en pied de page des rapports PDF.</p></div>
  <div class="card"><div class="head"><h2>Utilisateurs et rôles</h2><button class="btn primary sm" id="new-u">+ Compte</button></div>
    <div class="table-wrap"><table><thead><tr><th>Identifiant</th><th>Nom</th><th>Rôle</th><th>Fiche</th><th></th></tr></thead><tbody>
    ${users.map((u) => `<tr><td><b>${esc(u.login)}</b></td><td>${esc(u.name)}</td><td>${esc(ROLE_LABEL[u.role])}${u.active ? '' : ' <span class="pill">Désactivé</span>'}</td><td class="small">${esc(u.technicianId ? techName(u.technicianId) : '–')}</td><td>${u.login !== 'admin' ? `<button class="btn sm" data-u="${esc(u.login)}">Gérer</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div></div>
  <div class="card"><h2>Sauvegardes</h2><p class="small">Sauvegarde automatique chaque jour (30 conservées) + sauvegarde manuelle à tout moment. Une restauration fait d'abord une sauvegarde de sécurité et n'efface rien.</p>
    <button class="btn dark" id="bk-now">Sauvegarder maintenant</button> <a class="btn" href="#/rapports">Export complet (ZIP)</a>
    <div class="list" style="margin-top:.6rem">${backups.slice(0, 12).map((b) => `<div class="item"><span class="small">${esc(b)}</span><button class="btn sm" data-restore="${esc(b)}">Restaurer</button></div>`).join('') || '<p class="muted small">Aucune sauvegarde pour l\'instant (la première automatique aura lieu cette nuit).</p>'}</div></div>
  <div class="card"><h2>Données d'exemple</h2><p class="small">Pour essayer le logiciel : 40 techniciens uniquement (4 chefs de chantier, 6 chefs d'équipe, 30 électriciens), tâches, planning, absences et équipements, tous marqués « Exemple ».</p>
    <div class="row"><button class="btn" id="demo-load">Charger des données d'exemple</button><button class="btn" id="demo-clear">Effacer les données d'exemple</button></div></div>
  </div>`;
  $('#edit-co', v).onclick = () => formModal({ title: 'Fiche contact – MIMOUNI INDUSTRIEL ÉLECTRICITÉ', fields: COMPANY_FIELDS.map(([k, l]) => ({ name: k, label: l, value: co[k] || '', placeholder: '[À COMPLÉTER]' })), onSubmit: async (vals) => { await api('PUT', 'settings/company', vals); toast('Fiche entreprise enregistrée'); refresh(); } });
  $('#new-u', v).onclick = () => formModal({ title: 'Nouveau compte', fields: [
    { name: 'login', label: 'Identifiant (ex. prenom.nom)', required: true, autocomplete: 'off' }, { name: 'name', label: 'Nom affiché', required: true },
    { name: 'role', label: 'Rôle', type: 'select', options: [['technicien', 'Technicien'], ['chef', 'Chef de chantier']] },
    { name: 'technicianId', label: 'Fiche technicien liée', type: 'select', options: [['', '– Aucune –'], ...D().technicians.map((t) => [t.id, t.firstName + ' ' + t.lastName])] },
    { name: 'password', label: 'Mot de passe provisoire (10 caractères min.)', type: 'text', required: true, autocomplete: 'off', value: genPassword() },
  ], intro: '<p class="muted small">Notez le mot de passe provisoire et transmettez-le à la personne : elle pourra le changer dans « Mon profil ».</p>', submitLabel: 'Créer le compte', onSubmit: async (vals) => { await api('POST', 'users', vals); toast('Compte créé'); refresh(); } });
  $$('[data-u]', v).forEach((b) => (b.onclick = () => { const u = users.find((x) => x.login === b.dataset.u); formModal({ title: 'Compte ' + u.login, fields: [
    { name: 'name', label: 'Nom affiché', value: u.name }, { name: 'role', label: 'Rôle', type: 'select', options: [['technicien', 'Technicien'], ['chef', 'Chef de chantier']], value: u.role },
    { name: 'technicianId', label: 'Fiche technicien liée', type: 'select', options: [['', '– Aucune –'], ...D().technicians.map((t) => [t.id, t.firstName + ' ' + t.lastName])], value: u.technicianId },
    { name: 'active', label: 'Accès', type: 'select', options: [['1', 'Actif'], ['0', 'Désactivé (départ)']], value: u.active ? '1' : '0' },
    { name: 'password', label: 'Nouveau mot de passe (laisser vide pour ne pas changer)', autocomplete: 'off' },
  ], onSubmit: async (vals) => { const body = { name: vals.name, role: vals.role, technicianId: vals.technicianId, active: vals.active === '1' }; if (vals.password) body.password = vals.password; await api('PUT', 'users/' + u.login, body); toast('Compte mis à jour'); refresh(); } }); }));
  $('#bk-now', v).onclick = async () => { const r = await api('POST', 'backups'); toast('Sauvegarde créée : ' + r.name); render(); };
  $$('[data-restore]', v).forEach((b) => (b.onclick = () => formModal({ title: 'Restaurer une sauvegarde', submitLabel: 'Restaurer maintenant',
    intro: `<div class="notice"><b>Attention :</b> le logiciel va revenir <b>exactement</b> à l'état de la sauvegarde « ${esc(b.dataset.restore)} ». Tout ce qui a été créé ou modifié depuis (chantiers, tâches, heures, absences, matériel, historique, comptes) sera <b>retiré</b>. Une sauvegarde de sécurité de l'état actuel est faite juste avant. Le compte administrateur actuel est conservé.</div>`,
    fields: [{ name: 'confirm', label: 'Pour confirmer, tapez RESTAURER en majuscules', required: true, autocomplete: 'off' }],
    onSubmit: async (vals) => { if (vals.confirm !== 'RESTAURER') throw new Error('Tapez exactement RESTAURER (en majuscules) pour confirmer.'); const r = await api('POST', `backups/${encodeURIComponent(b.dataset.restore)}/restore`, { confirm: vals.confirm }); toast(`Restauration faite : ${r.restored} fiches remises, ${r.removed} retirées. Sécurité : ${r.safety}`, 8000); refresh(); } })));
  $('#demo-load', v).onclick = async () => { if (!(await confirmBox('Charger des données d\'exemple (techniciens, chantiers, tâches… marqués « Exemple ») dans le logiciel ? Elles s\'ajoutent à vos vraies données, jusqu\'à ce que vous les effaciez.', 'Charger les exemples'))) return; await api('POST', 'demo'); toast('Données d\'exemple chargées'); refresh(); };
  $('#demo-clear', v).onclick = async () => { if (await confirmBox('Effacer toutes les données marquées « Exemple » ? Vos vraies données ne sont pas touchées.', 'Effacer')) { const r = await api('DELETE', 'demo'); toast(r.removed + ' éléments d\'exemple effacés'); refresh(); } };
};
function genPassword() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; const b = new Uint32Array(12); crypto.getRandomValues(b); return [...b].map((x) => a[x % a.length]).join(''); }

// ---------------- Profil et menu Plus ----------------
// ---------------- pointage des heures (feuilles d'heures) ----------------
// Le technicien remplit une feuille par jour (lignes chantier / tâche / heures) et l'envoie.
// Le chef de son périmètre la valide ou la refuse avec un motif ; l'administrateur peut tout faire.
// Les heures validées s'ajoutent aux heures réalisées des tâches (calcul fait par le serveur).
function canDecideLocal(f) {
  if (isAdmin()) return true;
  if (!isChef()) return false;
  if (f.techId && f.techId === S.me.technicianId) return false;
  return (f.lines || []).length > 0 && f.lines.every((l) => (chantierById(l.chantierId) || {}).chefId === S.me.login);
}
const tsPill = (st) => `<span class="pill ${st === 'Validée' ? 'green' : st === 'Refusée' ? 'red' : 'orange'}">${esc(st === 'Envoyée' ? 'À valider' : st)}</span>`;
const dayLabel = (d) => { const x = parseD(d).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }); return x.charAt(0).toUpperCase() + x.slice(1); };
function alertBox(msg, title = 'Information') {
  return new Promise((res) => modal(`<h2>${esc(title)}</h2><p>${esc(msg)}</p><div class="actions"><button class="btn primary" data-a="ok">J'ai compris</button></div>`, (root, close) => { root.querySelector('[data-a=ok]').onclick = () => { close(); res(); }; }));
}
function sheetLinesHTML(f) {
  return `<div class="ts-lines">${(f.lines || []).map((l) => { const c = chantierById(l.chantierId); const t = D().tasks.find((x) => x.id === l.taskId); return `<div class="ts-line"><span>${esc(c ? c.name : 'Autre chantier')}${t ? ' – ' + esc(t.title) : ''}${l.note ? `<br><span class="muted small">${esc(l.note)}</span>` : ''}</span><b>${h(l.hours)}</b></div>`; }).join('')}</div>`;
}
function sheetCard(f, { decide = false } = {}) {
  const who = isTech() ? '' : `<b>${esc(techName(f.techId))}</b> · `;
  return `<div class="card ts-card" data-sheet="${esc(f.id)}">
    <div class="ts-head"><span>${who}${esc(dayLabel(f.date))}</span>${tsPill(f.status)}</div>
    ${sheetLinesHTML(f)}
    <div class="ts-total"><span>Total de la journée</span><b>${h(f.total)}</b></div>
    ${f.comment ? `<p class="small">💬 ${esc(f.comment)}</p>` : ''}
    ${(f.warnings || []).map((w) => `<p class="small" style="color:var(--orange)">⚠ ${esc(w)}</p>`).join('')}
    ${f.status === 'Refusée' ? `<p class="err small">Refusée par ${esc(userName(f.decidedBy))} : ${esc(f.refuseReason)}</p>` : ''}
    ${f.status === 'Validée' ? `<p class="muted small">Validée par ${esc(userName(f.decidedBy))} le ${fmtDT(f.decidedAt)}</p>` : ''}
    ${f.offline ? '<p class="muted small">Saisie hors ligne</p>' : ''}
    <div class="row">${decide && canDecideLocal(f) && (f.status === 'Envoyée' || isAdmin()) ? `${f.status !== 'Validée' ? `<button class="btn primary" data-ts-ok="${esc(f.id)}">Valider</button>` : ''}${f.status !== 'Refusée' ? `<button class="btn" data-ts-no="${esc(f.id)}">Refuser</button>` : ''}` : ''}
    ${(f.techId === S.me.technicianId && f.status !== 'Validée') || isAdmin() ? `<button class="btn sm" data-ts-edit="${esc(f.id)}">${f.status === 'Refusée' ? 'Corriger et renvoyer' : 'Modifier'}</button>` : ''}</div>
  </div>`;
}

function sheetForm(prefill = null, opts = {}) {
  const me = S.me;
  const chantiers = D().chantiers.filter((c) => c.status !== 'Clôturé');
  const techs = D().technicians.filter((t) => t.active !== false);
  const pre = prefill || {};
  const techField = isAdmin()
    ? `<label class="f">Technicien<select name="techId" required>${techs.map((t) => `<option value="${esc(t.id)}" ${t.id === pre.techId ? 'selected' : ''}>${esc(t.firstName + ' ' + t.lastName)}</option>`).join('')}</select></label>`
    : '';
  const day = pre.date || todayISO();
  const chOpts = (sel) => `<option value="">– Chantier –</option>` + chantiers.map((c) => `<option value="${esc(c.id)}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  const taskOpts = (cid, sel) => `<option value="">– Sans tâche précise –</option>` + D().tasks.filter((t) => t.chantierId === cid && t.status !== 'Annulée').map((t) => `<option value="${esc(t.id)}" ${t.id === sel ? 'selected' : ''}>${esc(t.title)}</option>`).join('');
  const lineHTML = (l = {}) => `<div class="ts-row"><select name="ch" aria-label="Chantier">${chOpts(l.chantierId)}</select><select name="task" aria-label="Tâche">${taskOpts(l.chantierId, l.taskId)}</select>
    <div class="ts-row2"><input name="hours" type="number" min="0.25" max="24" step="0.25" inputmode="decimal" placeholder="Heures" value="${l.hours ?? ''}" aria-label="Heures"><input name="note" placeholder="Détail (facultatif)" maxlength="300" value="${esc(l.note || '')}" aria-label="Détail"><button type="button" class="btn sm" data-del title="Retirer la ligne">✕</button></div></div>`;
  let lines = pre.lines && pre.lines.length ? pre.lines : null;
  if (!lines) {
    const tid = isAdmin() ? pre.techId : me.technicianId;
    const planned = D().assignments.filter((a) => a.techId === tid && a.date === day && chantierById(a.chantierId));
    lines = planned.length ? planned.map((a) => ({ chantierId: a.chantierId, hours: a.slot === 'journée' ? 7 : 3.5 })) : [{}];
  }
  modal(`<h2>${pre.date ? 'Feuille d\'heures du ' + fmtD(pre.date) : 'Feuille d\'heures du jour'}</h2>
    <form class="ts-form">${techField}
      <label class="f">Jour travaillé<input type="date" name="date" required max="${todayISO()}" value="${esc(day)}"></label>
      <b class="small">Heures par chantier et par tâche</b>
      <div id="ts-rows">${lines.map(lineHTML).join('')}</div>
      <button type="button" class="btn sm" id="ts-add">+ Ajouter une ligne</button>
      <p class="ts-total"><span>Total</span><b id="ts-sum">0 h</b></p>
      <label class="f">Commentaire pour le chef (facultatif)<textarea name="comment" maxlength="500">${esc(pre.comment || '')}</textarea></label>
      <p class="err" data-err></p>
      <div class="actions"><button type="button" class="btn" data-a="c">Annuler</button><button class="btn primary" type="submit">Envoyer au chef</button></div>
    </form>`, (root, close) => {
    const form = root.querySelector('form'); const rows = root.querySelector('#ts-rows');
    const sum = () => { const t = $$('input[name=hours]', rows).reduce((s, i) => s + (Number(i.value) || 0), 0); root.querySelector('#ts-sum').textContent = h(t); root.querySelector('#ts-sum').style.color = t > 24 ? 'var(--rouge)' : ''; };
    const bind = (row) => {
      row.querySelector('[name=ch]').onchange = (e) => { row.querySelector('[name=task]').innerHTML = taskOpts(e.target.value, ''); };
      row.querySelector('[name=hours]').oninput = sum;
      row.querySelector('[data-del]').onclick = () => { if ($$('.ts-row', rows).length > 1) { row.remove(); sum(); } else toast('Il faut au moins une ligne.'); };
    };
    $$('.ts-row', rows).forEach(bind); sum();
    form.addEventListener('input', () => { root.querySelector('[data-err]').textContent = ''; });
    root.querySelector('#ts-add').onclick = () => { rows.insertAdjacentHTML('beforeend', lineHTML({})); bind(rows.lastElementChild); };
    root.querySelector('[data-a=c]').onclick = close;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const err = root.querySelector('[data-err]'); err.textContent = '';
      const body = { date: form.elements.date.value, comment: form.elements.comment.value.trim(), lines: $$('.ts-row', rows).map((r) => ({ chantierId: r.querySelector('[name=ch]').value, taskId: r.querySelector('[name=task]').value, hours: Number(r.querySelector('[name=hours]').value), note: r.querySelector('[name=note]').value.trim() })) };
      if (isAdmin()) body.techId = form.elements.techId.value;
      // contrôles immédiats (le serveur revérifie tout)
      if (!body.date) { err.textContent = 'Indiquez le jour.'; return; }
      if (body.date > todayISO()) { err.textContent = 'On ne peut pas pointer un jour qui n\'est pas encore passé.'; return; }
      const bad = body.lines.findIndex((l) => !l.chantierId || !(l.hours > 0) || l.hours > 24);
      if (bad >= 0) { err.textContent = 'Ligne ' + (bad + 1) + ' : choisissez un chantier et des heures entre 0,25 et 24.'; return; }
      const total = body.lines.reduce((s, l) => s + l.hours, 0);
      if (total > 24) { err.textContent = 'Total de la journée : ' + h(total) + '. 24 h maximum.'; return; }
      if (opts.clientId) body.clientId = opts.clientId;
      const btn = form.querySelector('[type=submit]'); btn.disabled = true;
      try {
        const r = await api('POST', 'timesheets', body, { queueable: true, kind: 'pointage', label: 'Feuille d\'heures du ' + fmtD(body.date) + ' (' + h(total) + ')' });
        close();
        if (opts.onDone) await opts.onDone(r);
        if (r.queued) toast('Hors ligne : feuille enregistrée sur l\'appareil. Elle partira au retour du réseau, après votre confirmation.', 6000);
        else { toast('Feuille d\'heures envoyée au chef ✔'); await refresh(); }
      } catch (ex) { err.textContent = ex.message; btn.disabled = false; }
    };
  });
}

ROUTES.pointage = async (v) => {
  const all = (D().timesheets || []).slice().sort((a, b) => b.date.localeCompare(a.date) || techName(a.techId).localeCompare(techName(b.techId)));
  const pendingQ = S.queue.filter((q) => q.kind === 'pointage');
  const weekStart = addDays(todayISO(), -((parseD(todayISO()).getDay() + 6) % 7));
  if (isTech()) {
    const mine = all.filter((f) => f.techId === S.me.technicianId);
    const wk = mine.filter((f) => f.date >= weekStart);
    const sumOf = (l) => h(l.reduce((s, f) => s + (f.total || 0), 0));
    v.innerHTML = `<div class="head"><h1>Mes heures</h1><button class="btn primary" id="ts-new">+ Feuille du jour</button></div>
      <div class="grid g2" style="margin-bottom:1rem">${kpi(sumOf(wk.filter((f) => f.status === 'Validée')), 'Validées cette semaine', 'ok')}${kpi(sumOf(wk.filter((f) => f.status === 'Envoyée')), 'En attente du chef')}</div>
      ${pendingQ.length ? `<div class="notice" style="margin-bottom:1rem">${pendingQ.length} feuille${pendingQ.length > 1 ? 's' : ''} enregistrée${pendingQ.length > 1 ? 's' : ''} sur l'appareil, en attente d'envoi : ${pendingQ.map((q) => esc(q.label)).join(', ')}</div>` : ''}
      ${!S.me.technicianId ? '<div class="notice">Votre compte n\'est pas relié à une fiche technicien : prévenez l\'administrateur.</div>' : ''}
      ${mine.map((f) => sheetCard(f)).join('') || '<div class="card"><p class="muted">Aucune feuille pour l\'instant. Touchez « + Feuille du jour » à la fin de votre journée.</p></div>'}`;
  } else {
    const tab = PL.tsTab || 'todo';
    const lists = { todo: all.filter((f) => f.status === 'Envoyée'), ok: all.filter((f) => f.status === 'Validée'), no: all.filter((f) => f.status === 'Refusée'), all };
    const decidable = lists.todo.filter(canDecideLocal);
    v.innerHTML = `<div class="head"><h1>Pointage des heures</h1>${isAdmin() ? '<button class="btn primary" id="ts-new">+ Saisir pour un technicien</button>' : (S.me.technicianId ? '<button class="btn primary" id="ts-new">+ Ma feuille</button>' : '')}</div>
      <div class="row" style="margin-bottom:.8rem">${[['todo', 'À valider'], ['ok', 'Validées'], ['no', 'Refusées'], ['all', 'Toutes']].map(([k, l]) => `<button class="btn sm ${tab === k ? 'dark' : ''}" data-tab="${k}">${l} (${lists[k].length})</button>`).join('')}</div>
      ${tab === 'todo' && decidable.length > 1 ? `<button class="btn primary" id="ts-all" style="margin-bottom:.8rem">Valider les ${decidable.length} feuilles affichées</button>` : ''}
      ${isChef() ? '<p class="muted small">Vous validez les feuilles dont toutes les heures sont sur vos chantiers. Les autres sont validées par l\'administrateur.</p>' : ''}
      ${lists[tab].map((f) => sheetCard(f, { decide: true })).join('') || '<div class="card"><p class="muted">Aucune feuille ici.</p></div>'}`;
    $$('[data-tab]', v).forEach((b) => (b.onclick = () => { PL.tsTab = b.dataset.tab; render(); }));
    const allBtn = $('#ts-all', v);
    if (allBtn) allBtn.onclick = async () => { if (!(await confirmBox(`Valider ${decidable.length} feuilles d'heures (${h(decidable.reduce((s, f) => s + f.total, 0))}) ?`, 'Tout valider'))) return; let n = 0; for (const f of decidable) { try { await api('POST', `timesheets/${encodeURIComponent(f.id)}/decision`, { decision: 'Validée' }); n++; } catch (e) { toast(e.message); } } toast(n + ' feuille(s) validée(s)'); refresh(); };
  }
  const nb = $('#ts-new', v); if (nb) nb.onclick = () => sheetForm(isAdmin() ? { techId: '' } : null);
  $$('[data-ts-ok]', v).forEach((b) => (b.onclick = async () => { try { await api('POST', `timesheets/${encodeURIComponent(b.dataset.tsOk)}/decision`, { decision: 'Validée' }); toast('Feuille validée ✔ – heures ajoutées aux heures réalisées'); refresh(); } catch (e) { alertBox(e.message, 'Validation impossible'); } }));
  $$('[data-ts-no]', v).forEach((b) => (b.onclick = () => formModal({ title: 'Refuser la feuille d\'heures', intro: '<p class="muted small">Le technicien verra le motif et pourra corriger puis renvoyer sa feuille.</p>', submitLabel: 'Refuser', fields: [{ name: 'reason', label: 'Motif du refus', type: 'textarea', required: true, placeholder: 'ex. 2 h de trop sur la tâche X, il manque le chantier de l\'après-midi…' }], onSubmit: async (vals) => { await api('POST', `timesheets/${encodeURIComponent(b.dataset.tsNo)}/decision`, { decision: 'Refusée', reason: vals.reason }); toast('Feuille refusée – le technicien est prévenu dans son application'); refresh(); } })));
  $$('[data-ts-edit]', v).forEach((b) => (b.onclick = () => { const f = all.find((x) => x.id === b.dataset.tsEdit); if (f) sheetForm({ techId: f.techId, date: f.date, lines: f.lines, comment: f.comment }); }));
};

// ---------------- envois refusés au retour du réseau : jamais perdus ----------------
async function rejectedLoad() { S.rejected = (await idb.get('rejected').catch(() => null)) || []; paintStatus();
  initAI(); }
async function rejectedSave() { await idb.set('rejected', S.rejected); paintStatus();
  initAI(); }
async function rejectedRemove(qid) { S.rejected = S.rejected.filter((x) => x.qid !== qid); await rejectedSave(); }
ROUTES.envois = async (v) => {
  const list = S.rejected || [];
  v.innerHTML = `<div class="head"><h1>Envois refusés</h1></div>
    <div class="notice" style="margin-bottom:1rem">Ces saisies faites hors ligne ont été refusées par le serveur au moment de l'envoi. Elles sont gardées sur cet appareil : corrigez-les, renvoyez-les ou abandonnez-les.</div>
    ${list.map((x) => `<div class="card"><b>${esc(x.label)}</b><p class="muted small">Saisi le ${fmtDT(x.at)} · refusé le ${fmtDT(x.rejectedAt)}</p><p class="err small">Motif : ${esc(x.error)}</p>
      <div class="row"><button class="btn primary sm" data-rj-fix="${esc(x.qid)}">Corriger</button><button class="btn sm" data-rj-send="${esc(x.qid)}">Renvoyer tel quel</button><button class="btn sm" data-rj-drop="${esc(x.qid)}">Abandonner</button></div></div>`).join('') || '<div class="card"><p class="muted">Aucun envoi refusé.</p></div>'}`;
  const find = (qid) => (S.rejected || []).find((x) => x.qid === qid);
  const resend = async (x, body) => {
    try { await api(x.method, x.path, body); await rejectedRemove(x.qid); toast('Envoyé ✔'); await refresh(); }
    catch (e) { x.error = e.message; x.body = body; x.rejectedAt = new Date().toISOString(); await rejectedSave(); throw e; }
  };
  $$('[data-rj-send]', v).forEach((b) => (b.onclick = async () => { const x = find(b.dataset.rjSend); try { await resend(x, x.body); } catch (e) { alertBox(e.message, 'Toujours refusé'); render(); } }));
  $$('[data-rj-drop]', v).forEach((b) => (b.onclick = async () => { if (await confirmBox('Abandonner définitivement cette saisie ? Elle sera supprimée de l\'appareil.', 'Abandonner')) { await rejectedRemove(b.dataset.rjDrop); render(); } }));
  $$('[data-rj-fix]', v).forEach((b) => (b.onclick = () => {
    const x = find(b.dataset.rjFix);
    if (x.kind === 'pointage') return sheetForm(x.body, { clientId: x.body.clientId, onDone: async () => { await rejectedRemove(x.qid); render(); } });
    const skip = ['clientId', 'offline', 'photos', 'baseUpdatedAt', 'clientAt', 'lines', 'correctsId'];
    const keys = Object.keys(x.body || {}).filter((k) => !skip.includes(k) && ['string', 'number'].includes(typeof x.body[k]));
    formModal({ title: 'Corriger : ' + x.label, intro: `<p class="err small">Motif du refus : ${esc(x.error)}</p>`, submitLabel: 'Renvoyer', fields: keys.map((k) => ({ name: k, label: k, value: x.body[k], type: typeof x.body[k] === 'number' ? 'number' : 'text' })),
      onSubmit: async (vals) => { const body = { ...x.body }; keys.forEach((k) => { body[k] = typeof x.body[k] === 'number' ? Number(vals[k]) : vals[k]; }); await resend(x, body); render(); } });
  }));
};

ROUTES.profil = async (v) => {
  v.innerHTML = `<div class="head"><h1>Mon profil</h1></div><div class="card"><table><tr><th>Nom</th><td>${esc(S.me.name)}</td></tr><tr><th>Identifiant</th><td>${esc(S.me.login)}</td></tr><tr><th>Rôle</th><td>${esc(ROLE_LABEL[S.me.role])}</td></tr><tr><th>Version</th><td>${APP_VERSION}</td></tr></table>
  <div class="row" style="margin-top:.8rem"><button class="btn" id="pw">Changer mon mot de passe</button><button class="btn" id="out">Se déconnecter</button></div></div>`;
  $('#pw', v).onclick = () => formModal({ title: 'Changer mon mot de passe', fields: [{ name: 'current', label: 'Mot de passe actuel', type: 'password', required: true, autocomplete: 'current-password' }, { name: 'next', label: 'Nouveau mot de passe (10 caractères min.)', type: 'password', required: true, autocomplete: 'new-password' }], onSubmit: async (vals) => { const r = await api('POST', 'me/password', vals); S.token = r.token; localStorage.setItem('mimouni_token', r.token); toast('Mot de passe changé'); } });
  $('#out', v).onclick = () => logout();
};
ROUTES.plus = async (v) => {
  v.innerHTML = `<div class="head"><h1>Plus</h1><span class="muted small">${esc(S.me.name)} · ${esc(ROLE_LABEL[S.me.role])}</span></div><div class="tiles">${navItems().filter(([href]) => !['#/', '#/chantiers', '#/planning', '#/scanner'].includes(href)).map(([href, ic, lab]) => `<a href="${href}">${ICON[ic]}${esc(lab)}</a>`).join('')}</div>`;
};


function initAI() {
  if (document.getElementById('ai-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'ai-btn';
  btn.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h8M8 14h5"/></svg>`;
  btn.title = 'Assistant Grok';
  btn.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;width:56px;height:56px;border-radius:50%;background:#2563EB;color:#fff;border:none;font-size:1.6rem;box-shadow:0 4px 16px rgba(37,99,235,0.35);z-index:90;cursor:pointer;';
  document.body.appendChild(btn);
  btn.onclick = openAI;
  loadAIHistory();
}
let aiHistory = [];
function loadAIHistory() {
  try { aiHistory = JSON.parse(localStorage.getItem('mimouni_ai') || '[]'); } catch { aiHistory = []; }
}
function saveAIHistory() { localStorage.setItem('mimouni_ai', JSON.stringify(aiHistory.slice(-40))); }
function openAI() {
  if (document.querySelector('.ai-panel')) return;
  const panel = document.createElement('div');
  panel.className = 'ai-panel';
  panel.style.cssText = 'position:fixed;bottom:5.5rem;right:1rem;width:min(360px,calc(100vw - 1.5rem));height:min(520px,75vh);background:#FFFFFF;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.12);z-index:91;display:flex;flex-direction:column;overflow:hidden;border:1px solid #E5E7EB;';
  panel.innerHTML = `
    <div style="background:#17365D;color:#fff;padding:0.65rem 1rem;display:flex;justify-content:space-between;align-items:center"><span style="font-weight:600;font-size:0.95rem">Assistant MIMOUNI</span><button id="ai-close" style="background:none;border:none;color:#CBD5E1;font-size:1.3rem;cursor:pointer;line-height:1">×</button></div>
    <div id="ai-msgs" style="flex:1;overflow-y:auto;padding:0.75rem;background:#F9FAFB"></div>
    <div style="padding:0.5rem;border-top:1px solid #E5E7EB;display:flex;gap:0.35rem;align-items:center;background:#fff">
      <button id="ai-mic" title="Parler" style="background:#F3F4F6;border:none;border-radius:8px;width:34px;height:34px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg></button>
      <input type="file" id="ai-photo" accept="image/*" capture="environment" style="display:none">
      <button id="ai-cam" title="Photo" style="background:#F3F4F6;border:none;border-radius:8px;width:34px;height:34px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></button>
      <input id="ai-input" placeholder="Écrivez votre message…" style="flex:1;padding:0.45rem 0.6rem;border:1px solid #D1D5DB;border-radius:8px;font-size:16px;min-width:0;outline:none">
      <button id="ai-send" style="background:#2563EB;color:#fff;border:none;border-radius:8px;padding:0.45rem 0.7rem;font-size:0.82rem;font-weight:500;cursor:pointer;flex-shrink:0">Envoyer</button>
    </div>`;
  document.body.appendChild(panel);
  document.getElementById('ai-close').onclick = () => panel.remove();
  const send = (text) => {
    const q = (text || document.getElementById('ai-input').value).trim(); if (!q) return;
    document.getElementById('ai-input').value = '';
    addMsg(q, true);
    aiHistory.push({ role: 'user', text: q });
    setTimeout(async () => {
      const reply = await aiReply(q);
      const actionMatch = reply.match(/ACTION:\s*(\{.*\})/s);
      let display = reply.replace(/ACTION:\s*\{.*\}/s, '').trim();
      addMsg(display || reply, false);
      if (actionMatch) {
        try {
          const action = JSON.parse(actionMatch[1]);
          const ok = confirm(`Confirmer l'action : ${JSON.stringify(action)} ?`);
          if (ok) {
            let result = 'Action non reconnue';
            if (action.type === 'create_tech') {
              const r = await api('POST', 'technicians', { firstName: action.firstName, lastName: action.lastName, position: action.position || 'Technicien', active: true });
              result = 'Technicien créé : ' + r.id;
            } else if (action.type === 'delete_tech') {
              await api('DELETE', 'technicians/' + action.id);
              result = 'Technicien supprimé';
            } else if (action.type === 'create_chantier') {
              const r = await api('POST', 'chantiers', { name: action.name, client: action.client || '', status: 'En préparation' });
              result = 'Chantier créé : ' + r.id;
            } else if (action.type === 'delete_chantier') {
              await api('DELETE', 'chantiers/' + action.id);
              result = 'Chantier supprimé';
            }
            addMsg('✅ ' + result, false);
            await loadData(); render();
          } else {
            addMsg('Action annulée.', false);
          }
        } catch (e) { addMsg('Erreur action : ' + e.message, false); }
      }
      aiHistory.push({ role: 'assistant', text: display || reply });
      saveAIHistory();
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(display || reply);
        u.lang = 'fr-FR';
        speechSynthesis.speak(u);
      }
    }, 300);
  };
  document.getElementById('ai-send').onclick = () => send();
  document.getElementById('ai-input').onkeydown = (e) => { if (e.key === 'Enter') send(); };
  document.getElementById('ai-mic').onclick = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { alert('Reconnaissance vocale non supportée sur ce navigateur.'); return; }
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Rec();
    rec.lang = 'fr-FR';
    rec.onresult = (e) => send(e.results[0][0].transcript);
    rec.start();
  };
  document.getElementById('ai-cam').onclick = () => document.getElementById('ai-photo').click();
  document.getElementById('ai-photo').onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    addMsg('📷 Photo envoyée', true);
    setTimeout(() => addMsg('J’ai bien reçu la photo. Pour l’instant je peux analyser les données textuelles de l’application. Dites-moi ce que vous voulez que je fasse avec cette image.', false), 400);
  };
  aiHistory.forEach(m => addMsg(m.text, m.role === 'user'));
  if (!aiHistory.length) addMsg('Comment puis-je vous aider aujourd’hui ?', false);
}
function addMsg(text, me) {
  const box = document.getElementById('ai-msgs');
  if (!box) return;
  const div = document.createElement('div');
  div.style.cssText = `margin:0.25rem 0;padding:0.45rem 0.65rem;border-radius:12px;max-width:82%;white-space:pre-wrap;font-size:0.87rem;line-height:1.35;${me ? 'background:#2563EB;color:#fff;margin-left:auto' : 'background:#fff;color:#1F2937;border:1px solid #E5E7EB'}`;
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}
async function aiReply(q) {
  const d = D();
  const context = `Données actuelles : ${d.technicians.length} techniciens, ${d.chantiers.length} chantiers (${d.chantiers.filter(c => c.status === 'En cours').length} en cours), ${d.absences.length} absences.
Techniciens : ${d.technicians.slice(0, 10).map(t => t.id + ':' + t.firstName + ' ' + t.lastName).join(', ')}
Chantiers : ${d.chantiers.slice(0, 8).map(c => c.id + ':' + c.name).join(', ')}`;
  try {
    const r = await fetch('/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [
        { role: 'system', content: `Tu es l'assistant MIMOUNI INDUSTRIEL ÉLECTRICITÉ. Tu peux lire et proposer des modifications.
Pour proposer une action, termine ta réponse par une ligne exacte :
ACTION: {type, ...params}
Types possibles :
- {type:"create_tech", firstName, lastName, position}
- {type:"delete_tech", id}
- {type:"create_chantier", name, client}
- {type:"delete_chantier", id}
Sinon, réponds normalement en français.
${context}` },
        { role: 'user', content: q }
      ] })
    });
    if (r.ok) {
      const data = await r.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content.trim();
      return 'Réponse reçue mais vide. Détail : ' + JSON.stringify(data).slice(0, 200);
    } else {
      return 'Erreur API (' + r.status + ')';
    }
  } catch (e) {}
  const low = q.toLowerCase();
  if (low.includes('technicien') || low.includes('employé')) return `Vous avez ${d.technicians.length} techniciens.`;
  if (low.includes('chantier')) return `Il y a ${d.chantiers.length} chantier(s).`;
  return 'Je peux vous aider sur les techniciens, chantiers et absences.';
}
