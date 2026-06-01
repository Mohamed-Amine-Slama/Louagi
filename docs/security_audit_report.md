# Security Audit Report: Louagi App

**Date:** June 1, 2026
**Status:** Initial Audit Completed
**Auditor:** Gemini CLI

## Executive Summary
The Louagi App follows several security best practices, including the use of parameterized queries (via `postgres-js` tagged templates) and Row-Level Security (RLS) in Supabase. However, several vulnerabilities and architectural weaknesses were identified, primarily around session management, input sanitization, and lack of rate limiting.

---

## 1. Authentication & Session Management

### 1.1 In-Memory Refresh Token Tracking (Medium Risk)
- **File:** `server/src/auth/tokens.js`
- **Description:** Refresh tokens are tracked in an in-memory `Map` (`activeRefreshTokens`).
- **Impact:** Tokens are lost on server restart. In a load-balanced environment with multiple instances, users will be randomly logged out because instances don't share the token map.
- **Recommendation:** Move refresh token tracking to Redis or the Postgres database.

### 1.2 Admin Impersonation (High Risk)
- **File:** `server/src/graphql/resolvers.js` (`AdminImpersonate`)
- **Description:** Admins can generate a valid access token for any user (except other admins).
- **Impact:** If an admin account is compromised, the attacker gains full access to any passenger or driver account.
- **Recommendation:** Ensure this action is heavily audited (it currently is) and consider requiring Multi-Factor Authentication (MFA) for this specific action.

### 1.3 Custom JWT Implementation (Low Risk)
- **File:** `server/src/auth/tokens.js`
- **Description:** The app uses a custom HMAC-SHA256 implementation for JWTs instead of a standard library.
- **Impact:** Increased risk of subtle implementation bugs (though `timingSafeEqual` is correctly used).
- **Recommendation:** Replace custom signing logic with a library like `jsonwebtoken`.

---

## 2. Input Validation & Sanitization

### 2.1 Weak HTML Sanitization (Medium Risk)
- **File:** `server/src/utils/validation.js` (`sanitize`)
- **Description:** The `sanitize` function uses a regex to strip HTML tags but does not handle attributes (like `onmouseover`) or other XSS vectors.
- **Impact:** Potential XSS if sanitized data is ever rendered in a web context (e.g., admin dashboard, emails).
- **Recommendation:** Use a robust library like `dompurify` (if in a JS environment with DOM) or `sanitize-html`.

### 2.2 Missing Sanitization in Messaging (High Risk)
- **File:** `server/src/graphql/resolvers.js` (`SendMessage`)
- **Description:** Message content is not sanitized before being stored in the database.
- **Impact:** If messages are displayed in a web-based chat interface without escaping, an attacker can execute arbitrary JS in the recipient's browser.
- **Recommendation:** Apply sanitization to message content or ensure the frontend strictly escapes all rendered text.

---

## 3. Authorization & Access Control

### 3.1 Backend RLS Bypass (Medium Risk)
- **File:** `server/src/db.js`
- **Description:** The Node.js backend connects directly to Postgres and bypasses Supabase RLS policies.
- **Impact:** The security of the data relies entirely on the correctness of the backend resolvers. A single missing check in a resolver could lead to unauthorized data access (IDOR).
- **Recommendation:** Implement a secondary check layer in the backend or use a restricted database user for the backend where possible.

---

## 4. Availability & DoS Protection

### 4.1 Lack of Rate Limiting (High Risk)
- **File:** `server/src/index.js`
- **Description:** No rate limiting is implemented on the Express server.
- **Impact:** Susceptible to brute-force attacks on OTP/passwords and Denial of Service (DoS) attacks.
- **Recommendation:** Implement `express-rate-limit` on all routes, especially `/graphql`.

---

## 5. Information Disclosure

### 5.1 Verbose Error Reporting in Health Check (Low Risk)
- **File:** `server/src/routes/health.js`
- **Description:** The `/health` endpoint returns the full error string on failure.
- **Impact:** Could leak sensitive information about the database or infrastructure.
- **Recommendation:** Log the full error on the server but return a generic message to the client.

### 5.2 Misleading Encryption Claims (Medium Risk)
- **File:** `supabase/migrations/20260519000000_init_schema.sql` and `server/src/graphql/resolvers.js`
- **Description:** The schema claims fields like `phone_number`, `plate_number`, and `id_card_number` are "encrypted at rest". The backend code uses variable names like `phone_decrypted` and `plate_decrypted`, yet the data is read and written as plain text in SQL queries.
- **Impact:** If developers assume these fields are application-level encrypted, they might accidentally leak them. If they *should* be encrypted, then the encryption logic is currently missing.
- **Recommendation:** Clarify if "encrypted at rest" refers only to disk-level encryption. If application-level encryption is required, implement it in the backend using a secure KMS.

---

## 6. SQL Injection

### 6.1 Parameterized Queries (Safe)
- **Observation:** The use of `postgres-js` tagged templates across the codebase effectively prevents SQL injection. No instances of string concatenation for SQL queries were found.

---

## 7. Findings Summary Table

| ID | Finding | Severity | Category |
|----|---------|----------|----------|
| 1.1 | In-Memory Refresh Tokens | Medium | Session Management |
| 1.2 | Admin Impersonation Risk | High | Access Control |
| 2.1 | Weak Sanitization | Medium | XSS |
| 2.2 | Missing Sanitization in Messages | High | XSS |
| 4.1 | No Rate Limiting | High | Availability |
| 5.1 | Verbose Health Errors | Low | Info Disclosure |
| 5.2 | Misleading Encryption Claims | Medium | Data Protection |
