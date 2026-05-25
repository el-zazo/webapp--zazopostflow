# ZazoPostFlow API Reference

> **Base URL:** `/api`  
> **Protocol:** HTTPS only

---

## Table of Contents

- [Overview](#overview)
- [Root](#root)
- [Auth Routes](#auth-routes)
  - [POST /api/auth/login](#post-apiauthlogin)
  - [POST /api/auth/register](#post-apiauthregister)
  - [POST /api/auth/logout](#post-apiauthlogout)
  - [GET /api/auth/me](#get-apiauthme)
  - [POST /api/auth/forgot-password](#post-apiauthforgot-password)
  - [POST /api/auth/reset-password](#post-apiauthreset-password)
  - [GET /api/auth/verify-email](#get-apiauthverify-email)
  - [POST /api/auth/validate-email](#post-apiauthvalidate-email)
  - [POST /api/auth/request-delete-account](#post-apiauthrequest-delete-account)
  - [POST /api/auth/confirm-delete-account](#post-apiauthconfirm-delete-account)
- [Two-Factor Authentication Routes](#two-factor-authentication-routes)
  - [POST /api/auth/2fa/setup](#post-apiauth2fasetup)
  - [POST /api/auth/2fa/verify](#post-apiauth2faverify)
  - [POST /api/auth/2fa/challenge](#post-apiauth2fachallenge)
  - [POST /api/auth/2fa/disable](#post-apiauth2fadisable)
  - [GET /api/auth/2fa/disable-by-email](#get-apiauth2fadisable-by-email)
  - [POST /api/auth/2fa/request-disable-by-email](#post-apiauth2farequest-disable-by-email)
  - [POST /api/auth/2fa/backup-codes](#post-apiauth2fabackup-codes)
  - [POST /api/auth/2fa/regenerate-backup-codes](#post-apiauth2faregenerate-backup-codes)
- [Posts Routes](#posts-routes)
  - [GET /api/posts](#get-apiposts)
  - [POST /api/posts](#post-apiposts)
  - [GET /api/posts/[id]](#get-apipostsid)
  - [PUT /api/posts/[id]](#put-apipostsid)
  - [DELETE /api/posts/[id]](#delete-apipostsid)
  - [GET /api/posts/calendar](#get-apipostscalendar)
- [Projects Routes](#projects-routes)
  - [GET /api/projects](#get-apiprojects)
  - [POST /api/projects](#post-apiprojects)
  - [GET /api/projects/[id]](#get-apiprojectsid)
  - [PUT /api/projects/[id]](#put-apiprojectsid)
  - [DELETE /api/projects/[id]](#delete-apiprojectsid)
- [Tags Routes](#tags-routes)
  - [GET /api/tags](#get-apitags)
  - [POST /api/tags](#post-apitags)
  - [PUT /api/tags/[id]](#put-apitagsid)
  - [DELETE /api/tags/[id]](#delete-apitagsid)
- [Dashboard Routes](#dashboard-routes)
  - [GET /api/dashboard](#get-apidashboard)
  - [GET /api/dashboard/stats](#get-apidashboardstats)
  - [GET /api/dashboard/recent-posts](#get-apidashboardrecent-posts)
- [User Route](#user-route)
  - [PUT /api/user](#put-apiuser)

---

## Overview

### Response Format

All API endpoints return JSON using a consistent envelope format:

```json
{
  "success": true,
  "data": {}
}
```

On error:

```json
{
  "success": false,
  "error": "Description of the error"
}
```

Some endpoints include additional top-level fields (e.g. `pagination`, `meta`, `stats`) alongside `success` and `data`.

### Authentication

Authenticated endpoints require a valid JWT stored in the `postflow_token` httpOnly cookie. The cookie is set automatically on login and cleared on logout or account deletion.

### Rate Limiting

Rate-limited endpoints return a **429 Too Many Requests** status when the limit is exceeded. The response includes these headers:

| Header | Description |
|---|---|
| `X-RateLimit-Limit` | Maximum requests allowed in the window |
| `X-RateLimit-Remaining` | Requests remaining in the current window |
| `X-RateLimit-Reset` | Timestamp when the rate limit window resets |

Rate-limited auth endpoints may also include a `retryAfter` field in the response body.

### Error Codes

| Code | Meaning |
|---|---|
| `400` | Bad Request — validation error or invalid input |
| `401` | Unauthorized — missing or invalid credentials |
| `403` | Forbidden — authenticated but not authorized (e.g. unverified email, not owner) |
| `404` | Not Found — resource does not exist |
| `409` | Conflict — duplicate resource (e.g. email/username already taken) |
| `429` | Too Many Requests — rate limit exceeded |
| `500` | Internal Server Error |

---

## Root

### GET /api

Health check / welcome endpoint.

| Property | Value |
|---|---|
| **Auth** | None |
| **Rate Limit** | None |

#### Response

```json
{
  "message": "Hello, world!"
}
```

---

## Auth Routes

### POST /api/auth/login

Authenticate a user with email and password. If 2FA is enabled on the account, the response indicates that a second step is required.

| Property | Value |
|---|---|
| **Auth** | None |
| **Rate Limit** | 5 requests / 15 minutes (`auth:login`) |

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "mypassword"
}
```

| Field | Type | Validation | Required |
|---|---|---|---|
| `email` | `string` | Valid email format | Yes |
| `password` | `string` | Min 1 character | Yes |

Validated with Zod.

#### Responses

**200 — Login successful (no 2FA)**

Sets `postflow_token` httpOnly cookie (7-day expiry).

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "string",
      "username": "string",
      "email": "string",
      "avatar": "string",
      "theme": "string"
    }
  }
}
```

**200 — 2FA code required**

```json
{
  "success": true,
  "requires2FA": true,
  "userId": "string",
  "message": "2FA code required"
}
```

**401 — Invalid email or password**

```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

**403 — Account not verified**

```json
{
  "success": false,
  "error": "Please verify your email before logging in. Check your inbox.",
  "notVerified": true
}
```

**400 — Validation error**

**429 — Rate limit exceeded** (includes `retryAfter`)

**500 — Server error**

---

### POST /api/auth/register

Create a new account. Does **not** auto-login — the user must verify their email first.

| Property | Value |
|---|---|
| **Auth** | None |
| **Rate Limit** | 3 requests / 1 hour (`auth:register`) |

#### Request Body

```json
{
  "username": "myuser",
  "email": "user@example.com",
  "password": "securepass",
  "confirmPassword": "securepass"
}
```

| Field | Type | Validation | Required |
|---|---|---|---|
| `username` | `string` | 3–30 characters | Yes |
| `email` | `string` | Valid email format | Yes |
| `password` | `string` | Min 6 characters | Yes |
| `confirmPassword` | `string` | Must match `password` | Yes |

Validated with Zod (includes `.refine()` for password match).

Advanced email validation is performed via `validateEmailAdvanced` (syntax check, blocklist, DNS/MX verification, and 4 external APIs). The username is **trimmed** before duplicate checking (Fix #12).

#### Responses

**200 — Account created**

```json
{
  "success": true,
  "message": "Account created! Please check your email to verify your account.",
  "email": "user@example.com"
}
```

**400 — Account exists but not verified (verification email resent)**

```json
{
  "success": false,
  "error": "Account exists but not verified. A new verification email has been sent.",
  "resent": true
}
```

**400 — Email validation failed**

```json
{
  "success": false,
  "error": "<reason from validation>"
}
```

**409 — Email already registered (verified)**

```json
{
  "success": false,
  "error": "Email already registered"
}
```

**409 — Username already taken**

```json
{
  "success": false,
  "error": "Username already taken"
}
```

**429 — Rate limit exceeded**

**500 — Server error** (if email sending fails, the created user is deleted to prevent orphan accounts)

---

### POST /api/auth/logout

Clear the authentication cookie and end the session.

| Property | Value |
|---|---|
| **Auth** | None |
| **Rate Limit** | None |

#### Request Body

None required.

#### Responses

**200 — Logged out**

Clears the `postflow_token` cookie and a fallback cookie.

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET /api/auth/me

Retrieve the currently authenticated user's profile.

| Property | Value |
|---|---|
| **Auth** | Required (JWT from cookie) |
| **Rate Limit** | 60 requests / minute (`auth:me`) |

#### Query Parameters

None.

#### Responses

**200 — Success**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "string",
      "username": "string",
      "email": "string",
      "avatar": "string",
      "theme": "string",
      "active": true,
      "two_factor_enabled": false,
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    }
  }
}
```

**401 — Unauthorized**

**404 — User not found**

**500 — Server error**

---

### POST /api/auth/forgot-password

Request a password reset link. Always returns the same response to prevent email enumeration.

| Property | Value |
|---|---|
| **Auth** | None |
| **Rate Limit** | 3 requests / hour (`auth:forgot-password`) |

#### Request Body

```json
{
  "email": "user@example.com"
}
```

| Field | Type | Required |
|---|---|---|
| `email` | `string` | Yes |

#### Responses

**200 — Always returned (prevents enumeration)**

If the account exists, a password reset email is sent with a 1-hour expiring token.

```json
{
  "success": true,
  "data": {
    "message": "If an account with that email exists, we've sent a password reset link."
  }
}
```

**429 — Rate limit exceeded**

---

### POST /api/auth/reset-password

Reset a password using a valid reset token.

| Property | Value |
|---|---|
| **Auth** | None |
| **Rate Limit** | 5 requests / 15 minutes (`auth:reset-password`) |

#### Request Body

```json
{
  "token": "reset-token-from-email",
  "password": "newsecurepassword"
}
```

| Field | Type | Validation | Required |
|---|---|---|---|
| `token` | `string` | — | Yes |
| `password` | `string` | Min 6 characters | Yes |

On success, `passwordChangedAt` is set on the user record to invalidate any existing JWTs (Fix #6).

#### Responses

**200 — Password reset successfully**

```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully"
  }
}
```

**400 — Invalid or expired token**

```json
{
  "success": false,
  "error": "Invalid or expired reset token"
}
```

**429 — Rate limit exceeded**

---

### GET /api/auth/verify-email

Verify a user's email address using the token from the verification email.

| Property | Value |
|---|---|
| **Auth** | None (token in query string) |
| **Rate Limit** | 5 requests / 15 minutes (`auth:verify-email`) |

#### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `token` | `string` | Yes | Email verification token |

#### Responses

**200 — Email verified**

Activates the account (`active: true`) and clears the verification token.

```json
{
  "success": true,
  "message": "Email verified successfully!"
}
```

**400 — Missing token**

```json
{
  "success": false,
  "error": "Verification token is required"
}
```

**400 — Invalid or expired token**

```json
{
  "success": false,
  "error": "Invalid or expired verification token"
}
```

**429 — Rate limit exceeded**

---

### POST /api/auth/validate-email

Validate an email address using the advanced multi-step validation pipeline. Useful for real-time form validation during registration.

| Property | Value |
|---|---|
| **Auth** | None |
| **Rate Limit** | None |

#### Request Body

```json
{
  "email": "user@example.com"
}
```

| Field | Type | Required |
|---|---|---|
| `email` | `string` | No |

#### Validation Pipeline

1. **Syntax** — basic email format check
2. **Blocklist** — check against disposable/blocked domains
3. **DNS/MX** — verify the domain has valid mail exchange records
4. **External APIs** — validate via 4 external verification services

#### Responses

**200 — Valid email**

```json
{
  "valid": true,
  "message": null
}
```

**200 — Invalid email**

```json
{
  "valid": false,
  "message": "Reason for invalidity"
}
```

**200 — Internal error (benefit of doubt)**

On internal validation error, the endpoint returns `{ valid: true }` to avoid blocking legitimate users due to service failures.

```json
{
  "valid": true,
  "message": null
}
```

---

### POST /api/auth/request-delete-account

Request account deletion. Sends a confirmation email with a 1-hour token.

| Property | Value |
|---|---|
| **Auth** | Required |
| **Rate Limit** | 3 requests / hour (`auth:request-delete-account`) |

#### Request Body

```json
{
  "password": "currentpassword",
  "twoFactorCode": "123456"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `password` | `string` | Yes | Current account password |
| `twoFactorCode` | `string` | If 2FA enabled | TOTP code or backup code |

#### Responses

**200 — 2FA code required (2FA enabled but no code provided)**

```json
{
  "success": true,
  "requires2FA": true,
  "message": "2FA code required"
}
```

**200 — Confirmation email sent**

If credentials are valid, a deletion confirmation email is sent with a 1-hour expiring token.

```json
{
  "success": true,
  "message": "If your credentials are correct, a confirmation email has been sent.",
  "email": "user@example.com"
}
```

**429 — Rate limit exceeded**

**401 — Invalid credentials**

---

### POST /api/auth/confirm-delete-account

Confirm and execute account deletion. Uses POST body for the token (Fix #2) to prevent email scanners from accidentally triggering deletion via GET requests.

| Property | Value |
|---|---|
| **Auth** | None (token in POST body) |
| **Rate Limit** | None |

#### Request Body

Validated with Zod.

```json
{
  "token": "deletion-token-from-email"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `token` | `string` | Yes | Deletion confirmation token from email |

#### Deletion Scope

- The User record
- All Projects owned by the user
- All Posts within those projects
- All Tags owned by the user
- All auth cookies are cleared

#### Responses

**200 — Account and data deleted**

```json
{
  "success": true,
  "message": "Your account and all associated data have been permanently deleted."
}
```

**400 — Invalid or expired token**

```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

---

## Two-Factor Authentication Routes

### POST /api/auth/2fa/setup

Begin the 2FA setup process. Generates a TOTP secret and QR code. 2FA is **not** enabled until verified via the [`/2fa/verify`](#post-apiauth2faverify) endpoint.

| Property | Value |
|---|---|
| **Auth** | Required |
| **Rate Limit** | None |

#### Request Body

None required.

#### Responses

**200 — Setup initiated**

```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgo..."
  }
}
```

| Field | Type | Description |
|---|---|---|
| `secret` | `string` | TOTP shared secret (for manual entry) |
| `qrCode` | `string` | Base64 data URL of QR code image |

---

### POST /api/auth/2fa/verify

Verify a TOTP code to complete 2FA setup and enable it on the account.

| Property | Value |
|---|---|
| **Auth** | Required |
| **Rate Limit** | None |

#### Request Body

```json
{
  "code": "123456"
}
```

| Field | Type | Validation | Required |
|---|---|---|---|
| `code` | `string` | Exactly 6 digits | Yes |

#### Responses

**200 — 2FA enabled**

Sets `two_factor_enabled: true` on the user and generates 8 backup codes.

```json
{
  "success": true,
  "message": "2FA enabled successfully",
  "data": {
    "backupCodes": [
      "abc12345",
      "def67890",
      "ghi13579",
      "jkl24680",
      "mno98765",
      "pqr43210",
      "stu56789",
      "vwx01234"
    ]
  }
}
```

**400 — Invalid verification code**

```json
{
  "success": false,
  "error": "Invalid verification code"
}
```

---

### POST /api/auth/2fa/challenge

Complete the second factor of authentication during login. Accepts either a TOTP code or a backup code.

| Property | Value |
|---|---|
| **Auth** | None (used during login flow) |
| **Rate Limit** | 5 requests / 15 minutes (`auth:2fa:challenge`) |

#### Request Body

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "code": "123456"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | Yes | User ID from the login response |
| `code` | `string` | Yes | 6-digit TOTP code or a backup code |

Backup codes are consumed on use and removed from the array. They are hashed with bcrypt for storage.

#### Responses

**200 — Login successful**

Sets the `postflow_token` httpOnly cookie.

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "string",
      "username": "string",
      "email": "string",
      "avatar": "string",
      "theme": "string"
    }
  },
  "usedBackupCode": false,
  "remainingBackupCodes": 8
}
```

**401 — Invalid code or backup code**

```json
{
  "success": false,
  "error": "Invalid verification code"
}
```

**429 — Rate limit exceeded**

---

### POST /api/auth/2fa/disable

Disable two-factor authentication on the authenticated user's account. Requires both the account password and a valid TOTP/backup code (Fix #6).

| Property | Value |
|---|---|
| **Auth** | Required |
| **Rate Limit** | None |

#### Request Body

```json
{
  "password": "currentpassword",
  "code": "123456"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `password` | `string` | Yes | Current account password |
| `code` | `string` | Yes | TOTP code or backup code |

Both fields are required (Fix #6).

#### Responses

**200 — 2FA disabled**

Clears `two_factor_secret` and `two_factor_backup_codes` on the user.

```json
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

**400 — Invalid code**

**401 — Invalid password**

---

### GET /api/auth/2fa/disable-by-email

Disable 2FA via email link (for users who have lost access to their authenticator app). The token in the query string is compared against bcrypt-hashed candidates stored in the database.

| Property | Value |
|---|---|
| **Auth** | None (triggered by email link) |
| **Rate Limit** | None |

#### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `token` | `string` | Yes | Disable-2FA token from email |

#### Responses

This endpoint **redirects** rather than returning JSON.

**302 — Success**

Redirects to: `/settings?tab=security&disabled=true`

**302 — Invalid token**

Redirects to: `/settings?tab=security&error=invalid-token`

---

### POST /api/auth/2fa/request-disable-by-email

Request an email containing a link to disable 2FA. Always returns the same response regardless of whether 2FA is actually enabled, preventing status enumeration.

| Property | Value |
|---|---|
| **Auth** | Required |
| **Rate Limit** | 3 requests / hour (`auth:2fa:request-disable-by-email`) |

#### Request Body

None required.

#### Responses

**200 — Always returned**

If 2FA is enabled, a bcrypt-hashed token is generated and a disable-2FA email is sent.

```json
{
  "success": true,
  "message": "If 2FA is enabled on your account, an email has been sent."
}
```

**429 — Rate limit exceeded**

---

### POST /api/auth/2fa/backup-codes

Retrieve existing backup codes. Requires password and a TOTP code (**backup codes are NOT accepted** for this endpoint).

| Property | Value |
|---|---|
| **Auth** | Required |
| **Rate Limit** | None |

#### Request Body

```json
{
  "password": "currentpassword",
  "code": "123456"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `password` | `string` | Yes | Current account password |
| `code` | `string` | Yes | TOTP code only (backup codes not accepted) |

#### Responses

**200 — Backup codes returned**

```json
{
  "success": true,
  "data": {
    "backupCodes": ["abc12345", "def67890", "..."],
    "remainingCount": 6
  }
}
```

**400 — Invalid TOTP code**

**401 — Invalid password**

---

### POST /api/auth/2fa/regenerate-backup-codes

Generate a fresh set of 8 backup codes, replacing all existing ones.

| Property | Value |
|---|---|
| **Auth** | Required |
| **Rate Limit** | None |

#### Request Body

None required. The user must have 2FA already enabled.

#### Responses

**200 — Backup codes regenerated**

```json
{
  "success": true,
  "message": "Backup codes regenerated successfully",
  "data": {
    "backupCodes": [
      "new1abc2",
      "new3def4",
      "new5ghi6",
      "new7jkl8",
      "new9mno0",
      "new1pqr2",
      "new3stu4",
      "new5vwx6"
    ]
  }
}
```

**400 — 2FA not enabled**

```json
{
  "success": false,
  "error": "2FA is not enabled on your account"
}
```

---

## Posts Routes

### GET /api/posts

List posts belonging to the authenticated user with filtering, sorting, and pagination.

| Property | Value |
|---|---|
| **Auth** | Required |
| **Rate Limit** | 60 requests / minute (`api:posts:get`) |

#### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `projectId` | `string` | — | Filter by project. Ownership is validated (Fix #3). |
| `status` | `string` | — | `"draft"` \| `"scheduled"` \| `"published"` \| `"all"` |
| `type` | `string` | — | `"main"` \| `"group"` \| `"all"` |
| `search` | `string` | — | Regex search on post name (escaped with `escapeRegExp`, Fix #7) |
| `mediaFilter` | `string` | `"all"` | `"has_images"` \| `"has_videos"` \| `"has_both"` \| `"none"` \| `"all"` |
| `sortBy` | `string` | `"createdAt"` | `"createdAt"` \| `"updatedAt"` \| `"scheduled_date"` \| `"published_date"` \| `"status"` \| `"type"` \| `"name"` |
| `sortOrder` | `string` | `"desc"` | `"asc"` \| `"desc"` |
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `10` | Results per page (1–100) |
| `sort` | `string` | — | Legacy param: `"newest"` \| `"oldest"` \| `"scheduled"` \| `"status"` |

Populates `project_id` with the project name.

#### Responses

**200 — Success**

```json
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "project_id": { "_id": "string", "name": "string" },
      "name": "string",
      "content": "string",
      "type": "main",
      "platform": "string",
      "status": "draft",
      "has_images": false,
      "has_videos": false,
      "scheduled_date": "ISO 8601",
      "published_date": "ISO 8601",
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    }
  ],
  "pagination": {
    "totalItems": 42,
    "totalPages": 5,
    "currentPage": 1,
    "limit": 10
  }
}
```

**404 — Project not found / not owned**

```json
{
  "success": false,
  "error": "Project not found"
}
```

**401 — Unauthorized**

---

### POST /api/posts

Create a new post.

| Property | Value |
|---|---|
| **Auth** | Required |
| **Rate Limit** | 20 requests / minute (`api:posts:post`) |

#### Request Body

Validated with Zod.

```json
{
  "project_id": "507f1f77bcf86cd799439011",
  "name": "My New Post",
  "content": "Post content here...",
  "type": "main",
  "platform": "twitter",
  "scheduled_date": "2025-07-01T10:00:00.000Z",
  "published_date": null,
  "status": "draft",
  "has_videos": false,
  "has_images": true
}
```

| Field | Type | Validation | Default | Required |
|---|---|---|---|---|
| `project_id` | `string` | Min 1 character | — | Yes |
| `name` | `string` | 1–100 characters | — | Yes |
| `content` | `string` | Min 1 character | — | Yes |
| `type` | `string` | `"main"` \| `"group"` | — | No |
| `platform` | `string` | — | — | No |
| `scheduled_date` | `string \| null` | ISO date or null | — | No |
| `published_date` | `string \| null` | ISO date or null | — | No |
| `status` | `string` | `"draft"` \| `"scheduled"` \| `"published"` | — | No |
| `has_videos` | `boolean` | — | `false` | No |
| `has_images` | `boolean` | — | `false` | No |

When `status` is `"published"`, `published_date` is automatically set to the provided date or `new Date()` if omitted. If status is not `"published"`, `published_date` is cleared.

Ownership is verified through the project → user lookup.

#### Responses

**201 — Post created**

```json
{
  "success": true,
  "data": {
    "_id": "string",
    "project_id": "string",
    "name": "My New Post",
    "content": "Post content here...",
    "type": "main",
    "status": "draft",
    "has_images": true,
    "has_videos": false,
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

**404 — Project not found or not owned**

**401 — Unauthorized**

**400 — Validation error**

---

### GET /api/posts/[id]

Retrieve a single post by ID.

| Property | Value |
|---|---|
| **Auth** | Required (ownership verified through project → user chain) |
| **Rate Limit** | None |

#### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | `string` | Post ID |

Populates `project_id` with the project name and `user_id`.

#### Responses

**200 — Success**

```json
{
  "success": true,
  "data": {
    "_id": "string",
    "project_id": {
      "_id": "string",
      "name": "string",
      "user_id": "string"
    },
    "name": "string",
    "content": "string",
    "type": "main",
    "platform": "string",
    "status": "draft",
    "has_images": false,
    "has_videos": false,
    "scheduled_date": "ISO 8601",
    "published_date": "ISO 8601",
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

**403 — Unauthorized (not the owner)**

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**404 — Post not found**

```json
{
  "success": false,
  "error": "Post not found"
}
```

**401 — Unauthenticated**

---

### PUT /api/posts/[id]

Update an existing post. All fields are optional (partial update).

| Property | Value |
|---|---|
| **Auth** | Required (ownership verified) |
| **Rate Limit** | 20 requests / minute (`api:posts:id:put`) |

#### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | `string` | Post ID |

#### Request Body

Same schema as [create](#post-apiposts), but **all fields are optional**. Only included fields are updated.

```json
{
  "name": "Updated Title",
  "status": "published"
}
```

**Smart `published_date` handling (Fix #4):** Only modifies `published_date` if `status` is explicitly provided in the payload. If `status` is set to `"published"` and no `published_date` is given, it defaults to `new Date()`.

#### Responses

**200 — Post updated**

```json
{
  "success": true,
  "data": {
    "_id": "string",
    "name": "Updated Title",
    "status": "published",
    "published_date": "2025-07-01T12:00:00.000Z",
    "..."
  }
}
```

**403 — Unauthorized (not the owner)**

**404 — Post not found**

**401 — Unauthenticated**

**400 — Validation error**

---

### DELETE /api/posts/[id]

Delete a post.

| Property | Value |
|---|---|
| **Auth** | Required (ownership verified) |
| **Rate Limit** | 10 requests / minute (`api:posts:id:delete`) |

#### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | `string` | Post ID |

#### Responses

**200 — Post deleted**

```json
{
  "success": true,
  "data": {
    "message": "Post deleted"
  }
}
```

**403 — Unauthorized (not the owner)**

**404 — Post not found**

**401 — Unauthenticated**

---

### GET /api/posts/calendar

Retrieve posts organized by day for a calendar view. Returns posts that have a `scheduled_date` or `published_date` within the specified month.

| Property | Value |
|---|---|
| **Auth** | Required |
| **Rate Limit** | 30 requests / minute (`api:posts:calendar:get`) |

#### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `year` | `number` | Current year | Calendar year |
| `month` | `number` | Current month | Month number (1–12) |

#### Responses

**200 — Success**

```json
{
  "success": true,
  "data": {
    "1": [
      {
        "_id": "string",
        "name": "Scheduled Post",
        "status": "scheduled",
        "type": "main",
        "has_images": true,
        "has_videos": false,
        "scheduled_date": "2025-07-01T10:00:00.000Z",
        "published_date": null,
        "projectName": "My Project",
        "projectId": "string"
      }
    ],
    "15": [
      {
        "_id": "string",
        "name": "Published Post",
        "status": "published",
        "type": "group",
        "has_images": false,
        "has_videos": true,
        "scheduled_date": null,
        "published_date": "2025-07-15T14:00:00.000Z",
        "projectName": "Another Project",
        "projectId": "string"
      }
    ]
  },
  "meta": {
    "year": 2025,
    "month": 7
  }
}
```

The `data` object uses the day of the month (as a string) as the key. Days with no posts are omitted.

**CalendarPost shape:**

| Field | Type | Description |
|---|---|---|
| `_id` | `string` | Post ID |
| `name` | `string` | Post name |
| `status` | `string` | Post status |
| `type` | `string` | Post type |
| `has_images` | `boolean` | Whether post has images |
| `has_videos` | `boolean` | Whether post has videos |
| `scheduled_date` | `string \| null` | Scheduled date |
| `published_date` | `string \| null` | Published date |
| `projectName` | `string` | Name of the parent project |
| `projectId` | `string` | ID of the parent project |

**401 — Unauthorized**

---

## Projects Routes

### GET /api/projects

List projects belonging to the authenticated user with filtering, sorting, and pagination.

| Property | Value |
|---|---|
| **Auth** | Required |
| **Rate Limit** | 60 requests / minute (`api:projects:get`) |

#### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `status` | `string` | — | `"active"` \| `"archived"` \| `"all"` |
| `search` | `string` | — | Regex search on project name and matching tag names (escaped with `escapeRegExp`, Fix #7) |
| `tag` | `string` | — | Legacy single tag filter by ObjectId |
| `tags` | `string` | — | Comma-separated tag IDs. All must match. Validated as ObjectId (Fix #15). Invalid ID → 400 |
| `sortBy` | `string` | `"createdAt"` | Any field. Supported: `createdAt`, `updatedAt`, `name`, `postsCount`, `tagsCount`, `status` |
| `sortOrder` | `string` | `"desc"` | `"asc"` \| `"desc"` |
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `10` | Results per page (1–100) |

Uses an aggregation pipeline with `$lookup` for `postsCount` and `tagsCount`, `$facet` for pagination, and tag population.

#### Responses

**200 — Success**

```json
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "name": "My Project",
      "description": "A project description",
      "github_link": "https://github.com/...",
      "demo_link": "https://demo.example.com",
      "status": "active",
      "tags": [
        { "_id": "string", "name": "React" }
      ],
      "postsCount": 12,
      "tagsCount": 3,
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    }
  ],
  "pagination": {
    "totalItems": 7,
    "totalPages": 1,
    "currentPage": 1,
    "limit": 10
  }
}
```

**400 — Invalid tag ID**

```json
{
  "success": false,
  "error": "Invalid tag ID: <id>"
}
```

**401 — Unauthorized**

---

### POST /api/projects

Create a new project.

| Property | Value |
|---|---|
| **Auth** | Required |
| **Rate Limit** | 20 requests / minute (`api:projects:post`) |

#### Request Body

Validated with Zod.

```json
{
  "name": "My New Project",
  "description": "Project description",
  "github_link": "https://github.com/user/repo",
  "demo_link": "https://demo.example.com",
  "tags": ["507f1f77bcf86cd799439011"],
  "status": "active"
}
```

| Field | Type | Validation | Default | Required |
|---|---|---|---|---|
| `name` | `string` | 1–100 characters | — | Yes |
| `description` | `string` | Max 500 characters | — | No |
| `github_link` | `string` | Valid URL or empty string | — | No |
| `demo_link` | `string` | Valid URL or empty string | — | No |
| `tags` | `string[]` | Array of tag ObjectIds | — | No |
| `status` | `string` | `"active"` \| `"archived"` | — | No |

Tags are populated in the response.

#### Responses

**201 — Project created**

```json
{
  "success": true,
  "data": {
    "_id": "string",
    "name": "My New Project",
    "description": "Project description",
    "github_link": "https://github.com/user/repo",
    "demo_link": "https://demo.example.com",
    "status": "active",
    "tags": [
      { "_id": "string", "name": "React" }
    ],
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

**400 — Validation error**

**401 — Unauthorized**

---

### GET /api/projects/[id]

Retrieve a single project by ID.

| Property | Value |
|---|---|
| **Auth** | Required (ownership verified) |
| **Rate Limit** | None |

#### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | `string` | Project ID |

Includes `postsCount` and populated tags.

#### Responses

**200 — Success**

```json
{
  "success": true,
  "data": {
    "_id": "string",
    "name": "My Project",
    "description": "string",
    "github_link": "string",
    "demo_link": "string",
    "status": "active",
    "tags": [
      { "_id": "string", "name": "React" }
    ],
    "postsCount": 12,
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

**403 — Unauthorized (not the owner)**

**404 — Project not found**

**401 — Unauthenticated**

---

### PUT /api/projects/[id]

Update an existing project. All fields are optional (partial update).

| Property | Value |
|---|---|
| **Auth** | Required (ownership verified) |
| **Rate Limit** | 20 requests / minute (`api:projects:id:put`) |

#### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | `string` | Project ID |

#### Request Body

Same schema as [create](#post-apiprojects), but all fields are optional.

```json
{
  "name": "Updated Project Name",
  "status": "archived"
}
```

Tags are populated in the response.

#### Responses

**200 — Project updated**

```json
{
  "success": true,
  "data": {
    "_id": "string",
    "name": "Updated Project Name",
    "status": "archived",
    "tags": [],
    "..."
  }
}
```

**403 — Unauthorized (not the owner)**

**404 — Project not found**

**401 — Unauthenticated**

**400 — Validation error**

---

### DELETE /api/projects/[id]

Delete a project. **Cascading delete** — all posts within the project are also deleted.

| Property | Value |
|---|---|
| **Auth** | Required (ownership verified) |
| **Rate Limit** | 10 requests / minute (`api:projects:id:delete`) |

#### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | `string` | Project ID |

#### Responses

**200 — Project deleted**

```json
{
  "success": true,
  "data": {
    "message": "Project deleted"
  }
}
```

**403 — Unauthorized (not the owner)**

**404 — Project not found**

**401 — Unauthenticated**

---

## Tags Routes

### GET /api/tags

List tags belonging to the authenticated user with filtering, sorting, and pagination.

| Property | Value |
|---|---|
| **Auth** | Required |
| **Rate Limit** | 60 requests / minute (`api:tags:get`) |

#### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `search` | `string` | — | Regex search on tag name (escaped with `escapeRegExp`, Fix #7) |
| `filter` | `string` | — | `"all"` \| `"used"` \| `"unused"` |
| `sortBy` | `string` | `"createdAt"` | Any field |
| `sortOrder` | `string` | `"desc"` | `"asc"` \| `"desc"` |
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `20` | Results per page (1–100) |

Uses aggregation with `$lookup` for `projectsCount` and `$facet` for pagination.

#### Responses

**200 — Success**

```json
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "name": "React",
      "projectsCount": 5,
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    }
  ],
  "pagination": {
    "totalItems": 15,
    "totalPages": 1,
    "currentPage": 1,
    "limit": 20
  }
}
```

**401 — Unauthorized**

---

### POST /api/tags

Create a new tag.

| Property | Value |
|---|---|
| **Auth** | Required |
| **Rate Limit** | 20 requests / minute (`api:tags:post`) |

#### Request Body

```json
{
  "name": "TypeScript"
}
```

| Field | Type | Validation | Required |
|---|---|---|---|
| `name` | `string` | 1–50 characters | Yes |

Case-insensitive uniqueness check with escaped regex (Fix #7).

#### Responses

**201 — Tag created**

```json
{
  "success": true,
  "data": {
    "_id": "string",
    "name": "TypeScript",
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

**409 — Duplicate tag**

```json
{
  "success": false,
  "error": "Tag already exists"
}
```

**400 — Validation error**

**401 — Unauthorized**

---

### PUT /api/tags/[id]

Update an existing tag.

| Property | Value |
|---|---|
| **Auth** | Required (ownership verified) |
| **Rate Limit** | 20 requests / minute (`api:tags:id:put`) |

#### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | `string` | Tag ID |

#### Request Body

```json
{
  "name": "Updated Tag Name"
}
```

| Field | Type | Required |
|---|---|---|
| `name` | `string` | Yes |

Case-insensitive uniqueness check excluding the current tag (self).

#### Responses

**200 — Tag updated**

```json
{
  "success": true,
  "data": {
    "_id": "string",
    "name": "Updated Tag Name",
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

**409 — Duplicate tag name**

```json
{
  "success": false,
  "error": "Tag already exists"
}
```

**403 — Unauthorized (not the owner)**

**404 — Tag not found**

**401 — Unauthenticated**

---

### DELETE /api/tags/[id]

Delete a tag. Automatically cleans up references by using `$pull` to remove the tag from all projects that reference it.

| Property | Value |
|---|---|
| **Auth** | Required (ownership verified) |
| **Rate Limit** | 10 requests / minute (`api:tags:id:delete`) |

#### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | `string` | Tag ID |

#### Responses

**200 — Tag deleted**

```json
{
  "success": true,
  "data": {
    "message": "Tag deleted"
  }
}
```

**403 — Unauthorized (not the owner)**

**404 — Tag not found**

**401 — Unauthenticated**

---

## Dashboard Routes

### GET /api/dashboard

Retrieve combined dashboard data including stats and recent posts. Uses graceful error handling — returns zeros and empty arrays on failure rather than 500 errors.

| Property | Value |
|---|---|
| **Auth** | Required |
| **Rate Limit** | 30 requests / minute (`api:dashboard:get`) |

#### Query Parameters

None.

#### Responses

**200 — Success**

```json
{
  "success": true,
  "stats": {
    "totalProjects": 7,
    "totalPosts": 42,
    "scheduledThisWeek": 3,
    "publishedThisMonth": 12
  },
  "recentPosts": [
    {
      "_id": "string",
      "name": "Recent Post Title",
      "status": "published",
      "projectName": "My Project",
      "createdAt": "ISO 8601"
    }
  ]
}
```

On internal failure, `stats` defaults to all zeros and `recentPosts` defaults to an empty array — the endpoint never returns a 500 status.

**401 — Unauthorized**

---

### GET /api/dashboard/stats

Retrieve dashboard statistics only.

| Property | Value |
|---|---|
| **Auth** | Required |
| **Rate Limit** | None |

#### Query Parameters

None.

#### Responses

**200 — Success**

```json
{
  "totalProjects": 7,
  "totalPosts": 42,
  "scheduledThisWeek": 3,
  "publishedThisMonth": 12
}
```

On internal failure, returns all zeros:

```json
{
  "totalProjects": 0,
  "totalPosts": 0,
  "scheduledThisWeek": 0,
  "publishedThisMonth": 0
}
```

**401 — Unauthorized**

---

### GET /api/dashboard/recent-posts

Retrieve the 5 most recent posts with project information.

| Property | Value |
|---|---|
| **Auth** | Required |
| **Rate Limit** | None |

#### Query Parameters

None.

#### Responses

**200 — Success**

```json
[
  {
    "_id": "string",
    "name": "Recent Post",
    "status": "draft",
    "type": "main",
    "projectName": "My Project",
    "scheduled_date": "ISO 8601",
    "published_date": null,
    "createdAt": "ISO 8601"
  }
]
```

On internal failure, returns an empty array:

```json
[]
```

**401 — Unauthorized**

---

## User Route

### PUT /api/user

Update the authenticated user's profile. Uses **action-based routing** — the `action` field in the request body determines which update is performed.

| Property | Value |
|---|---|
| **Auth** | Required |
| **Rate Limit** | 10 requests / minute (`api:user:put`) |

---

#### Action: `profile`

Update the user's username.

**Request Body**

```json
{
  "action": "profile",
  "username": "newusername"
}
```

| Field | Type | Validation | Required |
|---|---|---|---|
| `action` | `string` | Must be `"profile"` | Yes |
| `username` | `string` | 3–30 characters | Yes |

Checks username uniqueness before updating.

**Response — 200**

```json
{
  "success": true,
  "data": {
    "_id": "string",
    "username": "newusername",
    "email": "user@example.com",
    "avatar": "string",
    "theme": "string"
  }
}
```

**409 — Username already taken**

---

#### Action: `password`

Change the user's password. If 2FA is enabled, a TOTP or backup code is required.

**Request Body**

```json
{
  "action": "password",
  "currentPassword": "oldpassword",
  "newPassword": "newsecurepassword",
  "confirmPassword": "newsecurepassword",
  "twoFactorCode": "123456"
}
```

| Field | Type | Validation | Required |
|---|---|---|---|
| `action` | `string` | Must be `"password"` | Yes |
| `currentPassword` | `string` | — | Yes |
| `newPassword` | `string` | Min 6 characters | Yes |
| `confirmPassword` | `string` | Must match `newPassword` | Yes |
| `twoFactorCode` | `string` | TOTP or backup code | If 2FA enabled |

On success, `passwordChangedAt` is set to invalidate all existing JWTs (Fix #6).

**Response — 200**

```json
{
  "success": true,
  "data": {
    "_id": "string",
    "username": "string",
    "email": "string",
    "avatar": "string",
    "theme": "string"
  }
}
```

**200 — 2FA code required (2FA enabled but no code provided)**

```json
{
  "success": false,
  "requires2FA": true
}
```

**401 — Invalid current password**

**400 — Validation error**

---

#### Action: `theme`

Update the user's theme preference.

**Request Body**

```json
{
  "action": "theme",
  "theme": "dark"
}
```

| Field | Type | Validation | Required |
|---|---|---|---|
| `action` | `string` | Must be `"theme"` | Yes |
| `theme` | `string` | `"dark"` \| `"light"` | Yes |

**Response — 200**

```json
{
  "success": true,
  "data": {
    "_id": "string",
    "username": "string",
    "email": "string",
    "avatar": "string",
    "theme": "dark"
  }
}
```

**400 — Validation error**
