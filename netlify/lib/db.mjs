// Couche de données MIMOUNI INDUSTRIEL ÉLECTRICITÉ.
// Toute la lecture/écriture passe par ce fichier : pour passer plus tard à
// Supabase (PostgreSQL), il suffit de réécrire ces fonctions sans toucher au reste.
//
// Stockage V1 : Netlify Blobs, une clé par enregistrement (« <collection>/<id> »)
// et une clé par entrée d'historique (« hist/<équipement>/<horodatage>-<id> »).
// Aucun gros fichier JSON partagé n'est jamais réécrit.

import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { vercelStore } from './store-vercel.mjs';
import { supabaseStore } from './store-supabase.mjs';

const STORE = 'mimouni';

// Ne JAMAIS garder le store en mémoire entre deux requêtes : le jeton d'accès
// Netlify Blobs fourni à chaque requête expire. Un store mémorisé dans une
// fonction restée « chaude » provoquait « Token expired » puis « Erreur serveur »
// sur toutes les requêtes (connexion comprise) au bout de quelques dizaines de minutes.
// Hébergeur choisi selon l'environnement, par ordre de priorité :
//  1. Supabase (PostgreSQL) si SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY existent ;
//  2. Vercel Blob si BLOB_READ_WRITE_TOKEN existe ;
//  3. Netlify Blobs sinon (le code Netlify reste inchangé).
// Les trois adaptateurs exposent la même interface : rien d'autre à modifier.
function store() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return supabaseStore();
  if (process.env.BLOB_READ_WRITE_TOKEN) return vercelStore();
  return getStore({ name: STORE, consistency: 'strong' });
}

export const COLLECTIONS = [
  'users', 'technicians', 'chantiers', 'tasks', 'assignments',
  'absences', 'equipment', 'settings', 'timesheets', 'sites', 'vehicles',
  'documents', 'docflows', 'maintenances', 'reports', 'movements',
  'fuel', 'vehservice', 'baremes', 'trips', 'stock',
  'caces', 'dict', 'consignation', 'dosimetrie', 'soustraitants', 'recompenses', 'evolution', 'signatures', 'couts', 'assistant',
  'rgpd', 'rgpdreq', 'shares', 'mails',
];

const safe = (s) => String(s).replace(/[^A-Za-z0-9_.-]/g, '');

export async function get(coll, id) {
  return (await store().get(`${coll}/${safe(id)}`, { type: 'json' })) || null;
}

export async function put(coll, id, value) {
  await store().setJSON(`${coll}/${safe(id)}`, value);
  return value;
}

export async function remove(coll, id) {
  // Utilisé uniquement pour les données d'exemple et les sessions de test.
  await store().delete(`${coll}/${safe(id)}`);
}

export async function keysOf(prefix) { return listKeys(prefix); }
export const histKey = (entry) => `hist/${safe(entry.equipId)}/${stamp(entry.at)}-${safe(entry.id)}`;

async function listKeys(prefix) {
  const keys = [];
  for await (const page of store().list({ prefix, paginate: true })) {
    for (const b of page.blobs) keys.push(b.key);
  }
  return keys;
}

async function getMany(keys) {
  const out = [];
  const s = store();
  const CHUNK = 40;
  for (let i = 0; i < keys.length; i += CHUNK) {
    const part = await Promise.all(keys.slice(i, i + CHUNK).map((k) => s.get(k, { type: 'json' })));
    out.push(...part.filter(Boolean));
  }
  return out;
}

export async function list(coll) {
  return getMany(await listKeys(`${coll}/`));
}

// ---------- Historique des équipements : ajout seul ----------
const stamp = (iso) => iso.replace(/[-:.TZ]/g, '');

export async function appendHistory(equipId, entry) {
  const key = histKey({ ...entry, equipId });
  // onlyIfNew : une entrée existante ne peut jamais être réécrite.
  await store().setJSON(key, entry, { onlyIfNew: true });
  return entry;
}

export async function listHistory(equipId) {
  const items = await getMany(await listKeys(`hist/${safe(equipId)}/`));
  return items.sort((a, b) => a.at.localeCompare(b.at));
}

export async function recentHistory(limit = 15, equipFilter = null) {
  let keys = await listKeys('hist/');
  if (equipFilter) keys = keys.filter((k) => equipFilter.has(k.split('/')[1]));
  keys.sort((a, b) => b.split('/')[2].localeCompare(a.split('/')[2]));
  return getMany(keys.slice(0, limit));
}

export async function allHistoryKeys() { return listKeys('hist/'); }
export async function deleteKey(key) { await store().delete(key); }
export async function getKey(key) { return store().get(key, { type: 'json' }); }
export async function putKey(key, value) { await store().setJSON(key, value); }

// ---------- Photos (une clé par photo) ----------
export async function putPhoto(id, dataUrl) {
  await store().set(`photos/${safe(id)}`, dataUrl, { onlyIfNew: true });
}
export async function getPhoto(id) {
  return store().get(`photos/${safe(id)}`, { type: 'text' });
}
export async function listPhotoKeys() { return listKeys('photos/'); }

// ---------- Journal d'activité : ajout seul ----------
// Le journal est chaîné : chaque entrée porte l'empreinte de son contenu et la
// clé de l'entrée précédente. Toute modification ou suppression casse la chaîne,
// ce qui rend la traçabilité vérifiable (route « preuves »).
export async function journal(entry) {
  const at = new Date().toISOString();
  const id = Math.random().toString(36).slice(2, 10);
  const key = `journal/${stamp(at)}-${id}`;
  const prev = await lastJournalKey();
  const body = { ...entry, at, prev };
  body.hash = journalHash(body);
  await store().setJSON(key, body, { onlyIfNew: true });
  jrnlLast = key; jrnlAt = Date.now();
}

// Dernière clé connue : évite de lister tout le journal à chaque écriture.
// Le cache est court (2 min) pour rester juste entre deux instances.
let jrnlLast = '', jrnlAt = 0;
async function lastJournalKey() {
  if (jrnlLast && Date.now() - jrnlAt < 120000) return jrnlLast;
  try {
    const keys = (await listKeys('journal/')).sort();
    jrnlLast = keys.length ? keys[keys.length - 1] : '';
    jrnlAt = Date.now();
    return jrnlLast;
  } catch { return ''; }
}

export function journalHash(body) {
  const { hash, ...rest } = body;
  return createHash('sha256').update(JSON.stringify(rest)).digest('hex');
}
export async function listJournalWithKeys(limit = 500) {
  const keys = (await listKeys('journal/')).sort().reverse().slice(0, limit);
  const entries = await getMany(keys);
  return keys.map((k, i) => ({ key: k, entry: entries[i] })).filter((x) => x.entry);
}
export async function listJournal(limit = 200) {
  const keys = (await listKeys('journal/')).sort().reverse().slice(0, limit);
  return getMany(keys);
}

// ---------- Sauvegardes ----------
export async function putBackup(name, data) {
  await store().setJSON(`backups/${safe(name)}`, data);
}
export async function listBackups() {
  return (await listKeys('backups/')).map((k) => k.slice(8)).sort().reverse();
}
export async function getBackup(name) {
  return store().get(`backups/${safe(name)}`, { type: 'json' });
}

// Instantané complet (hors photos, référencées par identifiant)
export async function snapshot() {
  const data = {};
  for (const c of COLLECTIONS) data[c] = await list(c);
  const hkeys = await listKeys('hist/');
  data.history = await getMany(hkeys);
  data.photoIds = (await listKeys('photos/')).map((k) => k.slice(7));
  return data;
}
