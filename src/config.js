// Runtime config. Values come from EXPO_PUBLIC_* env vars, which Expo inlines
// into the JS bundle at build time. Restart Metro with `-c` after changing.

export const apiUrl =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const useMocks =
  (process.env.EXPO_PUBLIC_USE_MOCKS ?? 'false') === 'true';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

// Surfaced so screens can hide Supabase-dependent flows when the bundle was
// built without credentials (e.g. CI). The client is created lazily in
// src/lib/supabase.js and will throw if accessed without these values.
export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);
