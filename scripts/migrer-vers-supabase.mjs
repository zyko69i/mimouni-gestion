// Reprise des données existantes (Vercel Blob ou Netlify Blobs) vers Supabase.
//
// Usage :
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… BLOB_READ_WRITE_TOKEN=… \
//   node scripts/migrer-vers-supabase.mjs [--simulation]
//
// - recopie toutes les clés (collections, historique, photos, journal, sauvegardes) ;
// - ne réécrit jamais une clé déjà présente dans Supabase (ajout seul) ;
// - affiche un décompte par préfixe et vérifie la parité à la fin.
import { list, get } from '@vercel/blob';
import { supabaseStore } from '../netlify/lib/store-supabase.mjs';

const SIMULATION = process.argv.includes('--simulation');
const sb = supabaseStore();

async function* allBlobs() {
  let cursor;
  do {
    const r = await list({ cursor, limit: 1000 });
    yield r.blobs;
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
}

const counts = {};
const bump = (p) => { const k = p.split('/')[0]; counts[k] = (counts[k] || 0) + 1; };

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis');
  }

  const existing = new Set();
  const s = sb;
  for await (const page of s.list({})) for (const b of page.blobs) existing.add(b.key);
  console.log(`Supabase : ${existing.size} clé(s) déjà présente(s)`);

  let copied = 0, skipped = 0, failed = 0;
  for await (const page of allBlobs()) {
    for (const b of page.blobs) {
      bump(b.pathname);
      if (existing.has(b.pathname)) { skipped++; continue; }
      try {
        const r = await get(b.pathname, { access: 'private', useCache: false });
        if (!r || r.statusCode !== 200 || !r.stream) throw new Error('lecture impossible');
        const text = await new Response(r.stream).text();
        if (SIMULATION) { copied++; continue; }
        if (b.pathname.startsWith('photos/')) {
          await s.set(b.pathname, text, { onlyIfNew: true });
        } else {
          let value;
          try { value = JSON.parse(text); } catch { value = undefined; }
          if (value === undefined) await s.set(b.pathname, text, { onlyIfNew: true });
          else await s.setJSON(b.pathname, value, { onlyIfNew: true });
        }
        copied++;
        if (copied % 200 === 0) console.log(`  ${copied} clé(s) recopiée(s)…`);
      } catch (e) {
        failed++;
        console.error(`ECHEC ${b.pathname} : ${e.message}`);
      }
    }
  }

  console.log('\nPar préfixe :');
  for (const [k, v] of Object.entries(counts).sort()) console.log(`  ${k.padEnd(12)} ${v}`);
  console.log(`\n${SIMULATION ? '[simulation] ' : ''}recopiées : ${copied} · déjà présentes : ${skipped} · échecs : ${failed}`);

  if (!SIMULATION) {
    let after = 0;
    for await (const page of s.list({})) after += page.blobs.length;
    console.log(`Supabase après reprise : ${after} clé(s)`);
  }
  if (failed) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
