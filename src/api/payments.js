import { db, findReservationById, findUserById } from './mockDb';
import { useMocks } from '../config';
import { gql, gqlList } from './graphql';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function listPayments({ actor }) {
  if (!useMocks) return gqlList('ListPayments');
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
