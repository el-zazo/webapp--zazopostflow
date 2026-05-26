# Security

Security fixes and considerations for ZazoPostFlow. This document catalogs all 17 documented security fixes in the codebase and outlines the security best practices applied throughout the application.

---

## Table of Contents

- [Security Fixes](#security-fixes)
- [Security Best Practices](#security-best-practices)
  - [Authentication](#authentication)
  - [Input Validation](#input-validation)
  - [Rate Limiting](#rate-limiting)
  - [Email Security](#email-security)
  - [Cookie Security](#cookie-security)

---

## Security Fixes

17 security issues have been identified and resolved in the codebase:

| Fix # | Issue | Solution | Files Affected |
|-------|-------|----------|----------------|
| #1 | JWT secret fallback | App throws if `JWT_SECRET` is missing instead of using a default | `src/lib/auth.ts` |
| #2 | Email scanner account deletion | Changed account deletion confirmation from GET to POST to prevent email scanners from auto-triggering deletion | `src/app/(auth)/confirm-delete-account/page.tsx`, `src/app/api/auth/confirm-delete-account/route.ts` |
| #3 | IDOR on project filter | `projectId` query param validates ownership before applying filter, preventing users from reading posts of projects they don't own | `src/app/api/posts/route.ts` |
| #4 | published_date cleared unintentionally | When updating a post without providing `status`, `published_date` is no longer modified. Only modifies published_date if status is explicitly in the payload | `src/app/api/posts/[id]/route.ts` |
| #5 | APP_URL fallback in production | App throws if `NEXT_PUBLIC_APP_URL` is missing in production instead of using a default | `src/lib/email.ts` |
| #6 | Password change session invalidation | When password changes, `passwordChangedAt` is set. JWT `iat` is compared against it — tokens issued before the change are rejected (1-second leeway). Also requires 2FA code when disabling 2FA | `src/lib/auth.ts`, `src/app/api/auth/reset-password/route.ts`, `src/app/api/user/route.ts`, `src/app/api/auth/2fa/disable/route.ts` |
| #7 | ReDoS via regex search | All user-input search params are escaped with `escapeRegExp()` before being used in MongoDB `$regex` queries | `src/lib/utils.ts`, `src/app/api/posts/route.ts`, `src/app/api/projects/route.ts`, `src/app/api/tags/route.ts` |
| #8 | Double form submission | `useAsyncAction` uses `useRef` instead of `useState` for the guard flag — the ref updates synchronously before React re-render, preventing stale closure double-submits | `src/hooks/useAsyncAction.ts` |
| #9 | Stale fetch race conditions | List pages use AbortController to cancel in-flight requests when new requests are made, preventing stale data from overwriting fresh data | `src/app/(dashboard)/projects/page.tsx`, `src/app/(dashboard)/projects/[id]/page.tsx`, `src/app/(dashboard)/tags/page.tsx` |
| #10 | Dialog closes on async error | `ConfirmDialog` uses controlled open state — the dialog only closes when the async `onConfirm` handler succeeds. On error, a toast is shown and the dialog stays open | `src/components/shared/ConfirmDialog.tsx` |
| #11 | Select value vs defaultValue | `ProjectForm` uses `value` prop instead of `defaultValue` on Select components, ensuring proper form reset when switching between create and edit modes | `src/components/projects/ProjectForm.tsx` |
| #12 | Username whitespace bypass | Username is trimmed with `.trim()` before duplicate check on registration, preventing "john" vs " john " bypass | `src/app/api/auth/register/route.ts` |
| #13 | HTML injection in emails | Usernames are HTML-escaped with `escapeHtml()` before being inserted into email templates, preventing XSS via username | `src/lib/email.ts`, `src/lib/utils.ts` |
| #14 | 401 redirect loops | `apiFetch` intercepts 401 responses, clears cookies, calls `/api/auth/logout`, and redirects to `/login?reason=session_expired`, preventing infinite redirect loops | `src/lib/api-client.ts` |
| #15 | Invalid ObjectId in query | The `tags` query parameter is validated as proper ObjectId before being used in MongoDB queries, preventing BSONTypeError crashes | `src/app/api/projects/route.ts` |
| #16 | Clipboard API failure | `navigator.clipboard.writeText` is wrapped in try/catch, gracefully handling cases where the Clipboard API is unavailable (e.g., non-HTTPS contexts) | `src/components/shared/CopyButton.tsx`, `src/components/posts/PostContentViewer.tsx` |
| #17 | Email verify blocked for logged-in users | `/verify-email` was removed from auth-only middleware routes, allowing users with stale cookies to still verify their email | `src/middleware.ts` |

---

## Security Best Practices

### Authentication

ZazoPostFlow implements a robust authentication system with multiple layers of protection:

- **JWT stored in httpOnly cookies** — Tokens are never exposed to JavaScript, preventing XSS-based token theft. Unlike localStorage, httpOnly cookies cannot be read by client-side scripts.
- **bcrypt password hashing** — Passwords are hashed with 12 salt rounds using bcrypt, which is resistant to brute-force and rainbow table attacks.
- **Session invalidation on password change** — When a user changes their password, all existing sessions are invalidated by comparing the JWT `iat` (issued-at) timestamp against the `passwordChangedAt` timestamp. Tokens issued before the password change are rejected with a 1-second leeway to account for clock skew.
- **TOTP-based 2FA** — Two-factor authentication using time-based one-time passwords (TOTP) is supported, compatible with authenticator apps like Google Authenticator and Authy. Backup codes are provided for recovery.

### Input Validation

All user input is validated and sanitized before processing:

- **Zod schema validation** — Every API endpoint validates its input using Zod schemas. Invalid input is rejected with descriptive error messages before reaching business logic.
- **Regex escaping** — All search parameters are escaped with `escapeRegExp()` before being used in MongoDB `$regex` queries. This prevents Regular Expression Denial of Service (ReDoS) attacks where malicious regex patterns could cause catastrophic backtracking.
- **ObjectId validation** — Query parameters that reference MongoDB ObjectIds are validated before being passed to the database, preventing `BSONTypeError` crashes and potential injection.
- **Email validation pipeline** — Email addresses go through a multi-step validation process: syntax check → blocklist check → DNS MX record verification → external API verification.

### Rate Limiting

IP-based rate limiting is applied to all API endpoints:

- **Stricter limits on auth endpoints** — Authentication endpoints (login, register, forgot-password, etc.) are limited to 3-5 requests per 15-60 minutes to prevent brute-force and credential stuffing attacks.
- **Standard limits on API endpoints** — General API endpoints are limited to 10-60 requests per minute depending on the operation type (read-heavy endpoints allow more, write/delete endpoints allow less).
- **429 responses with headers** — When a rate limit is exceeded, the API returns a `429 Too Many Requests` response with `X-RateLimit-*` headers indicating when the client can retry.

> **Note**: Rate limiting is currently in-memory only. See [RATE-LIMITS.md](./RATE-LIMITS.md) for full details and multi-instance deployment considerations.

### Email Security

Email-related features follow security best practices to prevent abuse and information leakage:

- **Generic error messages** — Authentication endpoints return generic error messages (e.g., "Invalid credentials") instead of revealing whether the username or password was incorrect, preventing email enumeration attacks.
- **HTML escaping** — All user-provided content inserted into email templates (e.g., usernames) is escaped with `escapeHtml()` to prevent HTML injection and XSS in email clients.
- **Token-based verification** — Email verification and password reset use cryptographically random tokens with expiry times ranging from 1 hour to 24 hours.
- **POST method for destructive actions** — Account deletion confirmation uses POST instead of GET, preventing email scanners and prefetch bots from automatically triggering the deletion flow.

### Cookie Security

Authentication cookies are configured with multiple security flags:

| Flag        | Setting             | Purpose                                                      |
|-------------|---------------------|--------------------------------------------------------------|
| `httpOnly`  | `true`              | Prevents JavaScript access to cookies — mitigates XSS token theft |
| `Secure`    | `true` (production) | Ensures cookies are only sent over HTTPS connections         |
| `SameSite`  | `Lax`               | Protects against CSRF attacks while allowing top-level navigations |
| `maxAge`    | 7 days              | Limits session lifetime; requires re-authentication after expiry |

The combination of `httpOnly`, `Secure`, and `SameSite=Lax` provides strong protection against the most common web attacks targeting session cookies.
