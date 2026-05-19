// In-memory token cache shared between the HTTP client and AuthContext.
// AuthContext is the source of truth for persistence (secure storage); this
// store mirrors the current pair so http.js can read tokens synchronously
// without a circular import on AuthContext. Subscribers are notified on every
// change so reactive refreshes inside http.js can flow back into React state.

let accessToken = null;
let refreshToken = null;
const listeners = new Set();

function notify() {
  for (const fn of listeners) {
    try {
      fn({ accessToken, refreshToken });
    } catch {
      // swallow listener errors — one bad subscriber shouldn't break others
    }
  }
}

export function setTokens({ access, refresh }) {
  accessToken = access ?? null;
  refreshToken = refresh ?? null;
  notify();
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  notify();
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
