import { db, findUserById, findDriverByUserId } from './mockDb';
import { decryptField } from '../security/crypto';
import { appendAudit, listAudit, totalAuditCount } from '../security/audit';
import { signAccessToken } from '../security/jwt';
import { can } from '../security/rbac';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function adminStats({ actor }) {
  if (!can(actor?.role, 'admin:read')) return null;
  await sleep(100);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeRides = db.rides.filter((r) =>
    ['scheduled', 'in_progress'].includes(r.status)
  ).length;
  const bookingsToday = db.reservations.filter(
    (r) => new Date(r.booked_at).getTime() >= today.getTime()
  ).length;
  const revenueToday = db.payments
    .filter(
      (p) => p.status === 'succeeded' && new Date(p.paid_at).getTime() >= today.getTime()
    )
    .reduce((acc, p) => acc + p.amount, 0);
  const newUsers = db.users.filter(
    (u) => new Date(u.created_at).getTime() >= today.getTime() - 86400000
  ).length;
  return { activeRides, bookingsToday, revenueToday, newUsers };
}

export async function adminAlerts({ actor }) {
  if (!can(actor?.role, 'admin:read')) return [];
  await sleep(80);
  const alerts = [];
  db.payments
    .filter((p) => p.status === 'failed' || p.flagged)
    .slice(-5)
    .forEach((p) =>
      alerts.push({
        id: p.id,
        kind: p.flagged ? 'flag' : 'fail',
        title: p.flagged ? 'Payment flagged' : 'Failed payment',
        body: `${p.amount} TND — ${p.gateway_reference ?? 'n/a'}`,
        created_at: p.paid_at,
      })
    );
  db.drivers
    .filter((d) => d.status === 'pending')
    .slice(-5)
    .forEach((d) =>
      alerts.push({
        id: d.id,
        kind: 'verification',
        title: 'Driver pending verification',
        body: findUserById(d.user_id)?.full_name ?? 'New applicant',
        created_at: new Date().toISOString(),
      })
    );
  return alerts;
}

export async function adminSearchUsers({ actor, q }) {
  if (!can(actor?.role, 'admin:read')) return [];
  await sleep(120);
  const ql = (q || '').trim().toLowerCase();
  return db.users
    .map((u) => ({
      ...u,
      phone_decrypted: decryptField(u.phone_number),
      driver: findDriverByUserId(u.id),
    }))
    .filter((u) => {
      if (!ql) return true;
      return (
        u.full_name.toLowerCase().includes(ql) ||
        u.email.toLowerCase().includes(ql) ||
        (u.phone_decrypted || '').includes(ql)
      );
    });
}

export async function adminSetUserActive({ actor, userId, active }) {
  if (!can(actor?.role, 'admin:suspend-user')) return { ok: false, error: 'Forbidden' };
  await sleep(100);
  const u = findUserById(userId);
  if (!u) return { ok: false, error: 'Not found' };
  if (!active && u.role === 'admin') {
    const remainingAdmins = db.users.filter(
      (x) => x.role === 'admin' && x.is_active && x.id !== u.id
    );
    if (remainingAdmins.length === 0) {
      return { ok: false, error: 'Cannot suspend the last admin' };
    }
  }
  u.is_active = active;
  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: active ? 'user.reactivated' : 'user.suspended',
    targetEntity: 'user',
    targetId: u.id,
  });
  return { ok: true };
}

export async function adminImpersonate({ actor, userId }) {
  if (!can(actor?.role, 'admin:impersonate')) return { ok: false, error: 'Forbidden' };
  const target = findUserById(userId);
  if (!target) return { ok: false, error: 'Not found' };
  if (target.role === 'admin') return { ok: false, error: 'Cannot impersonate another admin' };
  await sleep(120);
  // Short-lived scoped token, marked as impersonation in claims so the gateway can stamp logs.
  const token = await signAccessToken({
    sub: target.id,
    role: target.role,
    name: target.full_name,
    impersonatedBy: actor.id,
  });
  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'admin.impersonate',
    targetEntity: 'user',
    targetId: target.id,
  });
  return { ok: true, accessToken: token, target };
}

export async function adminListAudit({ actor, filters = {} }) {
  if (!can(actor?.role, 'admin:read')) return { total: 0, rows: [] };
  await sleep(80);
  return listAudit({ ...filters, limit: 200 });
}

export async function adminAuditCount({ actor }) {
  if (!can(actor?.role, 'admin:read')) return 0;
  return totalAuditCount();
}
