// Static coordinates for Tunisian cities used by live parcel tracking — lets us
// drop a destination marker and estimate distance/ETA without any paid
// geocoding or Directions API. Keys mirror the city names used across the app
// (see CITY_CODES in lib/tickets.js), with accent-stripped fallback lookup.

const CITY_COORDS = {
  Tunis: { latitude: 36.8065, longitude: 10.1815 },
  Sfax: { latitude: 34.7406, longitude: 10.7603 },
  Sousse: { latitude: 35.8256, longitude: 10.6369 },
  Nabeul: { latitude: 36.4513, longitude: 10.7357 },
  Bizerte: { latitude: 37.2746, longitude: 9.8739 },
  'Gabès': { latitude: 33.8815, longitude: 10.0982 },
  Kairouan: { latitude: 35.6781, longitude: 10.0963 },
  Monastir: { latitude: 35.778, longitude: 10.8262 },
  Djerba: { latitude: 33.8076, longitude: 10.8451 },
  Tozeur: { latitude: 33.9197, longitude: 8.1335 },
  Gafsa: { latitude: 34.425, longitude: 8.7842 },
  Kasserine: { latitude: 35.1676, longitude: 8.8365 },
  'Médenine': { latitude: 33.3399, longitude: 10.4917 },
  Tataouine: { latitude: 32.9297, longitude: 10.4518 },
  'Béja': { latitude: 36.7256, longitude: 9.1817 },
  Jendouba: { latitude: 36.5011, longitude: 8.7803 },
  'Le Kef': { latitude: 36.1742, longitude: 8.7049 },
  Mahdia: { latitude: 35.5047, longitude: 11.0622 },
  'Sidi Bouzid': { latitude: 35.0382, longitude: 9.4849 },
  Siliana: { latitude: 36.0849, longitude: 9.3708 },
  Zaghouan: { latitude: 36.4029, longitude: 10.1429 },
  Manouba: { latitude: 36.8101, longitude: 10.0956 },
  Ariana: { latitude: 36.8625, longitude: 10.1956 },
  'Ben Arous': { latitude: 36.7533, longitude: 10.2282 },
  'Kébili': { latitude: 33.705, longitude: 8.969 },
  Hammamet: { latitude: 36.4, longitude: 10.6167 },
  Zarzis: { latitude: 33.5039, longitude: 11.1122 },
  Douz: { latitude: 33.4569, longitude: 9.0203 },
};

// Tunisia centroid — a sensible default map focus before we have a fix.
export const TUNISIA_CENTER = { latitude: 34.5, longitude: 9.5 };

function strip(s = '') {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const NORMALIZED = Object.entries(CITY_COORDS).reduce((acc, [name, c]) => {
  acc[strip(name)] = c;
  return acc;
}, {});

export function cityCoords(name) {
  if (!name) return null;
  return CITY_COORDS[name] || NORMALIZED[strip(name)] || null;
}

const R_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

// Great-circle distance in km between two {latitude, longitude} points.
export function haversineKm(a, b) {
  if (!a || !b) return null;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Naive ETA in minutes: take the route's own average speed (distance/duration)
// and apply it to the straight-line distance still to go. Intentionally rough —
// no Directions API. Returns null when it can't be estimated.
export function etaMinutes(from, dest, route) {
  const remainingKm = haversineKm(from, dest);
  if (remainingKm == null) return null;
  let kmPerMin = 70 / 60; // fallback ≈ 70 km/h
  if (route?.distance_km > 0 && route?.estimated_duration_min > 0) {
    kmPerMin = route.distance_km / route.estimated_duration_min;
  }
  if (kmPerMin <= 0) return null;
  return Math.max(1, Math.round(remainingKm / kmPerMin));
}
