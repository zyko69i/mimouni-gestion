// Test hors ligne de l'adaptateur Supabase : un faux PostgREST en mémoire
// vérifie la construction des requêtes et le comportement de l'interface
// (get / set / setJSON / delete / list paginé / ajout seul).
// Lancer : node tests/supabase-smoke.mjs
import http from 'node:http';
import assert from 'node:assert/strict';

const rows = new Map();
const calls = [];

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  calls.push(`${req.method} ${u.pathname}${u.search}`);
  const keyOf = () => {
    const eq = u.searchParams.get('key');
    if (!eq) return null;
    if (eq.startsWith('eq.')) return decodeURIComponent(eq.slice(3));
    return null;
  };
  const body = await new Promise((ok) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => ok(d)); });

  if (req.method === 'GET') {
    let out = [...rows.values()];
    const eq = keyOf();
    const like = u.searchParams.get('key');
    if (like && like.startsWith('in.(')) {
      const wanted = like.slice(4, -1).split(',').map((x) => x.replace(/^"|"$/g, '').replace(/\\"/g, '"'));
      out = out.filter((r) => wanted.includes(r.key));
    } else if (eq !== null) out = out.filter((r) => r.key === eq);
    else if (like && like.startsWith('like.')) {
      const raw = like.slice(5).replace(/\\/g, '');
      const p = raw.replace(/([.+?^${}()|[\]\\])/g, '\\$1').replace(/%/g, '.*');
      const re = new RegExp('^' + p + '$');
      out = out.filter((r) => re.test(r.key));
    }
    out.sort((a, b) => (a.key < b.key ? -1 : 1));
    const limit = Number(u.searchParams.get('limit') || 1000);
    const offset = Number(u.searchParams.get('offset') || 0);
    out = out.slice(offset, offset + limit);
    const select = u.searchParams.get('select') || '*';
    const fields = select.split(',');
    const payload = out.map((r) => Object.fromEntries(fields.map((f) => [f, r[f]])));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(payload));
  }
  if (req.method === 'POST') {
    const prefer = req.headers.prefer || '';
    for (const row of JSON.parse(body || '[]')) {
      if (rows.has(row.key) && prefer.includes('ignore-duplicates')) continue;
      rows.set(row.key, { ...rows.get(row.key), ...row });
    }
    res.writeHead(201, { 'Content-Type': 'application/json' });
    return res.end('[]');
  }
  if (req.method === 'DELETE') {
    const k = keyOf();
    if (k) rows.delete(k);
    res.writeHead(204);
    return res.end();
  }
  res.writeHead(405); res.end();
});

await new Promise((ok) => server.listen(0, ok));
process.env.SUPABASE_URL = `http://127.0.0.1:${server.address().port}`;
process.env.SUPABASE_SERVICE_ROLE_KEY = 'cle-de-test';

const { supabaseStore } = await import('../netlify/lib/store-supabase.mjs');
const s = supabaseStore();

assert.equal(await s.get('users/u1', { type: 'json' }), null, 'clé absente');

await s.setJSON('users/u1', { nom: 'Mimouni', role: 'admin' });
assert.deepEqual(await s.get('users/u1', { type: 'json' }), { nom: 'Mimouni', role: 'admin' });

await s.setJSON('users/u1', { nom: 'Mimouni', role: 'chef' });
assert.equal((await s.get('users/u1', { type: 'json' })).role, 'chef', 'écrasement autorisé');

const r1 = await s.setJSON('hist/e1/20260101', { at: '2026-01-01' }, { onlyIfNew: true });
const r2 = await s.setJSON('hist/e1/20260101', { at: 'autre' }, { onlyIfNew: true });
assert.equal(r1.modified, true);
assert.equal(r2.modified, false, 'ajout seul respecté');
assert.equal((await s.get('hist/e1/20260101', { type: 'json' })).at, '2026-01-01');

await s.set('photos/p1', 'data:image/png;base64,AAA');
assert.equal(await s.get('photos/p1', { type: 'text' }), 'data:image/png;base64,AAA');

for (let i = 0; i < 1500; i++) await s.setJSON(`journal/20260101-${String(i).padStart(4, '0')}`, { i });

const seen = [];
for await (const page of s.list({ prefix: 'journal/' })) seen.push(...page.blobs.map((b) => b.key));
assert.equal(seen.length, 1500, 'listage paginé complet');
assert.equal(seen[0], 'journal/20260101-0000');
assert.equal(seen.at(-1), 'journal/20260101-1499');
const pagesJournal = calls.filter((c) => c.startsWith('GET') && c.includes('select=key') && c.includes('journal')).length;
assert.ok(pagesJournal >= 2, 'listage par pages');

const users = [];
for await (const page of s.list({ prefix: 'users/' })) users.push(...page.blobs.map((b) => b.key));
assert.deepEqual(users, ['users/u1']);

const many = await s.getMany(['journal/20260101-0001', 'journal/20260101-0002', 'absent/x']);
assert.deepEqual(many, [{ i: 1 }, { i: 2 }], 'lecture en lot');
const none = await s.getMany([]);
assert.deepEqual(none, []);

await s.delete('users/u1');
assert.equal(await s.get('users/u1', { type: 'json' }), null);


console.log('Adaptateur Supabase : OK');
console.log(`  ${rows.size} lignes · ${calls.length} requêtes HTTP`);
server.close();
