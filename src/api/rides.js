import {
  db,
  findRideById,
  findRouteById,
  findDriverById,
  findDriverByUserId,
  findUserById,
  newId,
} from './mockDb';
import { appendAudit } from '../security/audit';
import { can } from '../security/rbac';
import { useMocks } from '../config';
import { gql, gqlList } from './graphql';
import { decryptField } from '../security/crypto';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function emptyAnalytics(period = 'week') {
  return {
    period,
    today: 0,
    week: 0,
    month: 0,
    history: [],
    historyStart: null,
    tripsThisPeriod: 0,
    tripsPrevPeriod: 0,
    seatsSold: 0,
    seatsPrev: 0,
    seatsCapacity: 0,
    seatsCapacityPrev: 0,
    occupancyPct: 0,
    occupancyPrevPct: 0,
    avgFare: 0,
    avgFarePrev: 0,
    earningsPrev: 0,
    cancelRatePct: 0,
    topRoute: null,
    rating: null,
    tripsCompleted: 0,
  };
}

function passengerContact(user) {
  if (!user) return null;
  return {
    id: user.id,
    full_name: user.full_name,
    role: user.role,
    phone_number: decryptField(user.phone_number),
  };
}

// Routes and cities are government reference data that changes ~never. Cache
// them in memory so repeat screen mounts skip the round-trip entirely (the
// server caches them for 24h; this saves the network hop too).
const REF_TTL_MS = 10 * 60 * 1000;
let routesCache = { at: 0, data: null };
let citiesCache = { at: 0, data: null };

export async function listRoutes() {
  if (!useMocks) {
    if (routesCache.data && Date.now() - routesCache.at < REF_TTL_MS) return routesCache.data;
    const rows = await gqlList('ListRoutes');
    if (rows.length) routesCache = { at: Date.now(), data: rows };
    return rows;
  }
  await sleep(80);
  return db.routes.slice();
}

export async function listCities() {
  if (!useMocks) {
    if (citiesCache.data && Date.now() - citiesCache.at < REF_TTL_MS) return citiesCache.data;
    const rows = await gqlList('ListCities');
    if (rows.length) citiesCache = { at: Date.now(), data: rows };
    return rows;
  }
  await sleep(40);
  return [...new Set(db.routes.flatMap((r) => [r.origin_city, r.destination_city]))].sort();
}

export async function searchRides({ origin, destination, date, seats = 1, filters = {}, sort = 'departure' }) {
  if (!useMocks) return gqlList('SearchRides', { origin, destination, date, seats, filters, sort });
  await sleep(180);
  const startOfDay = date ? new Date(date) : null;
  if (startOfDay) startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = startOfDay ? new Date(startOfDay.getTime() + 86400 * 1000) : null;

  let rows = db.rides
    .filter((r) => r.status === 'scheduled')
    .filter((r) => r.available_seats >= seats)
    .map((ride) => {
      const route = findRouteById(ride.route_id);
      const driver = findDriverById(ride.driver_id);
      const user = driver ? findUserById(driver.user_id) : null;
      return { ride, route, driver, user };
    })
    .filter(({ route }) => {
      if (origin && route.origin_city.toLowerCase() !== origin.toLowerCase()) return false;
      if (destination && route.destination_city.toLowerCase() !== destination.toLowerCase()) return false;
      return true;
    })
    .filter(({ ride }) => {
      if (!startOfDay) return true;
      const t = new Date(ride.departure_time).getTime();
      return t >= startOfDay.getTime() && t < endOfDay.getTime();
    });

  if (filters.priceMax) rows = rows.filter(({ ride }) => ride.price_per_seat <= filters.priceMax);
  if (filters.ratingMin) rows = rows.filter(({ driver }) => (driver?.rating ?? 0) >= filters.ratingMin);
  if (filters.departureBefore) {
    rows = rows.filter(
      ({ ride }) => new Date(ride.departure_time).getHours() <= filters.departureBefore
    );
  }
  if (sort === 'price') rows.sort((a, b) => a.ride.price_per_seat - b.ride.price_per_seat);
  else if (sort === 'rating') rows.sort((a, b) => (b.driver?.rating ?? 0) - (a.driver?.rating ?? 0));
  else rows.sort((a, b) => new Date(a.ride.departure_time) - new Date(b.ride.departure_time));

  return rows.map(({ ride, route, driver, user }) => ({
    id: ride.id,
    route,
    driver: driver
      ? {
          id: driver.id,
          full_name: user?.full_name ?? 'Driver',
          rating: driver.rating,
          trips_completed: driver.trips_completed,
          vehicle_brand: driver.vehicle_brand,
          vehicle_model: driver.vehicle_model,
          seat_count: driver.seat_count,
          status: driver.status,
        }
      : null,
    departure_time: ride.departure_time,
    available_seats: ride.available_seats,
    total_seats: ride.total_seats,
    price_per_seat: ride.price_per_seat,
    status: ride.status,
  }));
}

