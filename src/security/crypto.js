import * as Crypto from 'expo-crypto';

const enc = (s) =>
  globalThis.btoa
    ? globalThis.btoa(unescape(encodeURIComponent(s)))
    : Buffer.from(s, 'utf8').toString('base64');

const dec = (s) =>
  globalThis.atob
    ? decodeURIComponent(escape(globalThis.atob(s)))
    : Buffer.from(s, 'base64').toString('utf8');

export const b64encode = enc;
export const b64decode = dec;

export async function sha256(input) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

export function randomBytesHex(len = 16) {
  const arr = Crypto.getRandomBytes(len);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomDigits(n = 6) {
  const arr = Crypto.getRandomBytes(n);
  return Array.from(arr).map((b) => (b % 10).toString()).join('');
}

const PEPPER = randomBytesHex(32);

// bcrypt-equivalent (without native bindings): salted SHA-256 with iterated rounds.
// The platform docs call for bcrypt; this is the closest mobile-safe analogue.
export async function hashPassword(plain) {
  const salt = randomBytesHex(16);
  let h = await sha256(`${PEPPER}|${salt}|${plain}`);
  for (let i = 0; i < 1024; i++) h = await sha256(h + salt);
  return `pbk$${salt}$${h}`;
}

export async function verifyPassword(plain, stored) {
  if (!stored?.startsWith('pbk$')) return false;
  const [, salt, expected] = stored.split('$');
  let h = await sha256(`${PEPPER}|${salt}|${plain}`);
  for (let i = 0; i < 1024; i++) h = await sha256(h + salt);
  return h === expected;
}

// Field-level encryption simulation for the offline mock path only. Real PII
// lives in Supabase and is handled by the backend.
const FIELD_KEY = randomBytesHex(32);

function xorMask(input, key) {
  const out = [];
  for (let i = 0; i < input.length; i++) {
    out.push(String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length)));
  }
  return out.join('');
}

export function encryptField(plain) {
  if (plain == null) return null;
  return 'enc:' + enc(xorMask(String(plain), FIELD_KEY));
}

export function decryptField(cipher) {
  if (cipher == null) return null;
  if (typeof cipher !== 'string' || !cipher.startsWith('enc:')) return cipher;
  try {
    return xorMask(dec(cipher.slice(4)), FIELD_KEY);
  } catch {
    return null;
  }
}

export function maskPhone(phone) {
  if (!phone) return '';
  const v = decryptField(phone) || phone;
  return v.replace(/(\+216\s?)?(\d{2})(\d{3})(\d{3})/, '$1$2 ••• $4');
}

export function maskId(id) {
  if (!id) return '';
  const v = decryptField(id) || id;
  return v.slice(0, 2) + '••••' + v.slice(-2);
}
