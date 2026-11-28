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

// ---------- Authentification multifacteur (TOTP, RFC 6238) ----------
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const newTotpSecret = () => { const b = randomBytes(20); let bits = ''; for (const x of b) bits += x.toString(2).padStart(8, '0'); let out = ''; for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)]; return out; };
function b32dec(str) { let bits = ''; for (const c of String(str).toUpperCase().replace(/=+$/, '')) { const v = B32.indexOf(c); if (v < 0) return null; bits += v.toString(2).padStart(5, '0'); } const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); }
function hotp(key, counter) { const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(counter)); const h = createHmac('sha1', key).update(buf).digest(); const o = h[h.length - 1] & 15; const code = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]; return String(code % 1e6).padStart(6, '0'); }
export function verifyTotp(secret, code, at = Date.now()) {
  const key = b32dec(secret); if (!key || !/^\d{6}$/.test(String(code || '').trim())) return false;
  const step = Math.floor(at / 30000);
  for (const d of [-1, 0, 1]) if (timingSafeEqual(Buffer.from(hotp(key, step + d)), Buffer.from(String(code).trim()))) return true;
  return false;
}
export const totpNow = (secret, at = Date.now()) => hotp(b32dec(secret), Math.floor(at / 30000));