export async function getRideDetail(rideId) {
  if (!useMocks) {
    const result = await gql('GetRideDetail', { rideId });
    return result?.id ? result : null;
  }
  await sleep(80);
  const ride = findRideById(rideId);
  if (!ride) return null;
  const route = findRouteById(ride.route_id);
  const driver = findDriverById(ride.driver_id);
  const user = driver ? findUserById(driver.user_id) : null;
  return {
    id: ride.id,
    route,
    driver: driver
      ? {
          id: driver.id,
          full_name: user?.full_name ?? 'Driver',
          rating: driver.rating,
          trips_completed: driver.trips_completed,
          vehicle_brand: driver.vehicle_brand,
          vehicle_model: driver.vehicle_model,
          seat_count: driver.seat_count,
          status: driver.status,
        }
      : null,
    departure_time: ride.departure_time,
    available_seats: ride.available_seats,
    total_seats: ride.total_seats,
    price_per_seat: ride.price_per_seat,
    status: ride.status,
    accepts_delivery: ride.accepts_delivery ?? true,
    created_at: ride.created_at,
  };
}

export async function createRide({ actor, origin, destination, departureTime, availableSeats }) {
  if (!useMocks) return gql('CreateRide', { origin, destination, departureTime, availableSeats });
  await sleep(180);
  if (!can(actor?.role, 'rides:create')) return { ok: false, error: 'Forbidden' };
  const driver = findDriverByUserId(actor.id);
  if (!driver) return { ok: false, error: 'Driver record not found' };
  if (driver.status !== 'verified') return { ok: false, error: 'Driver not verified' };
  if (!origin || !destination) return { ok: false, error: 'Origin and destination required' };

  let route = db.routes.find(
    (r) => r.origin_city.toLowerCase() === origin.toLowerCase() && r.destination_city.toLowerCase() === destination.toLowerCase()
  );
  if (!route) {
    route = {
      id: newId(),
      origin_city: origin,
      destination_city: destination,
      distance_km: 150,
      base_price: 20,
    };
    db.routes.push(route);
  }
  const t = new Date(departureTime).getTime();
  if (!t || t < Date.now() + 30 * 60 * 1000) return { ok: false, error: 'Must depart 30+ min from now' };
  if (availableSeats < 1 || availableSeats > driver.seat_count) {
    return { ok: false, error: `Seats must be 1-${driver.seat_count}` };
  }
  // Government-set fare. Drivers do not pick the price — every ride on the
  // same route charges the same per-seat amount.
  const ride = {
    id: newId(),
    driver_id: driver.id,
    route_id: route.id,
    departure_time: new Date(departureTime).toISOString(),
    available_seats: availableSeats,
    total_seats: availableSeats,
    price_per_seat: route.base_price,
    status: 'scheduled',
    created_at: new Date().toISOString(),
  };
  db.rides.push(ride);
  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'ride.created',
    targetEntity: 'ride',
    targetId: ride.id,
  });
  return { ok: true, ride };
}

