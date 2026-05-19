# Louagi backend contract

This document is the source of truth for what the Louagi client expects from
the backend. The auth path is served by **Supabase Auth** directly; the rest
of the API (rides, reservations, payments, drivers, admin) is served by the
Node backend under [`server/`](../server/README.md), which persists to the
Supabase Postgres project under [`supabase/migrations`](../supabase/migrations).

The in-memory mocks in `src/api/*.mock.js` remain the reference
implementation — port them one router at a time.

> **Section 2 below** is preserved verbatim so `src/api/auth.real.js` keeps
> working against either the legacy hashed-sun shape *or* the Supabase Auth
> adapter that wraps it. The adapter is responsible for mapping
> `signInWithOtp` / `verifyOtp` / `refreshSession` results into this envelope.

---

## 1. Conventions

### Response envelope
Every response has one of these shapes:

```jsonc
// Success
{ "ok": true, ...payload }

// Single error
{ "ok": false, "error": "Phone or password is incorrect" }

// Field-level validation errors (used by register and updateProfile)
{ "ok": false, "errors": { "phone": "Invalid phone", "email": "Email already in use" } }
```

The screen code branches uniformly on `res.ok` — preserve this shape on every
endpoint. Do **not** use HTTP status alone to signal success; always include
the envelope in the body.

### Status codes
| Status | Meaning | Body |
|---|---|---|
| `200` | Success | `{ ok: true, ... }` |
| `400` | Validation failure | `{ ok: false, errors: { field: msg } }` or `{ ok: false, error }` |
| `401` | Missing / expired / invalid access token | `{ ok: false, error }` — client will auto-refresh once and retry |
| `409` | Conflict (e.g., phone or email already registered) | `{ ok: false, errors }` |
| `429` | Rate-limited | `{ ok: false, error, lockedUntil: <ISO8601 string> }` |
| `5xx` | Server error | `{ ok: false, error }` |

### Casing
- **Envelope keys are camelCase**: `accessToken`, `refreshToken`, `userId`, `devOtp`, `lockedUntil`.
- **Nested domain objects are snake_case**: `full_name`, `phone_masked`, `route_id`, `available_seats`, etc. The client's screens already consume snake_case for these fields.

### Authentication
- The client sends `Authorization: Bearer <accessToken>` on every request after
  login. The `/auth/*` endpoints listed below are public except `/auth/logout`,
  which requires the access token.
- On `401`, the client tries `/auth/refresh` exactly once, then retries the
  original request. Concurrent 401s share a single in-flight refresh.

### JWT claims (informational)
The current mock signs these claims; the real backend can use the same set or
a superset. The client only reads `sub`, `role`, `name`, `driverStatus`, `exp`.

```jsonc
// Access token
{ "sub": "<user.id>", "role": "passenger|driver|admin", "name": "Full Name",
  "driverStatus": "pending|verified|null", "exp": 1234567890 }

// Refresh token
{ "sub": "<user.id>", "role": "...", "exp": 1234567890 }
```

### Refresh-token rotation
`/auth/refresh` MUST issue a new refresh token and invalidate the old one. The
client persists the new pair on every refresh. Without rotation, a leaked
token stays valid indefinitely.

### `devOtp` field (development only)
`/auth/login` and `/auth/register` may include a `devOtp` string in their
response body to surface the OTP in a dev banner. The backend MUST omit this
field when `NODE_ENV === 'production'`. The client treats it as best-effort and
falls back to `null` gracefully.

---

## 2. Endpoints

### `POST /auth/login`
Start the login flow with phone + password. On success, an OTP is sent via SMS
and the client moves to the OTP-verification screen.

**Request**
```json
{ "phone": "+21698765432", "password": "Passenger1" }
```

**Success (`200`)**
```json
{ "ok": true, "next": "otp", "userId": "<uuid>", "devOtp": "123456" }
```

**Errors**
- `400` invalid phone format → `{ ok: false, error: "Invalid Tunisian phone" }`
- `401` bad credentials → `{ ok: false, error: "Phone or password is incorrect" }`
- `429` rate-limited → `{ ok: false, error: "Too many attempts. Try again later.", lockedUntil: "2026-05-18T10:00:00.000Z" }`

The client rate-limit window in the mock is **5 attempts per 15 min per phone**.
Backend may mirror or tighten.

