# Louagi (Expo)

End-to-end React Native (Expo) implementation of the Louagi platform spec'd in
`Louagi_Project_Documentation.docx`: interstate louage booking for Tunisia,
with three portals (passenger, driver, admin) and the security layer the
documentation requires.

## Run it

> Requires Node 18+ (Node 22 tested). Targets Expo SDK 54. From the project root:

```bash
npm install
npx expo start --tunnel   # --tunnel helps when phone & laptop are on different networks
```

Press `w` for web, `a` for Android emulator, `i` for iOS simulator, or scan
the QR code with the Expo Go app (SDK 54+) on a real device.

### Troubleshooting Expo Go

- **"Something went wrong"** in Expo Go almost always means the project's
  Expo SDK is older than the Expo Go you have installed. This project is on
  SDK 54. If your Expo Go is older, update it from the App Store / Play Store.
- **Crash on first launch**: the app now wraps everything in an `ErrorBoundary`
  that surfaces the full stack inside the screen — share that back if anything
  blows up.
- **Stuck on the loading screen**: clear the Metro cache with
  `npx expo start --clear`.

### Demo accounts (seeded on first launch)

| Role      | Phone        | Password      |
|-----------|--------------|---------------|
| Passenger | `98765432`   | `Passenger1`  |
| Driver    | `22334455`   | `Driver1234`  |
| Admin     | `55000000`   | `AdminLou2026`|

The OTP code is generated on the device and surfaced in a dev-mode banner on
the OTP screen (would arrive via SMS in production).

## Language & theme

The app is fully wired for runtime locale + theme switching:

- **Locales**: `en`, `fr`, `ar` — initial pick mirrors the device language
  (anything outside the three falls back to English).
- **AR** triggers a full RTL flip. On first switch the app reloads once
  (via `DevSettings.reload()` in Expo Go) so React Native's layout system can
  rebuild in the new direction.
- **Theme modes**: `light`, `dark`, `system` (follows OS `useColorScheme`).
- **Where to toggle**:
  - Header cog on every dashboard → opens **Settings** screen.
  - Profile → Travel preferences → Language + Theme pill rows.
  - Standalone **Settings** screen mounted in every role stack with the full
    language list, theme list, and version row.

### How it works under the hood

- `src/context/LocaleContext.js` — `useLocale()` exposes `{ locale, setLocale,
  t, isRTL, ready }`. Persists choice via `expo-secure-store`.
- `src/context/ThemeContext.js` — `useTheme()` exposes
  `{ mode, setMode, colors, isDark, ready }`. Also writes the active palette
  into a Proxy-backed `colors` import (`src/theme/colors.js`) so legacy
  `import { colors } from '../theme'` calls stay valid and re-render with the
  tree.
- `src/i18n/index.js` initialises `i18next` with three resource bundles
  (`src/i18n/locales/{en,fr,ar}.json`) split into namespaces: `common`,
  `auth`, `landing`, `search`, `ride`, `booking`, `passenger`, `driver`,
  `admin`, `settings`, `errors`, `toast`.
- `src/i18n/format.js` wraps `Intl.DateTimeFormat` so dates/times respect the
  active locale.
- `src/components/RoutePair.js` renders an `origin → destination` pair whose
  arrow auto-flips under RTL.

### Translation coverage

| Surface                              | Status |
|--------------------------------------|--------|
| Login + Verify-phone                 | ✅ Full |
| Register + Driver register           | ✅ Full |
| Landing (hero + search widget)       | ✅ Full |
| Passenger Dashboard headers/tabs     | ✅ Full |
| Passenger Profile (toggles, sections)| ✅ Full |
| Settings screen                      | ✅ Full |
| All `errors`, `toast`, `*` keys      | ✅ All three locales present in JSON |
| Search results / RideDetail / Booking| ⚠️ Keys defined, screens still call literal English |
| Driver screens (Dashboard, CreateRide, RideManagement, Profile) | ⚠️ Same |
| Admin screens (Overview, Drivers, Users, Rides, Payments, Audit)| ⚠️ Same |
| API/validation error returns         | ⚠️ Still return English; UI shows them verbatim |

The remaining ⚠️ rows are mechanical: each English literal becomes a
`t('namespace:key')` call. The JSON resources already cover them.

## Layout

```
src/
  theme/           colors, typography, spacing, shadows (DESIGN tokens)
  components/      Button, Card, Input, Badge, RideCard, Tabs, Toast, …
  navigation/      Public / Passenger / Driver / Admin stacks + tabs
  context/         AuthContext (JWT + refresh + SecureStore)
  security/        JWT, OTP, bcrypt-equivalent, rate limit, seat lock,
                   audit log, RBAC, field-level encryption
  validation/      Tunisian phone, password strength, OTP, files
  api/             mockDb + auth/rides/reservations/payments/drivers/admin
  screens/
    public/        Landing, Login, Register, DriverRegister, Pending
    passenger/     Search, RideDetail, BookingConfirm, Dashboard, Profile
    driver/        Dashboard, RidesList, CreateRide, RideManagement, Profile
    admin/         Overview, Drivers, Users, Rides, Payments, Audit
```