export async function updateRideStatus({ actor, rideId, status }) {
  if (!useMocks) return gql('UpdateRideStatus', { rideId, status });
  await sleep(120);
  const ride = findRideById(rideId);
  if (!ride) return { ok: false, error: 'Not found' };
  const driver = findDriverById(ride.driver_id);
  if (actor.role !== 'admin' && driver.user_id !== actor.id) {
    return { ok: false, error: 'Forbidden' };
  }
  if (!['scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) {
    return { ok: false, error: 'Invalid status' };
  }
  ride.status = status;
  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: `ride.status.${status}`,
    targetEntity: 'ride',
    targetId: ride.id,
  });
  return { ok: true, ride };
}

export async function cancelRide({ actor, rideId, reason }) {
  if (!useMocks) return gql('CancelRide', { rideId, reason });
  await sleep(160);
  const ride = findRideById(rideId);
  if (!ride) return { ok: false, error: 'Not found' };
  const driver = findDriverById(ride.driver_id);
  if (actor.role !== 'admin' && driver.user_id !== actor.id) {
    return { ok: false, error: 'Forbidden' };
  }
  if (ride.status === 'completed' || ride.status === 'in_progress') {
    return { ok: false, error: 'Cannot cancel a ride already in progress or completed' };
  }
  ride.status = 'cancelled';
  // Cancel all reservations and trigger refunds
  const affected = db.reservations.filter((r) => r.ride_id === rideId && r.status === 'confirmed');
  affected.forEach((res) => {
    res.status = 'cancelled';
    res.cancelled_at = new Date().toISOString();
    const pay = db.payments.find((p) => p.reservation_id === res.id);
    if (pay && pay.status === 'succeeded') {
      pay.status = 'refunded';
      pay.refunded_at = new Date().toISOString();
    }
  });
  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'ride.cancelled',
    targetEntity: 'ride',
    targetId: ride.id,
    metadata: { reason, affectedReservations: affected.length },
  });
  return { ok: true, cancelled: affected.length };
}

export async function driverRides({ actor, status }) {
  if (!useMocks) return gqlList('DriverRides', { status });
  await sleep(90);
  const driver = findDriverByUserId(actor.id);
  if (!driver) return [];
  return db.rides
    .filter((r) => r.driver_id === driver.id)
    .filter((r) => (status ? r.status === status : true))
    .map((ride) => ({
      ...ride,
      route: findRouteById(ride.route_id),
    }))
    .sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time));
}

export async function ridePassengers({ actor, rideId }) {
  if (!useMocks) return gqlList('RidePassengers', { rideId });
  await sleep(80);
  const ride = findRideById(rideId);
  if (!ride) return [];
  const driver = findDriverById(ride.driver_id);
  if (actor.role !== 'admin' && driver.user_id !== actor.id) return [];
  return db.reservations
    .filter((r) => r.ride_id === rideId)
    .map((res) => ({
      ...res,
      user: passengerContact(findUserById(res.user_id)),
    }));
}

