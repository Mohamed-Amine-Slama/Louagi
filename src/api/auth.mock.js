import { db, findUserByPhone, findDriverByUserId, newId } from './mockDb';
import { hashPassword, verifyPassword, encryptField } from '../security/crypto';
import { signAccessToken, signRefreshToken, verifyToken } from '../security/jwt';
import { issueOtp, verifyOtp, peekOtp } from '../security/otp';
import { rateLimit, clearRateLimit } from '../security/rateLimit';
import { appendAudit } from '../security/audit';
import {
  validateEmail,
  validateName,
  validatePassword,
  validateTunisianPhone,
  normalizeTunisianPhone,
  validateOtp,
  sanitize,
} from '../validation/schemas';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function ensureReady() {
  // Mock store starts ready and empty for users/drivers/admins. Register
  // through the UI to create an account.
}

export async function startLogin(phoneRaw, password) {
  await ensureReady();
  await sleep(200);
  const phoneErr = validateTunisianPhone(phoneRaw);
  if (phoneErr) return { ok: false, error: phoneErr };

  const phone = normalizeTunisianPhone(phoneRaw);
  const rl = rateLimit(`login:${phone}`, { max: 5, windowMs: 15 * 60 * 1000 });
  if (!rl.allowed) {
    return {
      ok: false,
      error: 'Too many attempts. Try again later.',
      lockedUntil: rl.lockedUntil,
    };
  }
  const user = findUserByPhone(phone);
  if (!user || !user.is_active) {
    return { ok: false, error: 'Phone or password is incorrect' };
  }
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return { ok: false, error: 'Phone or password is incorrect' };
  }
  clearRateLimit(`login:${phone}`);
  const otp = issueOtp(`login:${user.id}`);
  appendAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'login.credentials_ok',
    targetEntity: 'user',
    targetId: user.id,
  });
  return {
    ok: true,
    next: 'otp',
    userId: user.id,
    devOtp: otp.code, // dev convenience — surfaced in the OTP screen banner
  };
}

export async function completeLogin(userId, otp) {
  await sleep(120);
  const otpErr = validateOtp(otp);
  if (otpErr) return { ok: false, error: otpErr };
  const result = verifyOtp(`login:${userId}`, otp);
  if (!result.ok) {
    const map = {
      OTP_NOT_FOUND: 'OTP expired. Request a new one.',
      OTP_EXPIRED: 'OTP expired. Request a new one.',
      OTP_LOCKED: 'Too many wrong attempts.',
      OTP_MISMATCH: `Wrong code. ${result.remaining} attempts left.`,
    };
    return { ok: false, error: map[result.reason] || 'OTP failed' };
  }
  const user = db.users.find((u) => u.id === userId);
  if (!user) return { ok: false, error: 'User not found' };
  const driver = findDriverByUserId(user.id);
  const claims = {
    sub: user.id,
    role: user.role,
    name: user.full_name,
    driverStatus: driver?.status ?? null,
  };
  const accessToken = await signAccessToken(claims);
  const refreshToken = await signRefreshToken({ sub: user.id, role: user.role });
  appendAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'login.success',
    targetEntity: 'user',
    targetId: user.id,
  });
  return {
    ok: true,
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.full_name, role: user.role, driverStatus: claims.driverStatus },
  };
}

export async function register({ fullName, phone, email, password, role }) {
  await ensureReady();
  await sleep(220);
  const errs = {};
  const nameErr = validateName(fullName);
  if (nameErr) errs.fullName = nameErr;
  const phoneErr = validateTunisianPhone(phone);
  if (phoneErr) errs.phone = phoneErr;
  const emailErr = validateEmail(email);
  if (emailErr) errs.email = emailErr;
  const passErr = validatePassword(password);
  if (passErr) errs.password = passErr;
  if (!['passenger', 'driver'].includes(role)) errs.role = 'Choose passenger or driver';
  if (Object.keys(errs).length) return { ok: false, errors: errs };

  const normalizedPhone = normalizeTunisianPhone(phone);
  if (findUserByPhone(normalizedPhone)) {
    return { ok: false, errors: { phone: 'Phone already registered' } };
  }
  if (db.users.some((u) => u.email === email)) {
    return { ok: false, errors: { email: 'Email already in use' } };
  }
  const password_hash = await hashPassword(password);
  const user = {
    id: newId(),
    full_name: sanitize(fullName),
    phone_number: encryptField(normalizedPhone),
    email: email.toLowerCase(),
    password_hash,
    role,
    created_at: new Date().toISOString(),
    is_active: true,
    notifications: { sms: true, push: true, marketing: false },
    preferences: { defaultSeats: 1 },
    payment_method: null,
  };
  db.users.push(user);
  const otp = issueOtp(`register:${user.id}`);
  appendAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'register.created',
    targetEntity: 'user',
    targetId: user.id,
  });
  return { ok: true, userId: user.id, devOtp: otp.code };
}

