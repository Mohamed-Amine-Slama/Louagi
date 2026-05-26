// Legacy native fetch wrapper. Current real API calls use src/api/graphql.js.
//
// Contract: every helper resolves to the same envelope the mock API uses —
// `{ ok: true, ... }` on success, `{ ok: false, error }` on failure — so the
// screens consuming the API don't care whether the call hit a real server
// or the in-memory mock.
//
// Behavior:
//  - Injects `Authorization: Bearer <accessToken>` from tokenStore.
//  - 15s timeout per request (native fetch never times out otherwise).
//  - Network errors become `{ ok: false, error: 'Network unavailable' }`.
//  - On 401, refreshes the session once and retries — concurrent 401s share
//    a single in-flight refresh so we never stampede the auth server.

import { apiUrl } from '../config';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from '../security/tokenStore';

const TIMEOUT_MS = 15000;

let pendingRefresh = null;

async function refreshOnce() {
  if (pendingRefresh) return pendingRefresh;
  pendingRefresh = (async () => {
    const rt = getRefreshToken();
    if (!rt) {
      clearTokens();
      return false;
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(`${apiUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationName: 'Refresh',
          variables: { refreshToken: rt },
          query: 'query Refresh($input: JSON) { Refresh(input: $input) }',
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        clearTokens();
        return false;
      }
      const payload = await res.json().catch(() => null);
      const data = payload?.data?.Refresh;
      if (!data?.ok || !data.accessToken || !data.refreshToken) {
        clearTokens();
        return false;
      }
      setTokens({ access: data.accessToken, refresh: data.refreshToken });
      return true;
    } catch {
      // network/abort — leave tokens in place so the user can retry
      return false;
    } finally {
      pendingRefresh = null;
    }
  })();
  return pendingRefresh;
}

async function request(method, path, body, { retry = true } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers = { 'Content-Type': 'application/json' };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${apiUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted = err?.name === 'AbortError';
    return { ok: false, error: aborted ? 'Request timed out' : 'Network unavailable' };
  }
  clearTimeout(timer);

  if (res.status === 401 && retry) {
    const refreshed = await refreshOnce();
    if (refreshed) return request(method, path, body, { retry: false });
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response — fall through to status-based handling
  }

  if (!res.ok) {
    if (data && data.ok === false) return data;
    return { ok: false, error: data?.error || `HTTP ${res.status}` };
  }
  return data ?? { ok: true };
}

export const httpGet = (path) => request('GET', path);
export const httpPost = (path, body) => request('POST', path, body);
export const httpPatch = (path, body) => request('PATCH', path, body);
export const httpDelete = (path) => request('DELETE', path);
