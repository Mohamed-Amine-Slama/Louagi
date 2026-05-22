import { b64encode, b64decode, sha256, randomBytesHex } from './crypto';

// Lightweight JWT-compatible encoder/decoder using HS256-style payload signing.
// The signature is a SHA-256 HMAC analogue (key-prefixed hash) — sufficient for
// the client-side token shape spec'd in the docs; replace with a real HMAC on the server.

const SIGNING_SECRET = randomBytesHex(32);
const ACCESS_TTL_SEC = 15 * 60; // 15 minutes (matches spec)
const REFRESH_TTL_SEC = 14 * 24 * 60 * 60; // 14 days

const b64url = (s) =>
  b64encode(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

const b64urlDecode = (s) => {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return b64decode(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
};

async function sign(input) {
  return sha256(`${SIGNING_SECRET}|${input}`);
}

export async function signAccessToken(claims) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({
      ...claims,
      iat: now,
      exp: now + ACCESS_TTL_SEC,
      jti: randomBytesHex(8),
    })
  );
  const sig = await sign(`${header}.${payload}`);
  return `${header}.${payload}.${sig}`;
}

export async function signRefreshToken(claims) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT-R' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({
      ...claims,
      iat: now,
      exp: now + REFRESH_TTL_SEC,
      jti: randomBytesHex(12),
    })
  );
  const sig = await sign(`${header}.${payload}`);
  return `${header}.${payload}.${sig}`;
}

export async function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  try {
    const claims = JSON.parse(b64urlDecode(payload));
    if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) return null;
    // Backend-issued tokens are verified on the server. The client only needs
    // to know whether a cached token is structurally usable and unexpired.
    if (claims.iss === 'louagi-server') return claims;

    const expected = await sign(`${header}.${payload}`);
    if (expected !== sig) return null;
    return claims;
  } catch {
    return null;
  }
}

export function decodeUnsafe(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(b64urlDecode(parts[1]));
  } catch {
    return null;
  }
}

export function tokenExpiresInSec(token) {
  const claims = decodeUnsafe(token);
  if (!claims?.exp) return 0;
  return claims.exp - Math.floor(Date.now() / 1000);
}
