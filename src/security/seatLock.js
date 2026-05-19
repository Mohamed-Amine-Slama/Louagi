// Atomic seat-lock simulation. Spec calls for a Redis lock with 10-min TTL.
const locks = new Map(); // key: `${rideId}` -> { userId, seats, expiresAt, idempotencyKey }

const LOCK_TTL_MS = 10 * 60 * 1000;

export function acquireSeatLock({ rideId, userId, seats, idempotencyKey }) {
  const now = Date.now();
  const existing = locks.get(rideId);
  if (existing && existing.expiresAt > now) {
    if (existing.userId === userId && existing.idempotencyKey === idempotencyKey) {
      return { ok: true, lock: existing, replay: true };
    }
    return { ok: false, reason: 'LOCKED_BY_OTHER', expiresAt: existing.expiresAt };
  }
  const lock = {
    rideId,
    userId,
    seats,
    idempotencyKey,
    acquiredAt: now,
    expiresAt: now + LOCK_TTL_MS,
  };
  locks.set(rideId, lock);
  return { ok: true, lock, replay: false };
}

export function releaseSeatLock(rideId, userId) {
  const existing = locks.get(rideId);
  if (!existing) return false;
  if (existing.userId !== userId) return false;
  locks.delete(rideId);
  return true;
}

export function peekSeatLock(rideId) {
  const lock = locks.get(rideId);
  if (!lock) return null;
  if (lock.expiresAt < Date.now()) {
    locks.delete(rideId);
    return null;
  }
  return lock;
}
