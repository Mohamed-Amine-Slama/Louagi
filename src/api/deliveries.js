import { db, findRideById, findRouteById, findUserById, newId, findDriverByUserId } from './mockDb';
import { useMocks } from '../config';
import { gql, gqlList } from './graphql';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function listAvailableDeliveryRides({ origin, destination }) {
  if (!useMocks) return gqlList('AvailableDeliveryRides', { origin, destination });
  await sleep(100);
  return db.rides
    .filter((r) => r.status === 'scheduled')
    .map((r) => {
      const route = findRouteById(r.route_id);
      return { ...r, route, accepts_delivery: true, max_delivery_slots: 3, delivery_slots_taken: 0 };
    })
    .filter((r) => {
      if (origin && r.route?.origin_city.toLowerCase() !== origin.toLowerCase()) return false;
      if (destination && r.route?.destination_city.toLowerCase() !== destination.toLowerCase()) return false;
      return true;
    });
}

export async function listMyDeliveries({ actor }) {
  if (!useMocks) return gqlList('MyDeliveries', {});
  await sleep(80);
  if (!actor) return [];
  return (db.deliveries || [])
    .filter((d) => d.user_id === actor.id)
    .map((d) => {
      const ride = findRideById(d.ride_id);
      const route = ride ? findRouteById(ride.route_id) : null;
      return {
        ...d,
        ride: {
          departure_time: ride?.departure_time,
          origin_city: route?.origin_city,
          destination_city: route?.destination_city,
        },
      };
    })
    .sort((a, b) => new Date(b.booked_at) - new Date(a.booked_at));
}

export async function listRideDeliveries({ actor, rideId }) {
  if (!useMocks) return gqlList('RideDeliveries', { rideId });
  await sleep(80);
  const driver = actor ? findDriverByUserId(actor.id) : null;
  return (db.deliveries || [])
    .filter((d) => {
      if (rideId) return d.ride_id === rideId;
      if (!driver) return false;
      const ride = findRideById(d.ride_id);
      return ride?.driver_id === driver.id;
    })
    .map((d) => {
      const user = findUserById(d.user_id);
      return {
        ...d,
        user: {
          full_name: user?.full_name,
          phone_number: user?.phone_number,
        },
      };
    });
}

export async function createDelivery({ actor, rideId, description }) {
  if (!useMocks) return gql('CreateDelivery', { rideId, description });
  await sleep(200);
  if (!db.deliveries) db.deliveries = [];
  
  const price = 10;
  const driver_fee = 8;
  const platform_fee = 2;
  const label = 'Standard Delivery';

  const delivery = {
    id: newId(),
    user_id: actor.id,
    ride_id: rideId,
    severity_label: label,
    item_description: description || null,
    price,
    driver_fee,
    platform_fee,
    status: 'pending',
    booked_at: new Date().toISOString(),
    cancelled_at: null,
  };
  db.deliveries.push(delivery);
  return { ok: true, delivery };
}

export async function updateDeliveryStatus({ actor, id, status }) {
  if (!useMocks) return gql('UpdateDeliveryStatus', { id, status });
  await sleep(100);
  const del = (db.deliveries || []).find((d) => d.id === id);
  if (!del) return { ok: false, error: 'Not found' };
  del.status = status;
  return { ok: true, delivery: del };
}

export async function cancelDelivery({ actor, id }) {
  if (!useMocks) return gql('CancelDelivery', { id });
  await sleep(100);
  const del = (db.deliveries || []).find((d) => d.id === id);
  if (!del) return { ok: false, error: 'Not found' };
  del.status = 'cancelled';
  del.cancelled_at = new Date().toISOString();
  return { ok: true };
}
