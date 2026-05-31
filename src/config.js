// Runtime config. Values come from EXPO_PUBLIC_* env vars, which Expo inlines
// into the JS bundle at build time. Restart Metro with `-c` after changing.
//
// API_URL auto-detection: In development, the app automatically discovers the
// dev server's IP from Expo Constants (the same host Metro uses). This means
// you NEVER need to update .env when your network / IP changes.
// Set EXPO_PUBLIC_API_URL explicitly only for production or custom setups.

import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Derive the API base URL without hardcoding a LAN IP.
 *
 * Priority:
 *   1. EXPO_PUBLIC_API_URL env var (explicit override — use for production).
 *   2. Expo debugger host IP (auto-detected in dev — works on any network).
 *   3. localhost fallback (web or CI).
 */
function resolveApiUrl() {
  // 1. Explicit CDN override
  const cdnUrl = process.env.EXPO_PUBLIC_CDN_URL;
  if (cdnUrl) return cdnUrl;

  // 2. Explicit API override
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit;

  // 2. In development on a physical device / emulator, Expo knows the host
  //    machine IP because that's where Metro is running.
  if (__DEV__) {
    // expo-constants exposes the debugger host as "IP:PORT"
    const debuggerHost =
      Constants.expoConfig?.hostUri ??      // SDK 49+
      Constants.manifest2?.extra?.expoGo?.debuggerHost ??  // Expo Go
      Constants.manifest?.debuggerHost;      // classic manifests

    if (debuggerHost) {
      // debuggerHost is "192.168.x.x:8081" — strip the Metro port, use our
      // server port instead.
      const ip = debuggerHost.split(':')[0];
      if (ip) return `http://${ip}:3000`;
    }

    // Android emulator: 10.0.2.2 maps to the host machine's localhost
    if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  }

  // 3. Web or CI fallback
  return 'http://localhost:3000';
}

export const apiUrl = resolveApiUrl();

export const useMocks =
  (process.env.EXPO_PUBLIC_USE_MOCKS ?? 'false') === 'true';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

// Surfaced so screens can hide Supabase-dependent flows when the bundle was
// built without credentials (e.g. CI). The client is created lazily in
// src/lib/supabase.js and will throw if accessed without these values.
export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);
