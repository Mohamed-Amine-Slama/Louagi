import { db, findRideById, findRouteById, findDriverById, findUserById, newId } from './mockDb';
import { acquireSeatLock, releaseSeatLock } from '../security/seatLock';
import { appendAudit } from '../security/audit';
import { randomBytesHex } from '../security/crypto';
import { can } from '../security/rbac';
import { useMocks } from '../config';
import { pushLocalNotification } from '../services/notifications.service';
import { gql, gqlList } from './graphql';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Payment gateway stub. The real flow proxies a Konnect/Flouci tokenized call;
// here we simulate latency + a deterministic success path with a small failure
// rate to exercise the rollback path the docs spec out.
async function callPaymentGateway({ amount, method }) {
  await sleep(450);
  if (method === 'cash') return { ok: true, reference: 'CASH-' + randomBytesHex(6) };
  // Simulated decline (~5%)
  if (Math.random() < 0.05) return { ok: false, code: 'DECLINED' };
  return { ok: true, reference: 'PAY-' + randomBytesHex(8).toUpperCase() };
}

export async function createReservation({ actor, rideId, seats, paymentMethod = 'card', idempotencyKey }) {
  if (!useMocks) return gql('CreateReservation', { rideId, seats, paymentMethod, idempotencyKey });
  if (!can(actor?.role, 'rides:book')) return { ok: false, error: 'Forbidden' };
  if (!idempotencyKey) idempotencyKey = randomBytesHex(10);

  // Idempotency replay protection
  const replay = db.reservations.find(
    (r) => r._idempotency === idempotencyKey && r.user_id === actor.id
  );
  if (replay) return { ok: true, reservation: replay, replay: true };

  const ride = findRideById(rideId);
  if (!ride) return { ok: false, error: 'Ride not found' };
  if (ride.status !== 'scheduled') return { ok: false, error: 'Ride no longer accepting bookings' };
  if (ride.available_seats < seats) return { ok: false, error: 'Not enough seats' };

  // 1. Acquire atomic seat lock (10-min TTL)
  const lock = acquireSeatLock({
    rideId,
    userId: actor.id,
    seats,
    idempotencyKey,
  });
  if (!lock.ok) return { ok: false, error: 'Another booking is in progress' };

  // 2. Create pending reservation
  const PLATFORM_FEE = 1.5;
  const DRIVER_FEE = 1.5;
  const seatCost = ride.price_per_seat * seats;
  const total = seatCost + PLATFORM_FEE + DRIVER_FEE;
  const reservation = {
    id: newId(),
    user_id: actor.id,
    ride_id: rideId,
    seats_booked: seats,
    total_price: total,
    status: 'pending',
    booked_at: new Date().toISOString(),
    cancelled_at: null,
    _idempotency: idempotencyKey,
  };
  db.reservations.push(reservation);

  // 3. Call payment gateway
  const gw = await callPaymentGateway({ amount: total, method: paymentMethod });

  // 4. On failure: rollback reservation, release lock, audit
  if (!gw.ok) {
    reservation.status = 'cancelled';
    reservation.cancelled_at = new Date().toISOString();
    releaseSeatLock(rideId, actor.id);
    appendAudit({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'reservation.payment_failed',
      targetEntity: 'reservation',
      targetId: reservation.id,
      metadata: { code: gw.code },
    });
    return { ok: false, error: 'Payment failed. No charge made.' };
  }

  // 5. On success: confirm reservation, decrement seats, record payment, audit
  reservation.status = 'confirmed';
  ride.available_seats -= seats;
  const payment = {
    id: newId(),
    reservation_id: reservation.id,
    method: paymentMethod,
    amount: total,
    platform_fee: PLATFORM_FEE,
    driver_fee: DRIVER_FEE,
    status: 'succeeded',
    paid_at: new Date().toISOString(),
    gateway_reference: gw.reference,
  };
  db.payments.push(payment);
  releaseSeatLock(rideId, actor.id);

  // Driver notification
  const ridePtr = findRideById(rideId);
  const driver = findDriverById(ridePtr.driver_id);
  if (driver) {
    db.notifications.push({
      id: newId(),
      user_id: driver.user_id,
      title: 'New booking',
      body: `${seats} seat${seats > 1 ? 's' : ''} reserved on your ride.`,
      created_at: new Date().toISOString(),
      read: false,
    });
  }

  // Push local notification to the passenger
  pushLocalNotification({
    title: 'Booking Confirmed!',
    body: `You booked ${seats} seat${seats > 1 ? 's' : ''} to ${ridePtr?.route?.destination_city || 'your destination'}.`,
    data: { screen: 'Dashboard' },
  });

  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'reservation.confirmed',
    targetEntity: 'reservation',
    targetId: reservation.id,
    metadata: { amount: total, gateway: gw.reference },
  });

  return { ok: true, reservation, payment };
}

