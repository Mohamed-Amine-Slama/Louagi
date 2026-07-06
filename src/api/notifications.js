import { db } from './mockDb';
import { useMocks } from '../config';
import { gql, gqlList } from './graphql';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// List the current user's in-app notifications, newest first.
// Rows: { id, title, body, data, category, read, created_at }
export async function listNotifications({ actor, limit = 50 } = {}) {
  if (!actor?.id) return [];
  if (!useMocks) {
    return gqlList('ListNotifications', { limit });
  }
  await sleep(60);
  return db.notifications
    .filter((n) => n.user_id === actor.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

// Mark one notification (or all of the user's unread ones) as read.
export async function markNotificationRead({ actor, notificationId, all = false } = {}) {
  if (!actor?.id) return { ok: false, error: 'Not authenticated' };
  if (!useMocks) {
    const res = await gql('MarkNotificationRead', { notificationId, all });
    return res && res.ok ? res : { ok: false, error: res?.error || 'Failed to update notification' };
  }
  await sleep(40);
  if (all) {
    db.notifications.forEach((n) => {
      if (n.user_id === actor.id) n.read = true;
    });
    return { ok: true };
  }
  if (!notificationId) return { ok: false, error: 'notificationId required' };
  const target = db.notifications.find((n) => n.id === notificationId && n.user_id === actor.id);
  if (!target) return { ok: false, error: 'Not found' };
  target.read = true;
  return { ok: true };
}