export async function verifyRegistration(userId, otp) {
  await sleep(100);
  const otpErr = validateOtp(otp);
  if (otpErr) return { ok: false, error: otpErr };
  const result = verifyOtp(`register:${userId}`, otp);
  if (!result.ok) return { ok: false, error: 'OTP failed' };
  const user = db.users.find((u) => u.id === userId);
  if (!user) return { ok: false, error: 'User not found' };

  const driver = findDriverByUserId(user.id);
  const claims = {
    sub: user.id,
    role: user.role,
    name: user.full_name,
    driverStatus: driver?.status ?? (user.role === 'driver' ? 'pending' : null),
  };
  const accessToken = await signAccessToken(claims);
  const refreshToken = await signRefreshToken({ sub: user.id, role: user.role });
  return {
    ok: true,
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.full_name, role: user.role, driverStatus: claims.driverStatus },
  };
}

export async function resendOtp(channelUserId, purpose) {
  const otp = issueOtp(`${purpose}:${channelUserId}`);
  return { ok: true, devOtp: otp.code };
}

export async function refresh(token) {
  const claims = await verifyToken(token);
  if (!claims) return { ok: false };
  const accessToken = await signAccessToken({
    sub: claims.sub,
    role: claims.role,
    name: claims.name,
  });
  const refreshToken = await signRefreshToken({ sub: claims.sub, role: claims.role });
  return { ok: true, accessToken, refreshToken };
}

export function peekDevOtp(userId, purpose) {
  return peekOtp(`${purpose}:${userId}`);
}

export async function logout() {
  // Nothing server-side needs revocation in the in-memory mock, but the
  // dispatcher in auth.js keeps this signature symmetric with auth.real.js.
  return { ok: true };
}

export async function enrollBiometric({ userId }) {
  await sleep(80);
  const user = db.users.find((u) => u.id === userId);
  if (!user || !user.is_active) return { ok: false, error: 'User not found' };
  // Long-lived biometric ticket. The `kind: 'biometric'` claim lets
  // biometricLogin distinguish it from a regular refresh token.
  const ticket = await signRefreshToken({ sub: user.id, role: user.role, kind: 'biometric' });
  // Persist enrollment to the database so it is linked to the account
  user.biometric_enrolled = true;
  user.biometric_enrolled_at = new Date().toISOString();
  appendAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'biometric.enrolled',
    targetEntity: 'user',
    targetId: user.id,
  });
  return { ok: true, ticket };
}

export async function biometricLogin(ticket) {
  await sleep(120);
  const claims = await verifyToken(ticket);
  if (!claims || claims.kind !== 'biometric') {
    return { ok: false, error: 'Biometric credential is no longer valid. Sign in with your phone and password.' };
  }
  const user = db.users.find((u) => u.id === claims.sub);
  if (!user || !user.is_active) {
    return { ok: false, error: 'Account unavailable' };
  }
  // Verify biometric enrollment is persisted in the database
  if (!user.biometric_enrolled) {
    return { ok: false, error: 'Biometric is not enrolled for this account. Please re-enable it in settings.' };
  }
  const driver = findDriverByUserId(user.id);
  const sessionClaims = {
    sub: user.id,
    role: user.role,
    name: user.full_name,
    driverStatus: driver?.status ?? null,
  };
  const accessToken = await signAccessToken(sessionClaims);
  const refreshToken = await signRefreshToken({ sub: user.id, role: user.role });
  // Rotate the biometric ticket so daily users never hit the 14-day TTL.
  const nextTicket = await signRefreshToken({ sub: user.id, role: user.role, kind: 'biometric' });
  appendAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'login.biometric',
    targetEntity: 'user',
    targetId: user.id,
  });
  return {
    ok: true,
    accessToken,
    refreshToken,
    ticket: nextTicket,
    user: { id: user.id, name: user.full_name, role: user.role, driverStatus: sessionClaims.driverStatus },
  };
}
