// Real-time package tracking.
//
//  - Drivers push their GPS fix with updateDriverLocation (throttled to ~5s by
//    the caller — see DriverLocationContext).
//  - Passengers read the driver's live position with getDeliveryTracking, which
//    the server only returns while the ride is in_progress and the fix is fresh.
//
// Both follow the app's useMocks convention so the UI works offline.

import { gql } from './graphql';
import { useMocks } from '../config';

export async function updateDriverLocation({ latitude, longitude, heading, speed, accuracy }) {
  if (!useMocks) {
    return gql('UpdateDriverLocation', { latitude, longitude, heading, speed, accuracy });
  }
  return { ok: true };
}

// Offline/mock fix: a driver creeping along Tunis → Sousse, advancing a little
// on every poll so the marker visibly moves without a backend.
let _mockStep = 0;
export async function getDeliveryTracking({ deliveryId }) {
  if (!useMocks) return gql('GetDeliveryTracking', { deliveryId });

  _mockStep = (_mockStep + 1) % 100;
  const t = _mockStep / 100;
  const latitude = 36.8065 + (35.8254 - 36.8065) * t;
  const longitude = 10.1815 + (10.636 - 10.1815) * t;
  return {
    trackable: true,
    reason: 'live',
    deliveryStatus: 'picked_up',
    rideStatus: 'in_progress',
    driver: { name: 'Sample Driver', vehicle: 'Peugeot Boxer', plate_masked: '•• 182', rating: 4.8 },
    route: { origin_city: 'Tunis', destination_city: 'Sousse', distance_km: 140, estimated_duration_min: 120 },
    location: { latitude, longitude, heading: 160, speed: 22, updatedAt: new Date().toISOString() },
  };
}
