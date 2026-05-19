import { db, findReservationById, findUserById } from './mockDb';
import { appendAudit } from '../security/audit';
import { can } from '../security/rbac';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function listPayments({ actor }) {
  await sleep(80);
  if (!actor) return [];
  if (actor.role === 'admin') return db.payments.slice().reverse();
  return db.payments
    .filter((p) => {
      const res = findReservationById(p.reservation_id);
      return res && res.user_id === actor.id;
    })
    .reverse();
}

export async function adminRefund({ actor, paymentId, amount }) {
  if (!can(actor?.role, 'admin:refund')) return { ok: false, error: 'Forbidden' };
  await sleep(180);
  const pay = db.payments.find((p) => p.id === paymentId);
  if (!pay) return { ok: false, error: 'Not found' };
  if (pay.status === 'refunded') return { ok: false, error: 'Already refunded' };
  if (amount > pay.amount) return { ok: false, error: 'Amount exceeds payment' };
  if (amount <= 0) return { ok: false, error: 'Invalid amount' };
  const partial = amount < pay.amount;
  pay.status = 'refunded';
  pay.refunded_at = new Date().toISOString();
  pay.refunded_amount = amount;
  pay.refund_type = partial ? 'partial' : 'full';
  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: partial ? 'payment.refund.partial' : 'payment.refund.full',
    targetEntity: 'payment',
    targetId: pay.id,
    metadata: { amount, original: pay.amount },
  });
  return { ok: true, payment: pay };
}

export async function adminFlagPayment({ actor, paymentId, reason }) {
  if (!can(actor?.role, 'admin:read')) return { ok: false, error: 'Forbidden' };
  await sleep(80);
  const pay = db.payments.find((p) => p.id === paymentId);
  if (!pay) return { ok: false, error: 'Not found' };
  pay.flagged = true;
  pay.flag_reason = reason || 'flagged by admin';
  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'payment.flagged',
    targetEntity: 'payment',
    targetId: pay.id,
    metadata: { reason },
  });
  return { ok: true, payment: pay };
}