---

### `POST /auth/otp/verify`
Single endpoint used by both login and register OTP confirmation. The `purpose`
field disambiguates which flow is being completed.

**Request**
```json
{ "userId": "<uuid>", "purpose": "login", "otp": "123456" }
```

`purpose` is one of `"login"`, `"register"`, `"password_reset"` (reserved for future use).

**Success (`200`)**
```json
{
  "ok": true,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "<uuid>",
    "name": "Mariem Ben Salem",
    "role": "passenger",
    "driverStatus": null
  }
}
```

For drivers, `driverStatus` is `"verified"`, `"pending"`, or `"rejected"`.
For passengers and admins it is `null`.

**Errors**
- `400` OTP expired / wrong code / too many attempts → `{ ok: false, error: "..." }`
- `404` user not found → `{ ok: false, error: "User not found" }`

---

### `POST /auth/register`
Create a new user account and dispatch a registration OTP.

**Request**
```json
{
  "fullName": "Mariem Ben Salem",
  "phone": "+21698765432",
  "email": "mariem@example.tn",
  "password": "Passenger1",
  "role": "passenger"
}
```

`role` is one of `"passenger"` or `"driver"`. Admin accounts are not self-registered.

**Success (`200`)**
```json
{ "ok": true, "userId": "<uuid>", "devOtp": "123456" }
```

**Errors**
- `400` validation → `{ ok: false, errors: { fullName?, phone?, email?, password?, role? } }`
- `409` phone or email already used → `{ ok: false, errors: { phone: "Phone already registered" } }`

Password rules (enforced client-side in `src/validation/schemas.js`; backend must
re-validate): min 8 chars, at least 1 uppercase, at least 1 digit.

---

### `POST /auth/otp/resend`
Issue a fresh OTP for an in-flight login or registration.

**Request**
```json
{ "userId": "<uuid>", "purpose": "login" }
```

**Success (`200`)**
```json
{ "ok": true, "devOtp": "123456" }
```

---

### `POST /auth/refresh`
Exchange a refresh token for a new access + refresh pair. Backend MUST rotate
the refresh token and invalidate the old one.

**Request**
```json
{ "refreshToken": "eyJ..." }
```

