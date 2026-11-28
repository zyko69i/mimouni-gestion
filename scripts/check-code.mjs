import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const failures = [];
let passed = 0;

function check(condition, message) {
  if (condition) {
    passed += 1;
    console.log('OK  ' + message);
  } else {
    failures.push(message);
    console.error('KO  ' + message);
  }
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
  } catch (error) {
    check(false, label + ' — JSON illisible (' + error.message + ')');
    return null;
  }
}

for (const path of [
  'public/index.html',
  'public/app.js',
  'public/app.css',
  'public/manifest.webmanifest',
  'public/sw.js',
  'api/index.mjs',
  'api/sauvegarde.mjs',
  'netlify/functions/api.mjs',
  'netlify/lib/db.mjs',
  'netlify/lib/auth.mjs',
]) {
  check(existsSync(resolve(root, path)), 'Fichier requis présent : ' + path);
}

const html = readFileSync(resolve(root, 'public/index.html'), 'utf8');
const localRefs = [...html.matchAll(/\b(?:src|href)=["'](\/[^"'?#]*)(?:[?#][^"']*)?["']/g)]
  .map((match) => match[1])
  .filter((path) => path !== '/');
for (const path of new Set(localRefs)) {
  check(existsSync(resolve(root, 'public', path.slice(1))), 'Ressource HTML présente : ' + path);
}

const manifest = readJson('public/manifest.webmanifest', 'Manifest PWA');
if (manifest) {
  check(typeof manifest.name === 'string' && manifest.name.length > 0, 'Nom de l’application PWA défini');
  check(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'Icône(s) PWA déclarée(s)');
  for (const icon of manifest.icons || []) {
    check(typeof icon.src === 'string' && existsSync(resolve(root, 'public', icon.src.replace(/^\//, ''))),
      'Icône PWA présente : ' + icon.src);
  }
}

const vercel = readJson('vercel.json', 'Configuration Vercel');
if (vercel) {
  check(vercel.outputDirectory === 'public', 'Vercel publie le dossier public');
  check((vercel.rewrites || []).some((rule) => rule.source === '/api/:path*' && rule.destination === '/api?__p=:path*'),
    'Réécriture des routes API configurée');
  check((vercel.rewrites || []).some((rule) => rule.source === '/e/:id*' && rule.destination === '/index.html'),
    'Route des QR codes configurée');
}

if (failures.length) {
  console.error('\n' + failures.length + ' contrôle(s) en échec, ' + passed + ' réussi(s).');
  process.exitCode = 1;
} else {
  console.log('\n' + passed + ' contrôles de structure réussis.');
}