## How the security model maps to the spec

| Spec requirement                                           | Where it lives |
|------------------------------------------------------------|----------------|
| JWT 15-min access tokens, refresh rotation                 | `security/jwt.js`, `context/AuthContext.js` |
| Tokens persisted in OS-level secure storage (SecureStore)  | `security/secureStorage.js` |
| Phone OTP on signup + login                                | `security/otp.js`, screens `Login`, `Register` |
| Password hash (bcrypt-equivalent: salted + iterated SHA)   | `security/crypto.js` (`hashPassword`, `verifyPassword`) |
| Rate limit: 5 login attempts / 15-min lockout              | `security/rateLimit.js` |
| RBAC scopes (passenger / driver / admin)                   | `security/rbac.js`, gated routes in `RootNavigator` |
| Admin IP allowlist                                         | `security/rbac.js` (`isAdminIpAllowed`) |
| Field-level encryption for PII (phone, ID, license, plate) | `security/crypto.js` (`encryptField` / `decryptField`) |
| Seat lock (10-min TTL, atomic)                             | `security/seatLock.js` |
| Idempotency keys on reservations                           | `api/reservations.js` |
| Tokenized payment refs (no card data stored)               | `api/reservations.js` (gateway stub) |
| Immutable audit log (no edit/delete)                       | `security/audit.js` |
| Tunisian phone validation (+216 + 8 digits)                | `validation/schemas.js` |
| Cancel policy ≥ 2 hours before departure                   | `api/reservations.js` |
| 2-hour rule bypassed for admin                             | same |

## How the booking flow maps to section 5 of the docs

1. **Tap Book** → JWT is verified by the API layer.
2. **Seat lock acquired** (10-min Redis-equivalent TTL).
3. **Availability check** — if seats are gone, reservation is rejected.
4. **Pending reservation** created with an idempotency key.
5. **Payment gateway** stub returns `succeeded` / `failed`.
6. **On success**: reservation → confirmed, `available_seats -= n`, payment row
   written, driver notification queued, audit row written.
7. **On failure**: reservation → cancelled, seat lock released, no charge.
8. **Confirmation screen** shows booking ref + gateway ref.

## Mock vs. real backend

This repo carries two runtime paths, picked at bundle-build time:

| Layer | Where | Used by |
|---|---|---|
| Node GraphQL backend + Postgres | [`server/`](./server/README.md), [`supabase/`](./supabase) | Default auth and business logic path |
| Empty in-memory mock | `src/api/*.mock.js` | Offline UI work only (`EXPO_PUBLIC_USE_MOCKS=true`) |

The Node backend verifies backend-issued JWTs and runs GraphQL resolvers
against the Supabase Postgres project. Demo credentials and catalogue rows live
in `supabase/seed.sql`, not in the app bundle.

### Switching to the real backend

1. Create your local env file: `cp .env.example .env`.
2. Fill in:
   - `EXPO_PUBLIC_API_URL` — your Node backend URL. On a physical device,
     use your LAN IP (e.g. `http://192.168.1.10:3000`).
3. Keep `EXPO_PUBLIC_USE_MOCKS=false`.
4. Stand up the backend per [`server/README.md`](./server/README.md):
   `cp server/.env.example server/.env`, fill in `APP_JWT_SECRET` +
   `DATABASE_URL`, then `cd server && npm install && npm run dev`.
5. Apply the schema: `supabase login && supabase link --project-ref <ref> && supabase db push`.
6. Restart Metro with `npx expo start -c` (env vars are inlined at build time).

The wire contract is in [`docs/backend-contract.md`](./docs/backend-contract.md)
— request/response shapes, status codes, and the refresh-token rotation
requirement are all specified there.

### How the dispatch works

`src/api/auth.js` is a thin dispatcher that picks between `auth.mock.js` and
`auth.real.js` at module load. The other API modules keep the same exported
function names but call `src/api/graphql.js` when mocks are off, so screens do
not know whether data came from the backend or the offline mock.

### What lives where

- **Client**: `src/api/graphql.js` (fetch + 15s timeout + 401 refresh-and-retry),
  `src/security/tokenStore.js` (in-memory token cache shared with `AuthContext`),
  `src/security/secureStorage.js`, `src/validation/`, all UI components.
- **Server (when built)**: password hashing, JWT signing, OTP issuance,
  seat-lock state, audit log, rate limits, persistence — i.e. everything in
  `src/security/{crypto,jwt,otp,seatLock,audit,rateLimit}.js` and `src/api/mockDb.js`.

## Design fidelity

All colour, font, spacing, and radius tokens come straight from
`DESIGN (1).md`:

- Primary `#031634` (Deep Navy)
- Secondary container `#feae2c` (Amber Gold)
- Surface `#fbf8fc`, on-surface `#1b1b1e`
- Plus Jakarta Sans via `@expo-google-fonts/plus-jakarta-sans`
- Cards 16 px radius, pills 9999 px, ambient navy-tinted shadows.

Components match the HTML mockups in the parent folder (login, signup,
verification, tarif, travel, upcoming, driver, todayDrive, CreateRide,
rideMangement, driverProdile).
