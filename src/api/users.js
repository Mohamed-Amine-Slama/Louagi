import { db, findUserById, newId } from './mockDb';
import { decryptField, hashPassword, verifyPassword } from '../security/crypto';
import { appendAudit } from '../security/audit';
import { validateEmail, validateName, validatePassword, sanitize } from '../validation/schemas';
import { useMocks } from '../config';
import { DEFAULT_TIERS } from '../lib/tiers';
import { gql, gqlList } from './graphql';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Achievement catalogue (id/icon/label key + unlock threshold), sourced from the
// DB (public.achievements) instead of a hard-coded array in the bundle. The
// catalogue is global reference data, so memoise it for the session.
let achievementsCache = null;

export async function listAchievements() {
  if (!useMocks) {
    if (achievementsCache) return achievementsCache;
    const rows = await gqlList('ListAchievements');
    if (rows.length) achievementsCache = rows;
    return rows;
  }
  await sleep(40);
  return [];
}

// Loyalty tier ladder (code/label key + threshold/discount/perks), sourced from
// the DB (public.tiers). Memoised for the session like the achievements list.
// Mock mode falls back to the bundled default so the UI stays meaningful.
let tiersCache = null;

export async function listTiers() {
  if (!useMocks) {
    if (tiersCache) return tiersCache;
    const rows = await gqlList('ListTiers');
    if (rows.length) tiersCache = rows;
    return rows.length ? rows : DEFAULT_TIERS;
  }
  await sleep(40);
  return DEFAULT_TIERS;
}

export async function getProfile({ actor }) {
  if (!useMocks) {
    const result = await gql('GetProfile');
    return result?.id ? result : null;
  }
  await sleep(50);
  const u = findUserById(actor.id);
  if (!u) return null;
  return {
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    phone_masked: decryptField(u.phone_number),
    role: u.role,
    created_at: u.created_at,
    notifications: { sms: true, push: true, marketing: false, ...(u.notifications || {}) },
    preferences: { defaultSeats: 1, ...(u.preferences || {}) },
    payment_method: u.payment_method || null,
  };
}

export async function updateProfile({ actor, fullName, email, currentPassword, newPassword }) {
  if (!useMocks) return gql('UpdateProfile', { fullName, email, currentPassword, newPassword });
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

export async function updateNotificationPrefs({ actor, sms, push, marketing }) {
  if (!useMocks) return gql('UpdateNotificationPrefs', { sms, push, marketing });
  await sleep(60);
  const u = findUserById(actor.id);
  if (!u) return { ok: false };
  const current = { sms: true, push: true, marketing: false, ...(u.notifications || {}) };
  u.notifications = {
    ...current,
    ...(sms != null ? { sms: !!sms } : {}),
    ...(push != null ? { push: !!push } : {}),
    ...(marketing != null ? { marketing: !!marketing } : {}),
  };
  return { ok: true };
}

export async function updateTravelPrefs({ actor, defaultSeats }) {
  if (!useMocks) return gql('UpdateTravelPrefs', { defaultSeats });
  await sleep(60);
  const u = findUserById(actor.id);
  if (!u) return { ok: false, error: 'Not found' };
  const seats = Math.round(Number(defaultSeats));
  if (!Number.isFinite(seats) || seats < 1 || seats > 8) {
    return { ok: false, errors: { defaultSeats: 'Seats must be 1-8' } };
  }
  u.preferences = { ...(u.preferences || {}), defaultSeats: seats };
  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'preferences.updated',
    targetEntity: 'user',
    targetId: u.id,
    metadata: { defaultSeats: seats },
  });
  return { ok: true, preferences: u.preferences };
}

