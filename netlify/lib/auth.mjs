// Authentification : mot de passe haché (scrypt), jeton signé HMAC-SHA256.
// Le secret de signature vient UNIQUEMENT de la variable d'environnement
// MIMOUNI_TOKEN_SECRET (jamais dans le code ni dans le dépôt).
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';

const TOKEN_DAYS = 30;

export function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  const h = scryptSync(String(pw), salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$16384$${salt}$${h}`;
}

export function verifyPassword(pw, stored) {
  try {
    const [algo, n, salt, h] = String(stored).split('$');
    if (algo !== 'scrypt') return false;
    const calc = scryptSync(String(pw), salt, 64, { N: Number(n), r: 8, p: 1 });
    const ref = Buffer.from(h, 'hex');
    return ref.length === calc.length && timingSafeEqual(ref, calc);
  } catch { return false; }
}

function secret() {
  const s = process.env.MIMOUNI_TOKEN_SECRET;
  if (!s || s.length < 32) throw new Error('MIMOUNI_TOKEN_SECRET manquant');
  return s;
}

const b64u = (buf) => Buffer.from(buf).toString('base64url');

export function signToken(user) {
  const payload = { u: user.login, r: user.role, v: user.tokenVersion || 0, exp: Date.now() + TOKEN_DAYS * 864e5 };
  const body = b64u(JSON.stringify(payload));
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function readToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const calc = createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig || ''), b = Buffer.from(calc);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!p.exp || p.exp < Date.now()) return null;
    return p;
  } catch { return null; }
}
