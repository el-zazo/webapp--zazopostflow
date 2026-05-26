# Authentication & Security

> **ZazoPostFlow** — Complete authentication and security reference

---

## Table of Contents

- [Overview](#overview)
- [JWT Configuration](#jwt-configuration)
- [Password Change Session Invalidation (Fix #6)](#password-change-session-invalidation-fix-6)
- [Auth Library Functions](#auth-library-functions-srclibauthts)
- [Middleware Route Protection](#middleware-route-protection-srcmiddlewarets)
- [API Client](#api-client-srclibapi-clientts)
- [Authentication Flows](#authentication-flows)
  - [Registration Flow](#registration-flow)
  - [Email Verification Flow](#email-verification-flow)
  - [Login Flow (without 2FA)](#login-flow-without-2fa)
  - [Login Flow (with 2FA)](#login-flow-with-2fa)
  - [Password Reset Flow](#password-reset-flow)
  - [Account Deletion Flow](#account-deletion-flow)
- [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
  - [Setup Flow](#setup-flow)
  - [Disable 2FA](#disable-2fa)
  - [Backup Codes](#backup-codes)
- [Email System](#email-system-srclibemailts)
- [Email Validation](#email-validation-srclibemail-validatorts)
- [Rate Limiting](#rate-limiting-srclibrate-limitts)

---

## Overview

ZazoPostFlow uses **JWT (JSON Web Tokens)** stored in **httpOnly cookies** for authentication. This approach keeps tokens entirely server-side from the browser's perspective — JavaScript cannot read or modify the cookie — while still enabling stateless verification on every request.

Key characteristics:

| Property | Value |
|---|---|
| Token type | JWT (JSON Web Token) |
| Storage | httpOnly cookie (`postflow_token`) |
| Cookie expiry | 7 days |
| Password hashing | bcrypt, 12 salt rounds |
| 2FA | TOTP (Time-based One-Time Password) |
| Email verification | Required before account activation |
| Session invalidation | `iat` vs `passwordChangedAt` comparison |

---

## JWT Configuration

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | **Yes** | Signing secret for JWTs. The application throws at startup if this is missing. |

### Token Properties

| Property | Value |
|---|---|
| Algorithm | HS256 (default) |
| Expiry | 7 days (`TOKEN_MAX_AGE = 604800` seconds) |
| Cookie name | `postflow_token` |
| Cookie `httpOnly` | `true` |
| Cookie `SameSite` | `Lax` |
| Cookie `Secure` | `true` in production (`NODE_ENV=production`), `false` otherwise |
| Cookie `Path` | `/` |

### Token Payload

```json
{
  "userId": "660a1b2c3d4e5f6a7b8c9d0e",
  "email": "user@example.com",
  "username": "janedoe",
  "iat": 1712345678,
  "exp": 1712950478
}
```

| Field | Type | Description |
|---|---|---|
| `userId` | `string` | MongoDB ObjectId of the user |
| `email` | `string` | User's email address |
| `username` | `string` | User's display name |
| `iat` | `number` | Issued-at timestamp (seconds since epoch) |
| `exp` | `number` | Expiration timestamp (seconds since epoch) |

---

## Password Change Session Invalidation (Fix #6)

When a user changes their password, a `passwordChangedAt` timestamp is set on the user document. On **every authenticated request**, the system compares the JWT's `iat` (issued-at) timestamp with the stored `passwordChangedAt` value:

```
if (passwordChangedAt && tokenIat < passwordChangedAt.getTime() / 1000 - 1) {
  // Reject: token was issued before the password change
}
```

A **1-second leeway** is applied to account for clock skew between token issuance and the database write. If the token was issued before the password change (minus the leeway), the request is rejected as unauthorized.

**Effect**: Changing a password immediately invalidates **all** existing sessions across all devices. The user must re-authenticate with their new password.

This check is performed inside `getAuthUser()` and `getAuthUserFromRequest()`, which are called by every protected route and API endpoint.

---

## Auth Library Functions (`src/lib/auth.ts`)

| Function | Signature | Description |
|---|---|---|
| `signToken` | `(payload: JWTPayload) => string` | Signs a JWT with the 7-day expiry using `JWT_SECRET` |
| `verifyToken` | `(token: string) => JWTPayload \| null` | Verifies a JWT; returns the decoded payload or `null` on any failure (expired, malformed, bad signature) |
| `setAuthCookie` | `(token: string) => Promise<void>` | Sets the `postflow_token` httpOnly cookie (7-day max-age, SameSite=Lax, Secure in production) |
| `removeAuthCookie` | `() => Promise<void>` | Deletes the `postflow_token` cookie |
| `getTokenFromRequest` | `(request: NextRequest) => string \| undefined` | Extracts the JWT string from the request's cookie jar |
| `getAuthUser` | `() => Promise<AuthUser \| null>` | Verifies JWT from cookies, then checks the DB: user must exist, be active, and not have changed their password since the token was issued |
| `getAuthUserFromRequest` | `(request: NextRequest) => Promise<AuthUser \| null>` | Identical to `getAuthUser` but accepts a `NextRequest` object instead of reading cookies from the global context |
| `requireAuth` | `(request: NextRequest) => Promise<{user: AuthUser} \| {error: NextResponse}>` | Guard function — returns the authenticated user, or a 401 `NextResponse` if authentication fails |
| `createAuthResponse` | `(data: any, token: string, status?: number) => NextResponse` | Creates a JSON response and attaches the `postflow_token` set-cookie header |
| `createLogoutResponse` | `() => NextResponse` | Creates a JSON response that clears the auth cookie |

### Usage Examples

**Signing and issuing a token:**

```typescript
import { signToken, createAuthResponse } from '@/lib/auth';

const token = signToken({ userId: user._id, email: user.email, username: user.username });
return createAuthResponse({ success: true, user: sanitizedUser }, token);
```

**Protecting an API route:**

```typescript
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const user = auth.user;
  // ... proceed with authenticated logic
}
```

**Manual token verification:**

```typescript
import { verifyToken } from '@/lib/auth';

const payload = verifyToken(rawTokenString);
if (!payload) {
  // Token is invalid or expired
}
```

---

## Middleware Route Protection (`src/middleware.ts`)

The Next.js middleware intercepts requests and enforces route-level access control before they reach page components. Routes are divided into three categories:

### 1. Auth-Only Routes

> Redirect logged-in users **away** from these pages.

| Route | Behavior |
|---|---|
| `/login` | If valid token exists → redirect to `/dashboard` |
| `/register` | If valid token exists → redirect to `/dashboard` |
| `/forgot-password` | If valid token exists → redirect to `/dashboard` |
| `/reset-password` | If valid token exists → redirect to `/dashboard` |

These pages are only useful to unauthenticated users. A logged-in user who navigates to `/login` is automatically redirected to their dashboard.

### 2. Protected Routes

> Require authentication. Unauthenticated users are redirected to `/login`.

| Route Pattern | Description |
|---|---|
| `/dashboard/*` | Main dashboard and all sub-routes |
| `/projects/*` | Project management pages |
| `/calendar/*` | Calendar view pages |
| `/settings/*` | User settings pages |
| `/tags/*` | Tag management pages |

If no valid token is found in the request cookies, the user is redirected to `/login`.

### 3. Public Access Routes

> Always accessible regardless of authentication state.

| Route | Notes |
|---|---|
| `/verify-email` | Self-validating token in the URL query string. **Intentionally** excluded from the auth-only group (Fix #17) so that users with stale cookies — e.g., they just registered and haven't verified yet — can still access this page to complete email verification. |
| `/confirm-delete-account` | Self-validating token. Accessible to anyone with a valid deletion token. |

### Middleware Flow Diagram

```
Request arrives
  │
  ├─ Is it an auth-only route (/login, /register, /forgot-password, /reset-password)?
  │    └─ Yes → Has valid token?
  │         ├─ Yes → Redirect to /dashboard
  │         └─ No  → Allow through
  │
  ├─ Is it a protected route (/dashboard/*, /projects/*, etc.)?
  │    └─ Yes → Has valid token?
  │         ├─ Yes → Allow through
  │         └─ No  → Redirect to /login
  │
  └─ Otherwise → Allow through (public route)
```

---

## API Client (`src/lib/api-client.ts`)

`apiFetch` is a drop-in replacement for the native `fetch` function that adds automatic 401 handling. Every API call in the frontend should use `apiFetch` instead of raw `fetch`.

### 401 Intercept Behavior (Fix #14)

When a 401 response is received:

1. Auth cookies are cleared locally
2. `POST /api/auth/logout` is called to ensure server-side cleanup
3. The browser is redirected to `/login?reason=session_expired`

This prevents **redirect loops** that could occur if the client simply redirected to `/login` without clearing the stale cookie — the middleware would then see the expired/invalid token, but the client-side state might still believe the user is authenticated.

### Usage

```typescript
import { apiFetch } from '@/lib/api-client';

// Drop-in replacement for fetch
const res = await apiFetch('/api/projects');
if (res.ok) {
  const data = await res.json();
}
```

---

## Authentication Flows

### Registration Flow

```
User                        Frontend                     Backend                       Email
  │                            │                           │                            │
  │  Fill registration form    │                           │                            │
  │───────────────────────────>│                           │                            │
  │                            │  POST /api/auth/register  │                            │
  │                            │  {username, email,        │                            │
  │                            │   password,               │                            │
  │                            │   confirmPassword}        │                            │
  │                            │──────────────────────────>│                            │
  │                            │                           │                            │
  │                            │                           │  1. Advanced email          │
  │                            │                           │     validation (4-step)    │
  │                            │                           │  2. Username trim +         │
  │                            │                           │     duplicate check (Fix #12)│
  │                            │                           │  3. Create user             │
  │                            │                           │     (active: false,         │
  │                            │                           │      verification token     │
  │                            │                           │      with 24h expiry)       │
  │                            │                           │                            │
  │                            │                           │  4. Send verification email │
  │                            │                           │───────────────────────────>│
  │                            │                           │                            │
  │                            │                           │  If email send fails:      │
  │                            │                           │  Delete user, return error │
  │                            │                           │                            │
  │                            │  { success: true,         │                            │
  │                            │    message: "Check email"}│                            │
  │                            │<──────────────────────────│                            │
  │  "Check your email"        │                           │                            │
  │<───────────────────────────│                           │                            │
  │                            │                           │                            │
  │                            │                           │  If same unverified email: │
  │                            │                           │  Re-send verification      │
  │                            │                           │                            │
```

**Step-by-step:**

1. User submits `{ username, email, password, confirmPassword }` to `POST /api/auth/register`
2. Advanced email validation runs (4-step async: syntax, blocklist, DNS/MX, external APIs) — see [Email Validation](#email-validation-srclibemail-validatorts)
3. Username is **trimmed** before the duplicate check (Fix #12) — prevents `" alice "` and `"alice"` from being treated as different users
4. User document is created with `active: false` and a crypto-random email verification token (24-hour expiry)
5. Verification email is sent via the Brevo API
6. **If email sending fails**, the newly created user document is deleted and an error is returned — this prevents orphaned unverified accounts
7. User must click the verification link in the email to activate their account (see [Email Verification Flow](#email-verification-flow))
8. If a user tries to register again with the same **unverified** email, the verification email is re-sent rather than showing a "duplicate" error

---

### Email Verification Flow

**Step-by-step:**

1. User clicks the link in the verification email → navigates to `GET /verify-email?token=xxx`
2. The `/verify-email` page automatically submits the token to `GET /api/auth/verify-email?token=xxx`
3. The API validates the token:
   - Token must exist in the database
   - Token must not be expired (24-hour window)
4. On success: account is activated (`active: true`), the verification token is cleared from the user document
5. The page shows a success message and auto-redirects to `/login` after 3 seconds

**Important**: The `/verify-email` route is publicly accessible (not in the auth-only group, Fix #17). This ensures that users who have registered but not yet verified — and who may have a stale cookie from a previous session — can still reach the verification page.

---

### Login Flow (without 2FA)

**Step-by-step:**

1. User submits `{ email, password }` to `POST /api/auth/login`
2. Rate limiting is applied: **5 requests per 15 minutes** per IP address
3. Credentials are validated against the database:
   - Generic error messages are used on failure (e.g., "Invalid email or password") to **prevent email enumeration**
   - The response does not reveal whether the email or the password was incorrect
4. If the account has not been verified (`active: false`) → returns `403 Forbidden` with `{ notVerified: true }` in the response body. The frontend can use this to show a "Please verify your email" message.
5. On success:
   - A JWT is generated containing `{ userId, email, username, iat, exp }`
   - The `postflow_token` httpOnly cookie is set with a 7-day expiry
   - Response:
     ```json
     {
       "success": true,
       "data": {
         "user": { "_id", "username", "email", "avatar", "theme" }
       }
     }
     ```

---

### Login Flow (with 2FA)

**Step-by-step:**

1. Steps 1–4 are identical to the [Login Flow (without 2FA)](#login-flow-without-2fa)
2. If the user has `two_factor_enabled: true`, the login response changes:
   ```
   { success: true, requires2FA: true, userId: "abc123" }
   ```
   **No JWT cookie is set at this point** — authentication is not yet complete.
3. The frontend displays a 2FA code input form
4. User enters a code and submits `{ userId, code }` to `POST /api/auth/2fa/challenge`
5. The code is validated as either:
   - **TOTP code**: 6-digit code from the user's authenticator app (Google Authenticator, Authy, etc.)
   - **Backup code**: one of the 8 single-use backup codes generated during 2FA setup
6. Backup codes are **consumed on use** — the bcrypt-hashed code is removed from the user's `backupCodes` array after a successful match
7. On success:
   - JWT is generated and `postflow_token` cookie is set (7-day expiry)
   - Response includes metadata about backup code usage:
     ```json
     {
       "success": true,
       "message": "2FA verified successfully",
       "data": {
         "user": { "_id", "username", "email", "avatar", "theme" }
       },
       "usedBackupCode": true,
       "remainingBackupCodes": 5
     }
     ```

---

### Password Reset Flow

```
User                        Frontend                     Backend                       Email
  │                            │                           │                            │
  │  Enter email               │                           │                            │
  │───────────────────────────>│                           │                            │
  │                            │  POST /api/auth/          │                            │
  │                            │  forgot-password          │                            │
  │                            │  {email}                  │                            │
  │                            │──────────────────────────>│                            │
  │                            │                           │                            │
  │                            │                           │  Always returns same       │
  │                            │                           │  response (prevents        │
  │                            │                           │  email enumeration)        │
  │                            │                           │                            │
  │                            │                           │  If account exists:        │
  │                            │                           │  Generate 1h reset token   │
  │                            │                           │  Send reset email          │
  │                            │                           │───────────────────────────>│
  │                            │                           │                            │
  │                            │  { success: true }        │                            │
  │                            │<──────────────────────────│                            │
  │  "Check your email"        │                           │                            │
  │<───────────────────────────│                           │                            │
  │                            │                           │                            │
  │  Click link in email       │                           │                            │
  │───────────────────────────>│                           │                            │
  │                            │  /reset-password?token=xxx│                            │
  │                            │                           │                            │
  │  Enter new password        │                           │                            │
  │───────────────────────────>│                           │                            │
  │                            │  POST /api/auth/          │                            │
  │                            │  reset-password           │                            │
  │                            │  {token, password}        │                            │
  │                            │──────────────────────────>│                            │
  │                            │                           │  Validate token            │
  │                            │                           │  Update password (bcrypt)  │
  │                            │                           │  Set passwordChangedAt     │
  │                            │                           │  (invalidates all JWTs)    │
  │                            │  { success: true }        │                            │
  │                            │<──────────────────────────│                            │
  │  Redirect to /login        │                           │                            │
  │<───────────────────────────│                           │                            │
```

**Step-by-step:**

1. User submits `{ email }` to `POST /api/auth/forgot-password`
2. The endpoint **always** returns the same success response regardless of whether the email exists — this prevents email enumeration attacks
3. If the account exists and is active, a reset token (1-hour expiry) is generated and emailed to the user
4. User clicks the link in the email → arrives at the `/reset-password` page with the token in the URL
5. User enters a new password and submits `{ token, password }` to `POST /api/auth/reset-password`
6. The token is validated (exists, not expired), then the password is updated with bcrypt hashing
7. `passwordChangedAt` is set on the user document — this **immediately invalidates all existing JWTs** (see [Password Change Session Invalidation](#password-change-session-invalidation-fix-6))

---

### Account Deletion Flow

**Step-by-step:**

1. User submits `{ password, twoFactorCode? }` to `POST /api/auth/request-delete-account`
   - If 2FA is enabled on the account, the `twoFactorCode` field is **required**
2. A confirmation email is sent containing a 1-hour deletion token
3. User clicks the link → arrives at `/confirm-delete-account`
4. The `/confirm-delete-account` page sends a **POST** request with the token in the request body (Fix #2)
   - This is intentional: email security scanners (e.g., Proofpoint, Mimecast) pre-fetch GET links in emails to check for malware. By requiring a POST with the token in the body, automated scanners **cannot** trigger account deletion.
5. On confirmation:
   - The user document is permanently deleted
   - All associated projects, posts, and tags are permanently deleted
   - Auth cookies are cleared
   - Response confirms deletion

---

## Two-Factor Authentication (2FA)

ZazoPostFlow implements **TOTP-based 2FA** compatible with standard authenticator apps (Google Authenticator, Authy, 1Password, etc.).

### Setup Flow

**Step-by-step:**

1. User calls `POST /api/auth/2fa/setup`
   - Response contains the TOTP secret and a **base64-encoded QR code** image:
     ```json
     {
       "secret": "JBSWY3DPEHPK3PXP",
       "qrCode": "data:image/png;base64,iVBORw0KGgo..."
     }
     ```
   - The QR code is generated by the `qrcode` library at **256px** with a **2px margin**
2. User scans the QR code with their authenticator app
3. User enters the current 6-digit code from the app → submits to `POST /api/auth/2fa/verify` with `{ code }`
4. On success:
   - `two_factor_enabled` is set to `true` on the user document
   - 8 backup codes are generated and returned in the response:
     ```json
     {
       "success": true,
       "backupCodes": ["a1b2c3d4", "e5f6g7h8", "i9j0k1l2", "m3n4o5p6", "q7r8s9t0", "u1v2w3x4", "y5z6a7b8", "c9d0e1f2"]
     }
     ```
   - Backup codes are generated as `crypto.randomBytes(4).toString("hex").toUpperCase()` — **8-character uppercase hex strings**
   - **Backup codes are displayed ONCE** — the user must save them securely
5. Backup codes **cannot be viewed again** without providing the account password and a valid TOTP code (see [Backup Codes](#backup-codes))

---

### Disable 2FA

There are two ways to disable 2FA:

#### Via the Application

`POST /api/auth/2fa/disable` with `{ password, code }`

- Both the account password **and** a current TOTP code are required (Fix #6)
- This ensures that even if an attacker gains access to an active session, they cannot disable 2FA without also having the authenticator device

#### Via Email Recovery

If the user has lost access to their authenticator device and has no remaining backup codes:

1. User calls `POST /api/auth/2fa/request-disable-by-email`
2. A 1-hour token is generated and emailed to the user's registered address. The **raw token is hashed with bcrypt (10 rounds)** before storing in the database; the link sent to the user contains the raw token, which is compared against the stored bcrypt hash on verification.
3. User clicks the link → `GET /api/auth/2fa/disable-by-email?token=xxx`
4. 2FA is disabled and the user is redirected to the settings page

---

### Backup Codes

| Property | Value |
|---|---|
| Number of codes | 8 |
| Format | 8-character uppercase hex strings (`crypto.randomBytes(4).toString("hex").toUpperCase()`) |
| Storage | bcrypt-hashed in the `backupCodes` array on the user document |
| Usage | Single-use — consumed and removed on successful authentication |
| Regeneration | Generates 8 new codes, replaces all existing codes |

#### Viewing Backup Codes

`POST /api/auth/2fa/backup-codes` with `{ password, code }`

- Requires the account password and a **TOTP code** (backup codes are **NOT** accepted for this endpoint)
- Returns the current set of plaintext backup codes
- This prevents an attacker who finds a single backup code from retrieving all remaining codes

#### Regenerating Backup Codes

`POST /api/auth/2fa/regenerate-backup-codes`

- Requires authentication (`requireAuth`) and that 2FA is enabled on the account
- Generates 8 new backup codes and **replaces** all existing ones
- The old codes are immediately invalidated

---

## Email System (`src/lib/email.ts`)

All transactional emails are sent through the **Brevo API** (`https://api.brevo.com/v3/smtp/email`).

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `BREVO_API_KEY` | **Yes** | — | API key for the Brevo transactional email service |
| `BREVO_FROM_EMAIL` | No | `noreply@postflow.dev` | Sender email address |
| `NEXT_PUBLIC_APP_URL` | In production | — | Base URL for constructing links in emails (e.g., `https://app.postflow.dev`) |

### Email Types

| Email Type | Function | Token Expiry | Link Format |
|---|---|---|---|
| Email verification | `sendVerificationEmail` | 24 hours | `/verify-email?token=xxx` |
| Password reset | `sendPasswordResetEmail` | 1 hour | `/reset-password?token=xxx` |
| 2FA disable | `sendDisable2FAEmail` | 1 hour | `/api/auth/2fa/disable-by-email?token=xxx` |
| Account deletion | `sendAccountDeletionEmail` | 1 hour | `/confirm-delete-account` (requires POST with token in body) |

### Security Considerations

- **HTML escaping**: All usernames inserted into email templates are HTML-escaped (Fix #13) to prevent XSS/injection attacks in email clients
- **Generic responses**: Endpoints that send emails always return the same response regardless of whether the account exists, preventing email enumeration
- **Token expiry**: All tokens have finite lifetimes (1 hour or 24 hours) to limit the window of opportunity for token theft

---

## Email Validation (`src/lib/email-validator.ts`)

### `validateEmailAdvanced(email)` — 4-Step Async Validation

Used during registration to ensure the provided email address is legitimate and deliverable.

#### Step 1: Syntax Check

Standard email format validation using a regex pattern. Rejects obviously malformed addresses.

#### Step 2: Blocklist Check

Checks the email domain against disposable/temporary email providers:

- Fetches **3 GitHub-hosted disposable email lists** in parallel
- Falls back to a **60+-entry hardcoded fallback** list if the GitHub fetches fail
- Rejects domains like `throwaway.email`, `guerrillamail.com`, etc.

#### Step 3: DNS/MX Check

Verifies that the email domain has valid MX (Mail Exchange) records:

- Uses the **Google DNS-over-HTTPS API** (`https://dns.google/resolve`) to query MX records
- Major providers (gmail.com, outlook.com, yahoo.com, hotmail.com, icloud.com, etc.) are **skipped** — their MX records are known to exist, and querying them would add unnecessary latency
- If no MX records are found, the email is rejected

#### Step 4: External API Check

Queries **4 external email validation APIs in parallel**:

| API | Endpoint |
|---|---|
| Disify | `https://disify.com/api/email/{email}` |
| Kickbox | `https://open.kickbox.com/v1/disposable/{email}` |
| DeBounce | `https://api.debounce.io/v1/?email={email}` |
| ValidatorPizza | `https://www.validator.pizza/email/{email}` |

If **any** API reports the email as disposable or invalid, the validation fails.

### `validateEmail(email)` — Synchronous Simplified Version

A lightweight synchronous function that performs:

- **Syntax check** — standard email format validation
- **TLD validation** — ensures the top-level domain is valid

This is suitable for quick client-side or non-critical server-side checks where the full 4-step validation is not needed.

---

## Rate Limiting (`src/lib/rate-limit.ts`)

An **in-memory** rate limiter using a `Map` for storage. Requests are tracked per IP address.

### IP Resolution Order

The system attempts to identify the client IP from request headers in the following order:

```
1. x-forwarded-for  (first IP in the comma-separated list)
2. x-real-ip
3. 127.0.0.1        (fallback)
```

### Configuration

| Option | Type | Description |
|---|---|---|
| `windowMs` | `number` | Time window in milliseconds |
| `max` | `number` | Maximum number of requests allowed within the window |
| `identifier` | `string` | Unique identifier for the rate limit rule |

### Return Value

```typescript
{
  success: boolean;    // true if the request is allowed
  remaining: number;   // requests remaining in the current window
  resetAt: Date;       // when the current window resets
}
```

### Stale Entry Cleanup

A cleanup interval runs every **5 minutes** to remove expired entries from the in-memory Map, preventing unbounded memory growth.

### Current Rate Limits

For the complete rate limit configuration, see **[RATE-LIMITS.md](./RATE-LIMITS.md)**.

Key auth-related rate limits:

| Endpoint | Window | Max Requests | Identifier |
|---|---|---|---|
| `POST /api/auth/login` | 15 minutes | 5 | `login` |
| `POST /api/auth/register` | 60 minutes | 3 | `register` |
| `POST /api/auth/forgot-password` | 15 minutes | 3 | `forgot-password` |
| `POST /api/auth/2fa/challenge` | 15 minutes | 5 | `2fa-challenge` |

### Limitations

> **Note**: This rate limiter is **in-memory only** and does not persist across server instances. For multi-instance deployments (e.g., Kubernetes, load-balanced servers), an external store such as Redis should be used to share rate limit state across instances.
