// Point d'entrée Vercel : réutilise le routeur des fonctions Netlify.
// vercel.json réécrit /api/<chemin> vers /api?__p=<chemin>.
import handler from '../netlify/functions/api.mjs';

async function entry(req) {
  const url = new URL(req.url);
  const p = url.searchParams.get('__p');
  if (p !== null) {
    url.searchParams.delete('__p');
    url.pathname = '/api/' + p;
    const init = { method: req.method, headers: req.headers };
    if (!['GET', 'HEAD'].includes(req.method)) { init.body = await req.arrayBuffer(); }
    req = new Request(url, init);
  }
  return handler(req);
}
export const GET = entry, POST = entry, PUT = entry, PATCH = entry, DELETE = entry;
