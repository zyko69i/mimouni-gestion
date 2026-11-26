// Adaptateur Vercel Blob (magasin privé) avec la même interface que le store
// Netlify Blobs utilisé par db.mjs : get / set / setJSON / delete / list.
// Choisi automatiquement quand la variable BLOB_READ_WRITE_TOKEN existe (Vercel).
import { put, get as vget, del, list as vlist, head } from '@vercel/blob';

const OPTS = { access: 'private', addRandomSuffix: false, cacheControlMaxAge: 60 };

async function write(key, body, contentType, onlyIfNew) {
  if (onlyIfNew) {
    // Ajout seul : on ne réécrit jamais une clé existante.
    try { await head(key); return { modified: false }; } catch { /* absente : on écrit */ }
  }
  await put(key, body, { ...OPTS, contentType, allowOverwrite: !onlyIfNew });
  return { modified: true };
}

export function vercelStore() {
  return {
    async get(key, { type } = {}) {
      const r = await vget(key, { access: 'private', useCache: false }).catch((e) => {
        if (e && /not.?found/i.test(e.name + e.message)) return null;
        throw e;
      });
      if (!r || r.statusCode !== 200 || !r.stream) return null;
      const text = await new Response(r.stream).text();
      return type === 'json' ? JSON.parse(text) : text;
    },
    setJSON(key, value, o = {}) { return write(key, JSON.stringify(value), 'application/json', o.onlyIfNew); },
    set(key, value, o = {}) { return write(key, String(value), 'text/plain', o.onlyIfNew); },
    async delete(key) { await del(key); },
    async *list({ prefix } = {}) {
      let cursor;
      do {
        const r = await vlist({ prefix, cursor, limit: 1000 });
        yield { blobs: r.blobs.map((b) => ({ key: b.pathname })) };
        cursor = r.hasMore ? r.cursor : undefined;
      } while (cursor);
    },
  };
}
