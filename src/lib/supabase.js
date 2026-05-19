// Shared Supabase client for the React Native app.
//
// - Uses the publishable (anon) key — never the service-role key — so it's
//   safe to ship in the bundle. RLS policies in supabase/migrations enforce
//   what each authenticated role can read or write.
// - Persists the session via expo-secure-store so refresh tokens survive an
//   app cold-start without leaking to AsyncStorage / localStorage.
// - `react-native-url-polyfill/auto` is imported once at app startup
//   (see index.js) so supabase-js's URL parsing works on Hermes.

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

import { supabaseUrl, supabaseKey, supabaseConfigured } from '../config';

// Bridge expo-secure-store into the Storage interface supabase-js expects.
const secureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

let _client = null;

export function getSupabase() {
  if (!supabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY in your .env, then restart Metro with `npx expo start -c`.'
    );
  }
  if (_client) return _client;
  _client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: secureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      // RN has no URL bar — disable URL-based session detection.
      detectSessionInUrl: false,
    },
  });
  return _client;
}
