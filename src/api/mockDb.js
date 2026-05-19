import { randomBytesHex, encryptField, decryptField, hashPassword } from '../security/crypto';

// Seed data mirrors the docs schema. PII fields are stored encrypted at rest.
const uuid = () => randomBytesHex(16);

export const db = {
  users: [],
  drivers: [],
  admins: [],
  routes: [],
  rides: [],
  reservations: [],
  payments: [],
  reviews: [],
  notifications: [],
  documents: [],
};

function seed() {
  if (db.users.length) return;

  // Seed IDs are deterministic so a saved auth session still resolves
  // against the seed after a JS bundle reload. Only freshly generated
  // (non-seed) records use random uuid()s.
  const passengerId = 'seed-user-passenger';
  const driverUserId = 'seed-user-driver';
  const driverId = 'seed-driver';
  const adminUserId = 'seed-user-admin';
  const adminId = 'seed-admin';

  db.users.push(
    {
      id: passengerId,
      full_name: 'Mariem Ben Salem',
      phone_number: encryptField('+21698765432'),
      email: 'mariem@example.tn',
      // password "Passenger1" — pre-hashed at runtime by the auth bootstrap below.
      password_hash: null,
      role: 'passenger',
      created_at: new Date().toISOString(),
      is_active: true,
    },
    {
      id: driverUserId,
      full_name: 'Khaled Trabelsi',
      phone_number: encryptField('+21622334455'),
      email: 'khaled@example.tn',
      password_hash: null,
      role: 'driver',
      created_at: new Date().toISOString(),
      is_active: true,
    },
    {
      id: adminUserId,
      full_name: 'Admin Ops',
      phone_number: encryptField('+21655000000'),
      email: 'ops@louagi.tn',
      password_hash: null,
      role: 'admin',
      created_at: new Date().toISOString(),
      is_active: true,
    }
  );

  db.drivers.push({
    id: driverId,
    user_id: driverUserId,
    plate_number: encryptField('123 TUN 4567'),
    id_card_number: encryptField('12345678'),
    license_number: encryptField('TN-DL-998877'),
    vehicle_brand: 'Peugeot',
    vehicle_model: '301',
    seat_count: 5,
    status: 'verified',
    verified_at: new Date().toISOString(),
    license_expires_at: new Date(Date.now() + 365 * 86400 * 1000).toISOString(),
    id_expires_at: new Date(Date.now() + 720 * 86400 * 1000).toISOString(),
    payout_account: 'KONNECT-XXXX-1234',
    rating: 4.8,
    trips_completed: 312,
  });

  db.admins.push({
    id: adminId,
    user_id: adminUserId,
    permissions: JSON.stringify(['*']),
  });

  const cities = [
    ['Tunis', 'Sfax', 270, 195, 22],
    ['Tunis', 'Sousse', 140, 110, 12],
    ['Tunis', 'Bizerte', 65, 60, 6],
    ['Sfax', 'Gabès', 135, 100, 11],
    ['Sousse', 'Monastir', 25, 30, 4],
    ['Tunis', 'Hammamet', 65, 55, 6],
    ['Tunis', 'Kairouan', 155, 130, 13],
    ['Sfax', 'Tunis', 270, 195, 22],
  ];
  cities.forEach(([o, d, km, mins, price]) => {
    db.routes.push({
      id: uuid(),
      origin_city: o,
      destination_city: d,
      distance_km: km,
      estimated_duration_min: mins,
      base_price: price,
    });
  });

  // Upcoming rides on the next 3 days, driven by Khaled.
  const baseRoute = db.routes[0]; // Tunis -> Sfax
  for (let i = 0; i < 4; i++) {
    const departure = new Date();
    departure.setHours(8 + i * 3, 30, 0, 0);
    departure.setDate(departure.getDate() + (i % 2));
    db.rides.push({
      id: uuid(),
      driver_id: driverId,
      route_id: baseRoute.id,
      departure_time: departure.toISOString(),
      available_seats: 4 - (i % 3),
      total_seats: 4,
      price_per_seat: 22 + (i % 2) * 2,
      status: 'scheduled',
      created_at: new Date().toISOString(),
    });
  }

  // Historical rides over the last 35 days so the driver dashboard's
  // earnings/occupancy/trip analytics aren't empty. Deterministic but varied:
  // mostly completed, a couple cancelled, route weighted toward Tunis<->Sfax.
  const histRoutes = [
    db.routes[0], // Tunis -> Sfax (most frequent)
    db.routes[0],
    db.routes[0],
    db.routes[1], // Tunis -> Sousse
    db.routes[1],
    db.routes[6], // Tunis -> Kairouan
  ];
  for (let d = 1; d <= 35; d++) {
    // Roughly every other day, plus a Friday cluster, plus skips
    if (d % 2 === 0 && d % 7 !== 3) continue;
    const route = histRoutes[d % histRoutes.length];
    const departure = new Date();
    departure.setDate(departure.getDate() - d);
    departure.setHours(7 + (d % 4) * 3, 0, 0, 0);
    const totalSeats = 4;
    // Deterministic occupancy that varies between 1 and 4 seats sold.
    const sold = 1 + ((d * 3) % totalSeats);
    const cancelled = d === 9 || d === 22; // a couple cancelled rides
    db.rides.push({
      id: uuid(),
      driver_id: driverId,
      route_id: route.id,
      departure_time: departure.toISOString(),
      available_seats: cancelled ? totalSeats : totalSeats - sold,
      total_seats: totalSeats,
      price_per_seat: route.base_price + (d % 3),
      status: cancelled ? 'cancelled' : 'completed',
      created_at: new Date(departure.getTime() - 86400 * 1000).toISOString(),
    });
  }

  db.notifications.push({
    id: uuid(),
    user_id: passengerId,
    title: 'Welcome to Louagi',
    body: 'Search a route to book your first seat.',
    created_at: new Date().toISOString(),
    read: false,
  });
}

seed();

// Bootstrap default passwords once on first use.
let bootstrapped = false;
export async function bootstrapPasswords() {
  if (bootstrapped) return;
  bootstrapped = true;
  for (const u of db.users) {
    if (u.password_hash) continue;
    if (u.role === 'passenger') u.password_hash = await hashPassword('Passenger1');
    else if (u.role === 'driver') u.password_hash = await hashPassword('Driver1234');
    else if (u.role === 'admin') u.password_hash = await hashPassword('AdminLou2026');
  }
}

export function findUserByPhone(phone) {
  return db.users.find((u) => decryptField(u.phone_number) === phone);
}

export function findUserById(id) {
  return db.users.find((u) => u.id === id);
}

export function findDriverByUserId(userId) {
  return db.drivers.find((d) => d.user_id === userId);
}

export function findDriverById(id) {
  return db.drivers.find((d) => d.id === id);
}

export function findRouteById(id) {
  return db.routes.find((r) => r.id === id);
}

export function findRideById(id) {
  return db.rides.find((r) => r.id === id);
}

export function findReservationById(id) {
  return db.reservations.find((r) => r.id === id);
}

export function newId() {
  return uuid();
}
