# Resilience Audit — Louagi App

> Added by resilience agent — 2026-06-05

## 1. Supabase Client Files

| File | Purpose |
|------|---------|
| `src/lib/supabase.js` | React Native client (anon key, SecureStore, auth only) |
| `src/config.js` | Exports `supabaseUrl` / `supabaseKey` from `EXPO_PUBLIC_*` env vars |
| `server/src/db.js` | Server-side `postgres-js` pool (service-role, transactions) |
| `server/src/config.js` | Exports `databaseUrl`, `supabaseUrl`, `supabaseServiceRoleKey` |
| `server/src/auth/tokens.js` | Refresh token CRUD via `sql` tagged templates |
| `server/src/graphql/resolvers.js` | All business-logic queries (~2,300 lines) |

## 2. Tables Referenced (15 total)

| Table | Has `user_id` | RLS Enabled | Ownership |
|-------|:---:|:---:|-----------|
| `users` | ✗ (PK=id) | ✅ | Self-owned via `id = auth.uid()` |
| `drivers` | ✅ | ✅ | `user_id = auth.uid()` |
| `admins` | ✅ | ✅ | Admin-only |
| `routes` | ✗ | ✅ | Public read, admin write |
| `rides` | ✗ | ✅ | Driver-owned via `driver_id` FK |
| `reservations` | ✅ | ✅ | `user_id = auth.uid()` |
| `payments` | ✗ | ✅ | Via `reservation_id` FK chain |
| `reviews` | ✗ | ✅ | Via `reservation_id` FK chain |
| `notifications` | ✅ | ✅ | `user_id = auth.uid()` |
| `documents` | ✅ | ✅ | `user_id = auth.uid()` |
| `seat_locks` | ✅ | ✅ | Server-only (no policies) |
| `audit_log` | ✗ | ✅ | Server-only (no policies) |
| `delivery` | ✅ | ✅ | `user_id = auth.uid()` |
| `messages` | ✗ | ✅ | `sender_id` / `receiver_id` |
| `refresh_tokens` | ✅ | ✅ | Server-only (no policies) |

## 3. Connection Configuration

- **Server `DATABASE_URL`**: `postgresql://postgres.guomqnrpydxdzafrhywu:***@aws-1-eu-central-1.pooler.supabase.com:5432/postgres`
  - ⚠️ Uses port **5432** (session pooler) — should be **6543** (transaction pooler)
- **Client `EXPO_PUBLIC_SUPABASE_URL`**: `https://guomqnrpydxdzafrhywu.supabase.co` (REST API — no port issue)
- **`prepare: false`** is already set in `server/src/db.js` ✅

## 4. Existing Resilience Mechanisms

| Mechanism | Exists? | Notes |
|-----------|:---:|-------|
| Retry logic | ❌ | No retries on transient failures |
| Request timeouts | ❌ | No query-level timeouts |
| Circuit breaker | ❌ | No cascading-failure protection |
| Connection pooling | ⚠️ | Using session pooler, not transaction pooler |
| Transactions | ✅ | `sql.begin()` used for all multi-step writes |
| Idempotency keys | ✅ | Reservations use `idempotency_key` |
| Soft deletes | ⚠️ | `is_active` flag on users; `cancelled_at` on reservations; no `deleted_at` column |
| Structured logging | ❌ | Only `console.error` with unstructured messages |
| Rate limiting | ✅ | Express rate-limiter on API routes |

## 5. Existing RLS Policies

Comprehensive RLS policies exist across 8 migration files:
- `20260519000001_rls_policies.sql` — Core tables (users, drivers, rides, reservations, etc.)
- `20260522100000_reservation_fee.sql` — Driver fee read policy on payments
- `20260522100001_delivery_feature.sql` — Delivery table policies
- `20260531000000_messaging.sql` — Messages table policies
- `20260604215500_create_refresh_tokens.sql` — Server-only (no policies)

**Missing**: No restrictive deny-all default policies as a safety net.

## 6. Hard DELETE Operations

**None found** — the codebase exclusively uses status updates (`is_active = false`,
`status = 'cancelled'`) rather than `DELETE FROM` statements. This is good practice
but lacks formal `deleted_at` timestamps for audit trails.
