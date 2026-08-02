// Client security context sent with every API request as the
// x-client-context header and recorded server-side in the admin audit trail
// (see server/src/lib/clientContext.js for the accepting parser).
//
// Everything here is best-effort: failures produce a partial context or null
// and must never delay or break an API call. GPS is the cached last-known
// fix — no active fix is requested and no permission prompt is ever shown;
// users who haven't granted location are covered by server-side IP geo.

import { Dimensions, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import * as Localization from 'expo-localization';
import Constants from 'expo-constants';

import { getSecure, setSecure } from '../security/secureStorage';

const INSTALL_ID_KEY = 'louagi.install_id';
const GPS_CACHE_MS = 60 * 1000;

let cachedDevice = null;
let installIdPromise = null;
let gpsCache = { at: 0, value: null };

// Header values must be Latin-1; strip anything outside printable ASCII.
function ascii(value) {
  if (value == null) return null;
  const cleaned = String(value).replace(/[^\x20-\x7E]/g, '').trim();
  return cleaned || null;
}

function randomUuid() {
  const native = globalThis.crypto?.randomUUID?.();
  if (native) return native;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function installId() {
  if (!installIdPromise) {
    installIdPromise = (async () => {
      const existing = await getSecure(INSTALL_ID_KEY);
      if (typeof existing === 'string' && existing) return existing;
      const fresh = randomUuid();
      await setSecure(INSTALL_ID_KEY, fresh);
      return fresh;
    })().catch(() => null);
  }
  return installIdPromise;
}

async function deviceFingerprint() {
  if (cachedDevice) return cachedDevice;
  const { width, height } = Dimensions.get('window');
  cachedDevice = {
    id: await installId(),
    platform: Platform.OS,
    os: ascii(`${Device.osName ?? Platform.OS} ${Device.osVersion ?? Platform.Version ?? ''}`),
    model: ascii(Device.modelName),
    appVersion: ascii(Constants.expoConfig?.version),
    screen: `${Math.round(width)}x${Math.round(height)}`,
    locale: ascii(Localization.getLocales?.()[0]?.languageTag),
    tz: ascii(Intl.DateTimeFormat().resolvedOptions().timeZone),
  };
  return cachedDevice;
}

async function lastKnownGps() {
  const now = Date.now();
  if (now - gpsCache.at < GPS_CACHE_MS) return gpsCache.value;
  gpsCache = { at: now, value: null };
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (granted) {
      const pos = await Location.getLastKnownPositionAsync();
      if (pos?.coords) {
        gpsCache.value = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          acc: pos.coords.accuracy ?? null,
          at: new Date(pos.timestamp || now).toISOString(),
        };
      }
    }
  } catch {
    // Permission/provider hiccups leave gps null; never block the request.
  }
  return gpsCache.value;
}

export async function clientContextHeader() {
  try {
    const [device, gps] = await Promise.all([deviceFingerprint(), lastKnownGps()]);
    return JSON.stringify({ device, gps });
  } catch {
    return null;
  }
}
