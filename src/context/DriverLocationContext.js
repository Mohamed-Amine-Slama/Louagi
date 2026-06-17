// Foreground live-location sharing for drivers.
//
// While a driver turns sharing on, we watch their GPS and push a fix to the
// backend (~every 5s). Reads are gated server-side (GetDeliveryTracking), so a
// fix is only ever revealed to a passenger tracking a parcel on this driver's
// in-progress ride. Foreground-only by design: the watcher pauses when the app
// is backgrounded and resumes when it returns to the foreground.

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';

import { trackingApi } from '../api';
import { useAuth } from './AuthContext';

const POST_INTERVAL_MS = 5000;

const DriverLocationCtx = createContext(null);

// expo-location reports -1 for heading/speed when unavailable — normalize away.
const clean = (n) => (typeof n === 'number' && n >= 0 ? n : null);

export function DriverLocationProvider({ children }) {
  const { user } = useAuth();
  const isDriver = user?.role === 'driver';

  const [sharing, setSharing] = useState(false);
  const [permission, setPermission] = useState('undetermined'); // granted | denied | undetermined
  const [lastFix, setLastFix] = useState(null); // { latitude, longitude, at }
  const [error, setError] = useState(null); // 'permission' | 'unavailable' | null

  const subRef = useRef(null);
  const sharingRef = useRef(false);
  const lastPostRef = useRef(0);

  const stopWatch = useCallback(() => {
    subRef.current?.remove?.();
    subRef.current = null;
  }, []);

  const pushFix = useCallback(async (coords, force = false) => {
    const now = Date.now();
    if (!force && now - lastPostRef.current < POST_INTERVAL_MS - 500) return; // throttle (iOS ignores timeInterval)
    lastPostRef.current = now;
    setLastFix({ latitude: coords.latitude, longitude: coords.longitude, at: now });
    await trackingApi.updateDriverLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      heading: clean(coords.heading),
      speed: clean(coords.speed),
      accuracy: clean(coords.accuracy),
    });
  }, []);

  const startWatch = useCallback(async () => {
    stopWatch();
    try {
      subRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: POST_INTERVAL_MS, distanceInterval: 20 },
        (pos) => { pushFix(pos.coords); }
      );
    } catch {
      setError('unavailable');
    }
  }, [pushFix, stopWatch]);

  const start = useCallback(async () => {
    setError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermission(status);
    if (status !== 'granted') {
      setError('permission');
      return false;
    }
    sharingRef.current = true;
    setSharing(true);
    // Seed an immediate fix so passengers see us right away.
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await pushFix(pos.coords, true);
    } catch {
      // watcher will deliver the first fix shortly
    }
    await startWatch();
    return true;
  }, [pushFix, startWatch]);

  const stop = useCallback(() => {
    sharingRef.current = false;
    setSharing(false);
    setLastFix(null);
    stopWatch();
  }, [stopWatch]);

  const toggle = useCallback(() => (sharingRef.current ? stop() : start()), [start, stop]);

  // Foreground-only: pause the watcher in the background, resume on return.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (!sharingRef.current) return;
      if (next === 'active') startWatch();
      else stopWatch();
    });
    return () => sub.remove();
  }, [startWatch, stopWatch]);

  // Stop on logout / role change, and clean up on unmount.
  useEffect(() => {
    if (!isDriver && sharingRef.current) stop();
    return () => stopWatch();
  }, [isDriver, stop, stopWatch]);

  const value = { sharing, permission, lastFix, error, start, stop, toggle, isDriver };
  return <DriverLocationCtx.Provider value={value}>{children}</DriverLocationCtx.Provider>;
}

export function useDriverLocation() {
  const v = useContext(DriverLocationCtx);
  if (!v) throw new Error('useDriverLocation must be used inside DriverLocationProvider');
  return v;
}