**Success (`200`)**
```json
{ "ok": true, "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

**Errors**
- `401` invalid / expired / revoked refresh → `{ ok: false, error: "..." }`. The
  client signs the user out on this response.

---

### `POST /auth/logout`
Revoke the current refresh token server-side. The client also clears its local
session unconditionally; this endpoint is best-effort.

**Headers**
`Authorization: Bearer <accessToken>` (the access token is still valid at this point)

**Request**
```json
{ "refreshToken": "eyJ..." }
```

**Success (`200`)**
```json
{ "ok": true }
```

---

## 3. Local development

The client config lives in `src/config.js` and reads four env vars:

| Var | Purpose | Default |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Base URL of the Node backend (`server/`) | `http://localhost:3000` |
| `EXPO_PUBLIC_USE_MOCKS` | `"true"` to keep the in-memory mock active; `"false"` to hit the backend | `"true"` |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL (used by the client's auth flow) | — |
| `EXPO_PUBLIC_SUPABASE_KEY` | Supabase publishable / anon key | — |

When testing on a physical phone via Expo Go, `localhost` does not resolve to
your laptop. Use the LAN IP (e.g. `http://192.168.1.10:3000`) or an `ngrok` /
Expo tunnel URL. Restart Metro with `npx expo start -c` after changing env
vars — Expo inlines them at bundle build time.

### Supabase Auth integration

`src/api/auth.real.js` is implemented on top of `@supabase/supabase-js` and
must keep returning the envelope shapes in section 2. The mapping:

| Contract method | Supabase call |
|---|---|
| `startLogin(phone, password)` | `signInWithOtp({ phone })` — the password field is recorded for legacy parity but Supabase Auth's primary factor is the OTP. |
| `completeLogin(userId, otp)` | `verifyOtp({ phone, token: otp, type: 'sms' })` |
| `register({ fullName, phone, email, password, role })` | `signUp({ phone, password, options: { data: { full_name, role } } })` then `signInWithOtp` to send the OTP. |
| `verifyRegistration(userId, otp)` | `verifyOtp({ phone, token: otp, type: 'sms' })` |
| `resendOtp(userId, purpose)` | `signInWithOtp({ phone })` |
| `refresh(token)` | `refreshSession({ refresh_token: token })` |
| `logout(refreshToken)` | `signOut()` |

The migration in `supabase/migrations/20260519000000_init_schema.sql` keeps
`public.users.id` in lock-step with `auth.users.id` via a trigger, so the
`user.id` returned to the client is the same value the Node backend uses as
the FK in `reservations.user_id`, `notifications.user_id`, etc.

### Server (`server/`)

The Node backend reads its config from `server/.env` (see
`server/.env.example`). On every protected route it verifies the Supabase
JWT, loads the role from `public.users`, and runs the request with the
service-role Postgres connection (which bypasses RLS). See
[`server/README.md`](../server/README.md) for the full setup flow.

---

## 4. Open items (post-MVP)

These endpoints aren't in scope for this round but should mirror the same
contract when migrated. The existing mocks in `src/api/` document the request
and response shapes for each:

- `users.js` — getProfile, updateProfile, updateNotificationPrefs, deleteAccount
- `rides.js` — listRoutes, listCities, searchRides, getRideDetail, createRide, updateRideStatus, cancelRide, driverRides, ridePassengers, driverEarnings, adminListRides
- `reservations.js` — createReservation (with `idempotencyKey` replay protection), listReservations, getReservation, cancelReservation
- `payments.js` — listPayments, adminRefund, adminFlagPayment
- `drivers.js` — registerDriverApplication, getDriverStatus, getDriverProfile, updateDriverVehicle, updateDriverPayout, adminListDrivers, adminVerifyDriver
- `admin.js` — adminStats, adminAlerts, adminSearchUsers, adminSetUserActive, adminImpersonate, adminListAudit, adminAuditCount

### 4.1 `GET /driver/analytics?period=week|month`
Powers the driver dashboard. The mock implementation is in
`src/api/rides.js` as `driverEarnings({ actor, period })`; the driver is
inferred from the bearer token, not from the request body.

**Query parameters**
- `period` — `"week"` (default, 7-day window) or `"month"` (30-day window).
  Drives both the `history` array length and the "current vs previous"
  comparison window.

**Success (`200`)**
```jsonc
{
  "ok": true,
  "period": "week",

  // Quick totals (always present; "today/week/month" are last 24h / 7d / 30d
  // ending now, regardless of the `period` param).
  "today": 0,
  "week": 220,
  "month": 1140,

  // Bar-chart values, one entry per day, oldest → newest. Length = 7 for
  // "week", 30 for "month". `historyStart` is the midnight (driver-local)
  // of the leftmost bar so the client can label bars with real dates.
  "history": [0, 22, 44, 0, 88, 22, 44],
  "historyStart": "2026-05-12T00:00:00.000Z",

  // Current period vs the equivalent window immediately before it. The
  // client renders ↑/↓ deltas from these pairs.
  "tripsThisPeriod": 6,    "tripsPrevPeriod": 4,
  "seatsSold": 14,         "seatsPrev": 10,
  "seatsCapacity": 24,     "seatsCapacityPrev": 16,
  "occupancyPct": 58,      "occupancyPrevPct": 62,
  "avgFare": 36.7,         "avgFarePrev": 34.2,
  "earningsPrev": 187,     // previous-period total to compare against `week`/`month`

  // Cancellations as a share of all rides (completed + cancelled) that
  // *started* in the current period.
  "cancelRatePct": 12,

  // Most-traveled route in the current period (by trip count, tiebreaker
  // revenue). `null` if the driver had no completed rides this period.
  "topRoute": {
    "route_id": "<uuid>",
    "origin_city": "Tunis",
    "destination_city": "Sfax",
    "count": 4,
    "revenue": 176
  },

  // Lifetime fields from the driver record. `rating` is a 0–5 float or null.
  "rating": 4.8,
  "tripsCompleted": 312
}
```

Cancellation/refund effects on these numbers:
- Cancelled rides do **not** count toward `tripsThisPeriod`, `seatsSold`,
  `seatsCapacity`, `earningsPrev`, `week`, `month`, or `history`.
- They **do** count toward `cancelRatePct` (denominator includes them).