export async function listReservations({ actor, status }) {
  if (!useMocks) return gqlList('ListReservations', { status });
  await sleep(80);
  if (!actor) return [];
  return db.reservations
    .filter((r) => r.user_id === actor.id)
    .filter((r) => (status ? r.status === status : true))
    .map((res) => {
      const ride = findRideById(res.ride_id);
      const route = ride ? findRouteById(ride.route_id) : null;
      const driver = ride ? findDriverById(ride.driver_id) : null;
      const driverUser = driver ? findUserById(driver.user_id) : null;
      const payment = db.payments.find((p) => p.reservation_id === res.id);
      return { reservation: res, ride, route, driver, driverUser, payment };
    })
    .sort((a, b) => new Date(b.reservation.booked_at) - new Date(a.reservation.booked_at));
}

export async function getReservation({ actor, id }) {
  if (!useMocks) {
    const result = await gql('GetReservation', { id });
    return result?.reservation ? result : null;
  }
  await sleep(60);
  const res = db.reservations.find((r) => r.id === id);
  if (!res) return null;
  if (res.user_id !== actor.id && actor.role !== 'admin') return null;
  const ride = findRideById(res.ride_id);
  const route = ride ? findRouteById(ride.route_id) : null;
  const driver = ride ? findDriverById(ride.driver_id) : null;
  const driverUser = driver ? findUserById(driver.user_id) : null;
  const payment = db.payments.find((p) => p.reservation_id === res.id);
  return { reservation: res, ride, route, driver, driverUser, payment };
}

export async function cancelReservation({ actor, id }) {
  if (!useMocks) return gql('CancelReservation', { id });
  await sleep(120);
  const res = db.reservations.find((r) => r.id === id);
  if (!res) return { ok: false, error: 'Not found' };
  if (res.user_id !== actor.id && actor.role !== 'admin') return { ok: false, error: 'Forbidden' };
  if (res.status !== 'confirmed') return { ok: false, error: 'Already cancelled' };

  const ride = findRideById(res.ride_id);
  // Cancel-policy: passenger must cancel ≥ 2 hours before departure (admin can bypass)
  if (actor.role !== 'admin') {
    const minsLeft = (new Date(ride.departure_time).getTime() - Date.now()) / 60000;
    if (minsLeft < 120) return { ok: false, error: 'Too close to departure to cancel' };
  }

  res.status = 'cancelled';
  res.cancelled_at = new Date().toISOString();
  if (ride) ride.available_seats += res.seats_booked;
  const pay = db.payments.find((p) => p.reservation_id === res.id);
  if (pay && pay.status === 'succeeded') {
    pay.status = 'refunded';
    pay.refunded_at = new Date().toISOString();
    pay.refunded_amount = pay.amount - (pay.platform_fee || 0) - (pay.driver_fee || 0);
  }
  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'reservation.cancelled',
    targetEntity: 'reservation',
    targetId: res.id,
  });
  return { ok: true, reservation: res };
}