export async function updatePaymentMethod({ actor, flouciAccount }) {
  if (!useMocks) return gql('UpdatePaymentMethod', { flouciAccount });
  await sleep(100);
  const u = findUserById(actor.id);
  if (!u) return { ok: false, error: 'Not found' };
  const account = sanitize(flouciAccount || '');
  if (!account) {
    u.payment_method = null;
  } else {
    if (account.length < 4) return { ok: false, errors: { flouciAccount: 'Account too short' } };
    u.payment_method = {
      provider: 'flouci',
      account,
      updated_at: new Date().toISOString(),
    };
  }
  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: account ? 'payment_method.updated' : 'payment_method.removed',
    targetEntity: 'user',
    targetId: u.id,
  });
  return { ok: true, payment_method: u.payment_method };
}

export async function createSupportTicket({ actor, topic, message }) {
  if (!useMocks) return gql('CreateSupportTicket', { topic, message });
  await sleep(120);
  const u = findUserById(actor.id);
  if (!u) return { ok: false, error: 'Not found' };
  const cleanMessage = sanitize(message || '');
  if (cleanMessage.length < 8) return { ok: false, errors: { message: 'Add a few more details' } };
  const ticket = {
    id: newId(),
    user_id: actor.id,
    topic: sanitize(topic || 'support'),
    message: cleanMessage,
    status: 'open',
    created_at: new Date().toISOString(),
  };
  db.supportTickets.push(ticket);
  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'support.ticket_created',
    targetEntity: 'support_ticket',
    targetId: ticket.id,
  });
  return { ok: true, ticket };
}

export async function requestDataExport({ actor }) {
  if (!useMocks) return gql('RequestDataExport');
  await sleep(140);
  const profile = await getProfile({ actor });
  if (!profile) return { ok: false, error: 'Not found' };
  const reservations = db.reservations
    .filter((r) => r.user_id === actor.id)
    .map(({ id, ride_id, seats_booked, total_price, status, created_at, cancelled_at }) => ({
      id,
      ride_id,
      seats_booked,
      total_price,
      status,
      created_at,
      cancelled_at,
    }));
  const deliveries = (db.deliveries || [])
    .filter((d) => d.sender_id === actor.id || d.user_id === actor.id)
    .map(({ id, ride_id, description, status, price, created_at }) => ({
      id,
      ride_id,
      description,
      status,
      price,
      created_at,
    }));
  const supportTickets = db.supportTickets
    .filter((ticket) => ticket.user_id === actor.id)
    .map(({ id, topic, status, created_at }) => ({ id, topic, status, created_at }));

  return {
    ok: true,
    export: {
      generated_at: new Date().toISOString(),
      profile,
      reservations,
      deliveries,
      support_tickets: supportTickets,
    },
  };
}

export async function deleteAccount({ actor, password }) {
  if (!useMocks) return gql('DeleteAccount', { password });
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

export async function verifyCurrentPassword({ actor, password }) {
  if (!useMocks) return gql('VerifyCurrentPassword', { password });
  await sleep(120);
  const u = findUserById(actor.id);
  if (!u) return { ok: false, error: 'Not found' };
  const ok = await verifyPassword(password || '', u.password_hash);
  if (!ok) return { ok: false, error: 'Current password incorrect' };
  return { ok: true };
}

export async function changePasswordSecure({ actor, currentPassword, newPassword }) {
  if (!useMocks) return gql('ChangePasswordSecure', { currentPassword, newPassword });
  await sleep(180);
  const u = findUserById(actor.id);
  if (!u) return { ok: false, error: 'Not found' };
  const errs = {};
  // Verify old password
  const oldOk = await verifyPassword(currentPassword || '', u.password_hash);
  if (!oldOk) errs.currentPassword = 'Current password incorrect';
  // Validate new password
  const pwErr = validatePassword(newPassword);
  if (pwErr) errs.newPassword = pwErr;
  // Ensure not reusing old password
  if (newPassword && currentPassword && newPassword === currentPassword) {
    errs.newPassword = 'New password must be different from current';
  }
  if (Object.keys(errs).length) return { ok: false, errors: errs };
  u.password_hash = await hashPassword(newPassword);
  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'password.changed_secure',
    targetEntity: 'user',
    targetId: u.id,
  });
  return { ok: true };
}