export async function driverEarnings({ actor, period = 'week' } = {}) {
  if (!useMocks) {
    const result = await gql('DriverEarnings', { period });
    return result?.history ? result : emptyAnalytics(period);
  }
  await sleep(70);
  const driver = findDriverByUserId(actor.id);
  const empty = emptyAnalytics(period);
  if (!driver) return empty;

  const now = Date.now();
  const dayMs = 86400 * 1000;
  const bins = period === 'month' ? 30 : 7;
  const periodMs = bins * dayMs;
  const history = Array(bins).fill(0);

  // Anchor the history window to the start of "today" so day-of-week labels
  // line up cleanly with the bars.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayStartMs = startOfToday.getTime();
  const historyStartMs = todayStartMs - (bins - 1) * dayMs;

  let today = 0;
  let week = 0;
  let month = 0;
  let tripsThisPeriod = 0;
  let tripsPrevPeriod = 0;
  let seatsSold = 0;
  let seatsPrev = 0;
  let seatsCapacity = 0;
  let seatsCapacityPrev = 0;
  let earningsThis = 0;
  let earningsPrev = 0;
  let cancelledThis = 0;
  const routeRevenue = new Map();
  const routeCount = new Map();

  const myRides = db.rides.filter((r) => r.driver_id === driver.id);

  myRides.forEach((ride) => {
    const sold = Math.max(0, ride.total_seats - ride.available_seats);
    const revenue = sold * ride.price_per_seat;
    const t = new Date(ride.departure_time).getTime();
    const cancelled = ride.status === 'cancelled';
    const counted = !cancelled; // cancelled rides don't generate revenue or seat sales

    if (counted) {
      if (t > now - dayMs && t <= now) today += revenue;
      if (t > now - 7 * dayMs && t <= now) week += revenue;
      if (t > now - 30 * dayMs && t <= now) month += revenue;
    }

    // History bins for the active period (only past rides).
    if (counted && t >= historyStartMs && t < todayStartMs + dayMs) {
      const idx = Math.floor((t - historyStartMs) / dayMs);
      if (idx >= 0 && idx < bins) history[idx] += revenue;
    }

    // Current vs previous period for delta arrows. "Period" ends at the end
    // of today; previous period is the equivalent window before that.
    const endThis = todayStartMs + dayMs;
    const startThis = endThis - periodMs;
    const startPrev = startThis - periodMs;
    if (t >= startThis && t < endThis) {
      if (counted) {
        tripsThisPeriod += 1;
        seatsSold += sold;
        seatsCapacity += ride.total_seats;
        earningsThis += revenue;
        const r = findRouteById(ride.route_id);
        if (r) {
          const key = r.id;
          routeRevenue.set(key, (routeRevenue.get(key) || 0) + revenue);
          routeCount.set(key, (routeCount.get(key) || 0) + 1);
        }
      } else {
        cancelledThis += 1;
      }
    } else if (t >= startPrev && t < startThis) {
      if (counted) {
        tripsPrevPeriod += 1;
        seatsPrev += sold;
        seatsCapacityPrev += ride.total_seats;
        earningsPrev += revenue;
      }
    }
  });

  const occupancyPct = seatsCapacity > 0 ? Math.round((seatsSold / seatsCapacity) * 100) : 0;
  const occupancyPrevPct = seatsCapacityPrev > 0 ? Math.round((seatsPrev / seatsCapacityPrev) * 100) : 0;
  const avgFare = tripsThisPeriod > 0 ? earningsThis / tripsThisPeriod : 0;
  const avgFarePrev = tripsPrevPeriod > 0 ? earningsPrev / tripsPrevPeriod : 0;
  const totalThisWindow = tripsThisPeriod + cancelledThis;
  const cancelRatePct = totalThisWindow > 0 ? Math.round((cancelledThis / totalThisWindow) * 100) : 0;

  let topRoute = null;
  if (routeRevenue.size > 0) {
    const [topId] = [...routeRevenue.entries()].sort((a, b) => b[1] - a[1])[0];
    const r = findRouteById(topId);
    if (r) {
      topRoute = {
        route_id: r.id,
        origin_city: r.origin_city,
        destination_city: r.destination_city,
        count: routeCount.get(topId) || 0,
        revenue: routeRevenue.get(topId) || 0,
      };
    }
  }

  return {
    period,
    today,
    week,
    month,
    history,
    historyStart: new Date(historyStartMs).toISOString(),
    tripsThisPeriod,
    tripsPrevPeriod,
    seatsSold,
    seatsPrev,
    seatsCapacity,
    seatsCapacityPrev,
    occupancyPct,
    occupancyPrevPct,
    avgFare,
    avgFarePrev,
    earningsPrev,
    cancelRatePct,
    topRoute,
    rating: driver.rating ?? null,
    tripsCompleted: driver.trips_completed ?? 0,
  };
}

export async function adminListRides({ filters = {} } = {}) {
  if (!useMocks) return gqlList('AdminListRides', { filters });
  await sleep(120);
  let rows = db.rides.slice();
  if (filters.status) rows = rows.filter((r) => r.status === filters.status);
  if (filters.driverId) rows = rows.filter((r) => r.driver_id === filters.driverId);
  if (filters.routeId) rows = rows.filter((r) => r.route_id === filters.routeId);
  return rows.map((r) => ({
    ...r,
    route: findRouteById(r.route_id),
    driver: findDriverById(r.driver_id),
  }));
}
