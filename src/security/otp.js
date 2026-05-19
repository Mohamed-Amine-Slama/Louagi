import { randomDigits } from './crypto';

// In-memory OTP store. In production this lives in Redis with a short TTL.
const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;

export function issueOtp(channel) {
  const code = randomDigits(6);
  otpStore.set(channel, {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
  // In dev we surface the code via a deterministic stub channel (the UI shows a hint).
  return { code, expiresAt: Date.now() + OTP_TTL_MS };
}

export function verifyOtp(channel, submitted) {
  const entry = otpStore.get(channel);
  if (!entry) return { ok: false, reason: 'OTP_NOT_FOUND' };
  if (entry.expiresAt < Date.now()) {
    otpStore.delete(channel);
    return { ok: false, reason: 'OTP_EXPIRED' };
  }
  entry.attempts += 1;
  if (entry.attempts > 5) {
    otpStore.delete(channel);
    return { ok: false, reason: 'OTP_LOCKED' };
  }
  if (entry.code !== submitted) {
    return { ok: false, reason: 'OTP_MISMATCH', remaining: 5 - entry.attempts };
  }
  otpStore.delete(channel);
  return { ok: true };
}

export function peekOtp(channel) {
  // Dev-only — used to surface the generated code in the UI banner.
  return otpStore.get(channel)?.code ?? null;
}
