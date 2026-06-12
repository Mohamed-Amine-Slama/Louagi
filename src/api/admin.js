import { db, findUserById, findDriverByUserId } from './mockDb';
import { decryptField } from '../security/crypto';
import { appendAudit, listAudit, totalAuditCount } from '../security/audit';
import { signAccessToken } from '../security/jwt';
import { can } from '../security/rbac';
import { useMocks } from '../config';
import { gql, gqlList } from './graphql';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function adminStats({ actor }) {
  if (!useMocks) {
    const result = await gql('AdminStats');
    return result?.activeRides != null ? result : null;
  }
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
  if (!useMocks) return gqlList('AdminAlerts');
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
  if (!useMocks) return gqlList('AdminSearchUsers', { q });
  if (!can(actor?.role, 'admin:read')) return [];
  await sleep(120);
  const ql = (q || '').trim().toLowerCase();
  return db.users
    .map((u) => ({
      ...u,
      phone_number: decryptField(u.phone_number),
      driver: findDriverByUserId(u.id),
    }))
    .filter((u) => {
      if (!ql) return true;
      return (
        u.full_name.toLowerCase().includes(ql) ||
        u.email.toLowerCase().includes(ql) ||
        (u.phone_number || '').includes(ql)
      );
    });
}

export async function adminSetUserActive({ actor, userId, active }) {
  if (!useMocks) return gql('AdminSetUserActive', { userId, active });
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

export async function adminImpersonate({ actor, userId, mfaCode }) {
  if (!useMocks) return gql('AdminImpersonate', { userId, mfaCode });
  if (!can(actor?.role, 'admin:impersonate')) return { ok: false, error: 'Forbidden' };
  if (!mfaCode) return { ok: false, error: 'Step-up verification required' };
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

export async function adminTimeSeries({ actor, days = 14 }) {
  if (!useMocks) {
    const result = await gql('AdminTimeSeries', { days });
    return Array.isArray(result?.revenue) ? result : null;
  }
  if (!can(actor?.role, 'admin:read')) return null;
  await sleep(100);
  const span = [7, 14, 30].includes(Number(days)) ? Number(days) : 14;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (span - 1));
  const dayIndex = (iso) => {
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    return Math.floor((d.getTime() - start.getTime()) / 86400000);
  };
  const zeros = () => Array.from({ length: span }, () => 0);
  const series = { days: span, start: start.toISOString(), rides: zeros(), bookings: zeros(), revenue: zeros(), newUsers: zeros() };
  db.rides.forEach((r) => {
    const i = dayIndex(r.created_at);
    if (i >= 0 && i < span) series.rides[i] += 1;
  });
  db.reservations.forEach((r) => {
    const i = dayIndex(r.booked_at);
    if (i >= 0 && i < span) series.bookings[i] += 1;
  });
  db.payments.forEach((p) => {
    if (p.status !== 'succeeded') return;
    const i = dayIndex(p.paid_at);
    if (i >= 0 && i < span) series.revenue[i] += p.amount;
  });
  db.users.forEach((u) => {
    const i = dayIndex(u.created_at);
    if (i >= 0 && i < span) series.newUsers[i] += 1;
  });
  return series;
}

export async function adminPaymentsSummary({ actor }) {
  if (!useMocks) {
    const result = await gql('AdminPaymentsSummary');
    return result?.revenue7d != null ? result : null;
  }
  if (!can(actor?.role, 'admin:read')) return null;
  await sleep(80);
  const weekAgo = Date.now() - 7 * 86400000;
  const succeeded = db.payments.filter((p) => p.status === 'succeeded');
  const refunded = db.payments.filter((p) => p.status === 'refunded');
  return {
    succeededCount: succeeded.length,
    succeededSum: succeeded.reduce((a, p) => a + p.amount, 0),
    revenue7d: succeeded
      .filter((p) => new Date(p.paid_at).getTime() >= weekAgo)
      .reduce((a, p) => a + p.amount, 0),
    failedCount: db.payments.filter((p) => p.status === 'failed').length,
    flaggedCount: db.payments.filter((p) => p.flagged).length,
    refundedCount: refunded.length,
    refundedSum: refunded.reduce((a, p) => a + (p.refunded_amount || 0), 0),
    driverFees: succeeded.reduce((a, p) => a + (p.driver_fee ?? 1.5), 0),
    platformFees: succeeded.reduce((a, p) => a + (p.platform_fee ?? 1.5), 0),
  };
}

export async function adminDriverPayouts({ actor, limit = 50 }) {
  if (!useMocks) return gqlList('AdminDriverPayouts', { limit });
  if (!can(actor?.role, 'admin:read')) return [];
  await sleep(100);
  const byDriver = new Map();
  db.payments
    .filter((p) => p.status === 'succeeded' && p.reservation_id)
    .forEach((p) => {
      const res = db.reservations.find((r) => r.id === p.reservation_id);
      const ride = res && db.rides.find((r) => r.id === res.ride_id);
      const driver = ride && db.drivers.find((d) => d.id === ride.driver_id);
      if (!driver) return;
      const row = byDriver.get(driver.id) || {
        driver_id: driver.id,
        full_name: findUserById(driver.user_id)?.full_name ?? '—',
        payout_account: driver.payout_account ?? null,
        payments_count: 0,
        driver_fees: 0,
        platform_fees: 0,
        last_payment_at: null,
      };
      row.payments_count += 1;
      row.driver_fees += p.driver_fee ?? 1.5;
      row.platform_fees += p.platform_fee ?? 1.5;
      if (!row.last_payment_at || p.paid_at > row.last_payment_at) row.last_payment_at = p.paid_at;
      byDriver.set(driver.id, row);
    });
  return [...byDriver.values()]
    .sort((a, b) => b.driver_fees - a.driver_fees)
    .slice(0, limit);
}

export async function adminListUserDocuments({ actor, userId }) {
  if (!useMocks) return gqlList('AdminListUserDocuments', { userId });
  if (!can(actor?.role, 'admin:read')) return [];
  await sleep(60);
  return db.documents
    .filter((d) => d.user_id === userId)
    .sort((a, b) => (a.uploaded_at < b.uploaded_at ? 1 : -1));
}

// ─── Admin TOTP (step-up factor for impersonation) ──────────────────────────

export async function adminTotpStatus({ actor }) {
  if (!useMocks) {
    const result = await gql('AdminTotpStatus');
    return result?.enabled != null ? result : null;
  }
  if (!can(actor?.role, 'admin:read')) return null;
  await sleep(40);
  return { enabled: false, pending: false };
}

export async function adminSetupTotp({ actor }) {
  if (!useMocks) return gql('AdminSetupTotp');
  if (!can(actor?.role, 'admin:read')) return { ok: false, error: 'Forbidden' };
  await sleep(80);
  return { ok: false, error: 'Not available in mock mode' };
}

export async function adminActivateTotp({ actor, code }) {
  if (!useMocks) return gql('AdminActivateTotp', { code });
  if (!can(actor?.role, 'admin:read')) return { ok: false, error: 'Forbidden' };
  await sleep(80);
  return { ok: false, error: 'Not available in mock mode' };
}

export async function adminDisableTotp({ actor, code }) {
  if (!useMocks) return gql('AdminDisableTotp', { code });
  if (!can(actor?.role, 'admin:read')) return { ok: false, error: 'Forbidden' };
  await sleep(80);
  return { ok: false, error: 'Not available in mock mode' };
}

export async function adminListAudit({ actor, filters = {} }) {
  if (!useMocks) return gql('AdminListAudit', { filters });
  if (!can(actor?.role, 'admin:read')) return { total: 0, rows: [] };
  await sleep(80);
  return listAudit({ ...filters, limit: 200 });
}

export async function adminAuditCount({ actor }) {
  if (!useMocks) return gql('AdminAuditCount');
  if (!can(actor?.role, 'admin:read')) return 0;
  return totalAuditCount();
}
