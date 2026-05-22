import { randomBytesHex, decryptField } from '../security/crypto';

// In-memory dev store for the mock auth/data layer. Backend mode is the
// default; demo credentials and catalogue data live in supabase/seed.sql so
// they do not ship in the React Native bundle.
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
  // Intentionally empty.
}

seed();

export async function bootstrapPasswords() {
  // intentionally empty
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
