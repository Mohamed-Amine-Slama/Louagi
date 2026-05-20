// Wraps expo-local-authentication with capability checks and credential
// storage. The "credential" is a long-lived biometric ticket issued by the
// auth API; we keep it in SecureStore alongside the linked user id so the
// LoginScreen can present a fingerprint-only sign-in path.
//
// The fingerprint prompt itself is the trust anchor — the ticket is only
// retrieved after authenticateAsync() resolves successful.

import { Platform } from 'react-native';
import { getSecure, setSecure, clearSecure } from './secureStorage';

let LocalAuth = null;
try {
  // eslint-disable-next-line global-require
  LocalAuth = require('expo-local-authentication');
} catch {
  LocalAuth = null;
}

const TICKET_KEY = 'louagi.biometric.ticket';
const USER_KEY = 'louagi.biometric.user';
const NAME_KEY = 'louagi.biometric.userName';

export const BIOMETRIC_KIND = {
  NONE: 'none',
  FINGERPRINT: 'fingerprint',
  FACE: 'face',
  IRIS: 'iris',
};

export async function getBiometricCapability() {
  if (Platform.OS === 'web' || !LocalAuth) {
    return { available: false, kind: BIOMETRIC_KIND.NONE, enrolled: false };
  }
  try {
    const hasHardware = await LocalAuth.hasHardwareAsync();
    if (!hasHardware) return { available: false, kind: BIOMETRIC_KIND.NONE, enrolled: false };
    const enrolled = await LocalAuth.isEnrolledAsync();
    const types = await LocalAuth.supportedAuthenticationTypesAsync();
    let kind = BIOMETRIC_KIND.FINGERPRINT;
    if (types.includes(LocalAuth.AuthenticationType.FACIAL_RECOGNITION)) kind = BIOMETRIC_KIND.FACE;
    else if (types.includes(LocalAuth.AuthenticationType.IRIS)) kind = BIOMETRIC_KIND.IRIS;
    else if (types.includes(LocalAuth.AuthenticationType.FINGERPRINT)) kind = BIOMETRIC_KIND.FINGERPRINT;
    return { available: hasHardware && enrolled, kind, enrolled };
  } catch {
    return { available: false, kind: BIOMETRIC_KIND.NONE, enrolled: false };
  }
}

export async function promptBiometric({ promptMessage, cancelLabel } = {}) {
  if (Platform.OS === 'web' || !LocalAuth) {
    return { success: false, error: 'unavailable' };
  }
  try {
    const res = await LocalAuth.authenticateAsync({
      promptMessage: promptMessage || 'Confirm your identity',
      cancelLabel: cancelLabel || 'Cancel',
      disableDeviceFallback: false,
    });
    if (res.success) return { success: true };
    return { success: false, error: res.error || res.warning || 'cancelled' };
  } catch (e) {
    return { success: false, error: e?.message || 'failed' };
  }
}

export async function saveBiometricCredential({ userId, userName, ticket }) {
  await setSecure(USER_KEY, userId);
  await setSecure(TICKET_KEY, ticket);
  if (userName) await setSecure(NAME_KEY, userName);
}

export async function readBiometricCredential() {
  const userId = await getSecure(USER_KEY);
  const ticket = await getSecure(TICKET_KEY);
  if (!userId || !ticket) return null;
  const userName = await getSecure(NAME_KEY);
  return { userId, userName: userName || null, ticket };
}

export async function clearBiometricCredential() {
  await Promise.all([clearSecure(USER_KEY), clearSecure(TICKET_KEY), clearSecure(NAME_KEY)]);
}

export async function hasBiometricCredential() {
  const c = await readBiometricCredential();
  return !!c;
}
