// Couche de données MIMOUNI INDUSTRIEL ÉLECTRICITÉ.
// Toute la lecture/écriture passe par ce fichier : pour passer plus tard à
// Supabase (PostgreSQL), il suffit de réécrire ces fonctions sans toucher au reste.
//
// Stockage V1 : Netlify Blobs, une clé par enregistrement (« <collection>/<id> »)
// et une clé par entrée d'historique (« hist/<équipement>/<horodatage>-<id> »).
// Aucun gros fichier JSON partagé n'est jamais réécrit.

import { getStore } from '@netlify/blobs';

const STORE = 'mimouni';

// Ne JAMAIS garder le store en mémoire entre deux requêtes : le jeton d'accès
// Netlify Blobs fourni à chaque requête expire. Un store mémorisé dans une
// fonction restée « chaude » provoquait « Token expired » puis « Erreur serveur »
// sur toutes les requêtes (connexion comprise) au bout de quelques dizaines de minutes.
function store() {
  return getStore({ name: STORE, consistency: 'strong' });
}

export const COLLECTIONS = [
  'users', 'technicians', 'chantiers', 'tasks', 'assignments',
  'absences', 'equipment', 'settings',
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
  const key = `hist/${safe(equipId)}/${stamp(entry.at)}-${safe(entry.id)}`;
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
export async function journal(entry) {
  const at = new Date().toISOString();
  const id = Math.random().toString(36).slice(2, 10);
  await store().setJSON(`journal/${stamp(at)}-${id}`, { ...entry, at }, { onlyIfNew: true });
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
