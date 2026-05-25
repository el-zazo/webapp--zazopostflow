# Rate Limiting

Rate limiting reference for ZazoPostFlow. This document covers the implementation details, configuration, endpoint-specific limits, and deployment considerations.

---

## Table of Contents

- [Implementation](#implementation)
- [Configuration](#configuration)
- [Rate Limit Table](#rate-limit-table)
  - [Authentication Endpoints](#authentication-endpoints)
  - [API Endpoints](#api-endpoints)
- [Rate Limit Response (429)](#rate-limit-response-429)
- [Multi-Instance Deployment Warning](#multi-instance-deployment-warning)

---

## Implementation

- **File**: `src/lib/rate-limit.ts`
- **Storage**: In-memory (Map-based, single-instance)
- **IP Resolution**: `x-forwarded-for` → `x-real-ip` → `127.0.0.1`
- **Cleanup**: 5-minute interval for stale entries

The rate limiter uses a sliding window algorithm. Each unique IP address gets its own bucket per identifier, tracking the number of requests within the configured time window.

### IP Resolution Order

The client IP is resolved by checking headers in the following order:

1. `x-forwarded-for` — Set by reverse proxies (Nginx, Cloudflare, AWS ALB). Uses the first IP in the comma-separated list.
2. `x-real-ip` — Set by some proxy configurations.
3. `127.0.0.1` — Fallback when neither header is present (e.g., direct local access).

> **Important**: If deploying behind a reverse proxy, ensure it is configured to set the `x-forwarded-for` header. Without it, all requests will appear to come from the same IP (`127.0.0.1`), making rate limiting ineffective.

---

## Configuration

```typescript
interface RateLimitOptions {
  windowMs: number;     // Time window in milliseconds
  max: number;          // Maximum requests per window
  identifier: string;   // Unique identifier for the rate limit bucket
}

interface RateLimitResult {
  success: boolean;     // Whether the request is allowed
  remaining: number;    // Remaining requests in current window
  resetAt: Date;        // When the rate limit window resets
}
```

### How It Works

1. On each request, the rate limiter checks the IP address and identifier combination.
2. If no record exists or the window has expired, a new window is created with the request counted.
3. If a record exists within the window, the request count is incremented.
4. If the count exceeds `max`, the request is denied with a `429` response.
5. A background interval runs every 5 minutes to clean up stale entries that have exceeded their window.

---

## Rate Limit Table

### Authentication Endpoints

These endpoints have stricter rate limits to prevent brute-force attacks, credential stuffing, and email abuse.

| Identifier                          | Endpoint                                        | Window     | Max Requests |
|-------------------------------------|-------------------------------------------------|------------|--------------|
| `auth:login`                        | POST /api/auth/login                            | 15 min     | 5            |
| `auth:register`                     | POST /api/auth/register                         | 1 hour     | 3            |
| `auth:forgot-password`              | POST /api/auth/forgot-password                  | 1 hour     | 3            |
| `auth:reset-password`               | POST /api/auth/reset-password                   | 15 min     | 5            |
| `auth:verify-email`                 | GET /api/auth/verify-email                      | 15 min     | 5            |
| `auth:me`                           | GET /api/auth/me                                | 1 min      | 60           |
| `auth:request-delete-account`       | POST /api/auth/request-delete-account           | 1 hour     | 3            |
| `auth:2fa:challenge`                | POST /api/auth/2fa/challenge                    | 15 min     | 5            |
| `auth:2fa:request-disable-by-email` | POST /api/auth/2fa/request-disable-by-email     | 1 hour     | 3            |

### API Endpoints

General API endpoints have standard rate limits. Read operations allow more requests than write or delete operations.

| Identifier                | Endpoint                    | Window  | Max Requests |
|---------------------------|-----------------------------|---------|--------------|
| `api:posts:get`           | GET /api/posts              | 1 min   | 60           |
| `api:posts:post`          | POST /api/posts             | 1 min   | 20           |
| `api:posts:id:put`        | PUT /api/posts/[id]         | 1 min   | 20           |
| `api:posts:id:delete`     | DELETE /api/posts/[id]      | 1 min   | 10           |
| `api:posts:calendar:get`  | GET /api/posts/calendar     | 1 min   | 30           |
| `api:projects:get`        | GET /api/projects           | 1 min   | 60           |
| `api:projects:post`       | POST /api/projects          | 1 min   | 20           |
| `api:projects:id:put`     | PUT /api/projects/[id]      | 1 min   | 20           |
| `api:projects:id:delete`  | DELETE /api/projects/[id]   | 1 min   | 10           |
| `api:tags:get`            | GET /api/tags               | 1 min   | 60           |
| `api:tags:post`           | POST /api/tags              | 1 min   | 20           |
| `api:tags:id:put`         | PUT /api/tags/[id]          | 1 min   | 20           |
| `api:tags:id:delete`      | DELETE /api/tags/[id]       | 1 min   | 10           |
| `api:dashboard:get`       | GET /api/dashboard          | 1 min   | 30           |
| `api:user:put`            | PUT /api/user               | 1 min   | 10           |

---

## Rate Limit Response (429)

When a request exceeds the rate limit, the API returns a `429 Too Many Requests` response:

### Response Body

```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "retryAfter": "2024-06-01T12:05:00.000Z"
}
```

### Response Headers

| Header                   | Type     | Description                                    |
|--------------------------|----------|------------------------------------------------|
| `X-RateLimit-Limit`      | `number` | Maximum requests allowed per window            |
| `X-RateLimit-Remaining`  | `number` | Requests remaining in the current window       |
| `X-RateLimit-Reset`      | `string` | ISO 8601 timestamp when the rate limit window resets |

These headers are included in **all** responses (not just 429s), allowing clients to proactively manage their request rate.

---

## Multi-Instance Deployment Warning

The in-memory rate limiter **does NOT share state across multiple server instances**. Each instance maintains its own rate limit counters using its own in-memory `Map`.

### Implications

| Scenario                    | Behavior                                                                  |
|-----------------------------|---------------------------------------------------------------------------|
| Single instance             | Rate limiting works as expected                                           |
| Multiple instances          | Each instance tracks limits independently; effective limit = N × configured limit |
| Server restart              | All rate limit counters are reset                                         |
| Load-balanced deployment    | A user hitting different instances gets separate counters on each         |

### Recommended Solution

For production deployments with multiple instances, replace the in-memory rate limiter with a Redis-based solution. This ensures consistent rate limiting across all instances.

Recommended libraries:

- **[`rate-limiter-flexible`](https://github.com/wyattjoh/rate-limiter-flexible)** — Supports Redis, MongoDB, PostgreSQL, and MySQL backends. Feature-rich and well-maintained.
- **[`express-rate-limit`](https://github.com/express-rate-limit/express-rate-limit)** with [`rate-limit-redis`](https://github.com/wyattjoh/rate-limit-redis) store — Lightweight option for Express-based servers.

### Migration Example

```typescript
// Before: in-memory
import { rateLimit } from "@/lib/rate-limit";

// After: Redis-based (using rate-limiter-flexible)
import { RateLimiterRedis } from "rate-limiter-flexible";
import { createClient } from "redis";

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

const limiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "zazopostflow",
  points: 5,           // max requests
  duration: 900,       // window in seconds (15 min)
});
```
