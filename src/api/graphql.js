import { apiUrl } from '../config';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '../security/tokenStore';

const TIMEOUT_MS = 15000;

let pendingRefresh = null;

function buildQuery(operationName) {
  return `query ${operationName}($input: JSON) { ${operationName}(input: $input) }`;
}

async function postGraphql(operationName, variables, token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${apiUrl}/graphql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        operationName,
        variables: variables || {},
        query: buildQuery(operationName),
      }),
      signal: controller.signal,
    });
    const payload = await res.json().catch(() => null);
    return { res, payload };
  } finally {
    clearTimeout(timer);
  }
}

async function refreshOnce() {
  if (pendingRefresh) return pendingRefresh;
  pendingRefresh = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return false;
    }

    try {
      const { res, payload } = await postGraphql('Refresh', { refreshToken }, null);
      const data = payload?.data?.Refresh;
      if (!res.ok || !data?.ok || !data.accessToken || !data.refreshToken) {
        clearTokens();
        return false;
      }
      setTokens({ access: data.accessToken, refresh: data.refreshToken });
      return true;
    } catch {
      return false;
    } finally {
      pendingRefresh = null;
    }
  })();
  return pendingRefresh;
}

async function gqlOnce(operationName, variables, { retry = true } = {}) {
  try {
    const { res, payload } = await postGraphql(operationName, variables, getAccessToken());

    if (res.status === 401 && retry) {
      const refreshed = await refreshOnce();
      if (refreshed) return gqlOnce(operationName, variables, { retry: false });
    }

    if (!res.ok) {
      return { ok: false, error: payload?.errors?.[0]?.message || `HTTP ${res.status}` };
    }
    if (payload?.errors?.length) {
      return { ok: false, error: payload.errors[0].message || 'GraphQL error' };
    }
    return payload?.data?.[operationName] ?? null;
  } catch (err) {
    const aborted = err?.name === 'AbortError';
    return { ok: false, error: aborted ? 'Request timed out' : 'Network unavailable' };
  }
}

// Read operations that are safe to coalesce: identical concurrent calls share
// one network request (screen + child components often request the same data
// in the same frame). Commands are never deduped — and ResendOtp /
// RequestDataExport live on the query bus but have side effects, so they are
// deliberately excluded.
const DEDUPE_OPS = new Set([
  'AdminAlerts', 'AdminAuditCount', 'AdminDriverPayouts', 'AdminListAudit',
  'AdminListDrivers', 'AdminListRides', 'AdminListUserDocuments', 'AdminMetrics',
  'AdminPaymentsSummary', 'AdminSearchUsers', 'AdminStats', 'AdminTimeSeries',
  'AvailableDeliveryRides', 'DriverEarnings', 'DriverRides', 'Get2FAStatus',
  'GetDeliveryPricing', 'GetDriverProfile', 'GetDriverStatus', 'GetMessages',
  'GetProfile', 'GetReservation', 'GetReviewForRide', 'GetRideDetail', 'Health',
  'ListAchievements', 'ListChats', 'ListCities', 'ListDriverSessions',
  'ListPayments', 'ListPopularRoutes', 'ListReservations', 'ListRoutes',
  'ListTiers', 'Me',
  'MyDeliveries', 'RideDeliveries', 'RidePassengers', 'SearchRides',
]);
const inflight = new Map();

export async function gql(operationName, variables, opts) {
  if (!DEDUPE_OPS.has(operationName)) return gqlOnce(operationName, variables, opts);
  const key = `${operationName}:${JSON.stringify(variables ?? {})}`;
  const pending = inflight.get(key);
  if (pending) return pending;
  const request = gqlOnce(operationName, variables, opts).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, request);
  return request;
}

export async function gqlList(operationName, variables) {
  const result = await gql(operationName, variables);
  return Array.isArray(result) ? result : [];
}
