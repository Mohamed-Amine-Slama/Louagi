import { randomBytesHex } from './crypto';

// Immutable in-memory audit log. The spec calls for a DB table with no
// UPDATE/DELETE grants — this module only exposes append() and list(); there
// is no remove() by design.
const entries = [];

export function appendAudit({ actorId, actorRole, action, targetEntity, targetId, ip, metadata }) {
  const entry = Object.freeze({
    id: randomBytesHex(12),
    actor_id: actorId ?? null,
    actor_role: actorRole ?? 'anonymous',
    action_type: action,
    target_entity: targetEntity ?? null,
    target_id: targetId ?? null,
    ip_address: ip ?? '127.0.0.1',
    created_at: new Date().toISOString(),
    metadata: metadata ? Object.freeze({ ...metadata }) : null,
  });
  entries.push(entry);
  return entry;
}

export function listAudit({ actorId, actionType, from, to, limit = 100, offset = 0 } = {}) {
  let rows = entries.slice();
  if (actorId) rows = rows.filter((r) => r.actor_id === actorId);
  if (actionType) rows = rows.filter((r) => r.action_type === actionType);
  if (from) rows = rows.filter((r) => r.created_at >= from);
  if (to) rows = rows.filter((r) => r.created_at <= to);
  rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return { total: rows.length, rows: rows.slice(offset, offset + limit) };
}

export function totalAuditCount() {
  return entries.length;
}
