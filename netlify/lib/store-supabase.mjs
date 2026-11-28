// Adaptateur Supabase (PostgreSQL via l'API REST PostgREST) avec exactement la
// même interface que le store Netlify Blobs / Vercel Blob utilisé par db.mjs :
// get / set / setJSON / delete / list.
//
// Une seule table « kv » : une ligne par clé (« <collection>/<id> », « hist/… »,
// « photos/… », « journal/… », « backups/… »). Aucun gros document partagé n'est
// réécrit : les mêmes garanties que le stockage objet.
//
// Choisi automatiquement quand SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY existent.
// La table doit être créée avec docs/supabase/schema.sql (RLS activée, aucune
// politique : seule la clé service_role — donc le serveur — peut y accéder).

const PAGE = 1000;

function conf() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase : SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant');
  return { url: `${url}/rest/v1/kv`, key };
}

function headers(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

const enc = (s) => encodeURIComponent(String(s));
// Échappe les jokers PostgREST pour qu'un préfixe soit littéral.
const likePrefix = (p) => String(p).replace(/([%_\\])/g, '\\$1') + '%';

async function readOne(key, row) {
  if (!row) return null;
  if (row.doc !== null && row.doc !== undefined) return row.doc;
  return row.txt === null || row.txt === undefined ? null : row.txt;
}

export function supabaseStore() {
  return {
    async get(key, { type } = {}) {
      const c = conf();
      const r = await fetch(`${c.url}?select=doc,txt&key=eq.${enc(key)}&limit=1`, { headers: headers(c.key) });
      if (!r.ok) throw new Error(`Supabase get ${r.status} : ${await r.text()}`);
      const rows = await r.json();
      const val = await readOne(key, rows[0]);
      if (val === null) return null;
      if (type === 'json') return typeof val === 'string' ? JSON.parse(val) : val;
      return typeof val === 'string' ? val : JSON.stringify(val);
    },

    async setJSON(key, value, o = {}) {
      return write(key, { doc: value, txt: null }, o.onlyIfNew);
    },

    async set(key, value, o = {}) {
      return write(key, { doc: null, txt: String(value) }, o.onlyIfNew);
    },

    async delete(key) {
      const c = conf();
      const r = await fetch(`${c.url}?key=eq.${enc(key)}`, { method: 'DELETE', headers: headers(c.key) });
      if (!r.ok) throw new Error(`Supabase delete ${r.status} : ${await r.text()}`);
    },

    async *list({ prefix } = {}) {
      const c = conf();
      let offset = 0;
      for (;;) {
        const q = [`select=key`, `order=key.asc`, `limit=${PAGE}`, `offset=${offset}`];
        if (prefix) q.push(`key=like.${encodeURIComponent(likePrefix(prefix))}`);
        const r = await fetch(`${c.url}?${q.join('&')}`, { headers: headers(c.key) });
        if (!r.ok) throw new Error(`Supabase list ${r.status} : ${await r.text()}`);
        const rows = await r.json();
        if (rows.length) yield { blobs: rows.map((b) => ({ key: b.key })) };
        if (rows.length < PAGE) break;
        offset += PAGE;
      }
    },
  };
}

async function write(key, body, onlyIfNew) {
  const c = conf();
  if (onlyIfNew) {
    // Ajout seul : une clé existante n'est jamais réécrite.
    const r = await fetch(`${c.url}?select=key&key=eq.${enc(key)}&limit=1`, { headers: headers(c.key) });
    if (!r.ok) throw new Error(`Supabase head ${r.status} : ${await r.text()}`);
    if ((await r.json()).length) return { modified: false };
  }
  const r = await fetch(c.url, {
    method: 'POST',
    headers: headers(c.key, { Prefer: onlyIfNew ? 'resolution=ignore-duplicates,return=minimal' : 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify([{ key, ...body }]),
  });
  if (!r.ok) throw new Error(`Supabase write ${r.status} : ${await r.text()}`);
  return { modified: true };
}
