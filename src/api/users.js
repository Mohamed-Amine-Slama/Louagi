import { db, findUserById } from './mockDb';
import { decryptField, hashPassword, verifyPassword } from '../security/crypto';
import { appendAudit } from '../security/audit';
import { validateEmail, validateName, validatePassword, sanitize } from '../validation/schemas';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function getProfile({ actor }) {
  await sleep(50);
  const u = findUserById(actor.id);
  if (!u) return null;
  return {
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    phone_masked: decryptField(u.phone_number),
    role: u.role,
    notifications: u.notifications ?? { sms: true, push: true },
  };
}

export async function updateProfile({ actor, fullName, email, currentPassword, newPassword }) {
  await sleep(160);
  const u = findUserById(actor.id);
  if (!u) return { ok: false, error: 'Not found' };
  const errs = {};
  if (fullName != null) {
    const e = validateName(fullName);
    if (e) errs.fullName = e;
  }
  if (email != null) {
    const e = validateEmail(email);
    if (e) errs.email = e;
    if (!e && db.users.some((x) => x.email === email.toLowerCase() && x.id !== u.id)) {
      errs.email = 'Email already in use';
    }
  }
  if (newPassword) {
    const e = validatePassword(newPassword);
    if (e) errs.newPassword = e;
    const ok = await verifyPassword(currentPassword || '', u.password_hash);
    if (!ok) errs.currentPassword = 'Current password incorrect';
  }
  if (Object.keys(errs).length) return { ok: false, errors: errs };
  if (fullName != null) u.full_name = sanitize(fullName);
  if (email != null) u.email = email.toLowerCase();
  if (newPassword) u.password_hash = await hashPassword(newPassword);
  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'profile.updated',
    targetEntity: 'user',
    targetId: u.id,
  });
  return { ok: true };
}

export async function updateNotificationPrefs({ actor, sms, push }) {
  await sleep(60);
  const u = findUserById(actor.id);
  if (!u) return { ok: false };
  u.notifications = { sms: !!sms, push: !!push };
  return { ok: true };
}

export async function deleteAccount({ actor, password }) {
  await sleep(140);
  const u = findUserById(actor.id);
  if (!u) return { ok: false, error: 'Not found' };
  const ok = await verifyPassword(password || '', u.password_hash);
  if (!ok) return { ok: false, error: 'Password incorrect' };
  u.is_active = false;
  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'user.self_deleted',
    targetEntity: 'user',
    targetId: u.id,
  });
  return { ok: true };
}
