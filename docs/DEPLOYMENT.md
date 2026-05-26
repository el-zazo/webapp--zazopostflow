# Deployment Guide

Production deployment guide for ZazoPostFlow. This document covers the build process, environment configuration, infrastructure setup, and recommended deployment strategies.

---

## Table of Contents

- [Build Process](#build-process)
- [Production Start](#production-start)
- [Environment Variables](#environment-variables)
- [MongoDB Setup](#mongodb-setup)
- [Email Service Setup (Brevo)](#email-service-setup-brevo)
- [Secure Cookie Configuration](#secure-cookie-configuration)
- [Rate Limiting Caveats](#rate-limiting-caveats)
- [Route Protection Notes](#route-protection-notes)
- [Docker Deployment](#docker-deployment-recommended)
- [Health Checks](#health-checks)

---

## Build Process

The app uses Next.js standalone output mode, which produces a minimal, self-contained server bundle without development dependencies.

### Build Command

```bash
next build && cp -r .next/static .next/standalone/ && cp -r public .next/standalone/
```

### What the build creates

The `.next/standalone/` directory contains everything needed to run the application in production:

| Component       | Source                 | Destination                        |
|-----------------|------------------------|------------------------------------|
| Server code     | Next.js build output   | `.next/standalone/`                |
| Static assets   | `.next/static/`        | `.next/standalone/.next/static/`   |
| Public files    | `public/`              | `.next/standalone/public/`         |

The standalone output eliminates the need for `node_modules` in production, significantly reducing the deployment size.

---

## Production Start

```bash
NODE_ENV=production bun .next/standalone/server.js
```

The server listens on port 3000 by default. Override with the `PORT` environment variable:

```bash
PORT=8080 NODE_ENV=production bun .next/standalone/server.js
```

---

## Environment Variables

### Checklist for Production

| Variable              | Required | Default                     | Notes                                                      |
|-----------------------|----------|-----------------------------|------------------------------------------------------------|
| `MONGODB_URI`         | Yes      | —                           | MongoDB connection string (e.g. `mongodb+srv://...`)       |
| `JWT_SECRET`          | Yes      | —                           | Strong random secret; **app throws if missing**            |
| `NEXT_PUBLIC_APP_URL` | Yes      | —                           | Public URL of the app; **app throws if missing in production** |
| `BREVO_API_KEY`       | Yes      | —                           | Brevo transactional email API key                          |
| `BREVO_FROM_EMAIL`    | No       | `noreply@postflow.dev`     | Must be a verified sender in Brevo                         |
| `DB_NAME`             | No       | From connection string      | Override database name                                     |
| `NODE_ENV`            | Yes      | —                           | Must be `production` for secure cookies and proper behavior|

> **Important**: `JWT_SECRET` and `NEXT_PUBLIC_APP_URL` have no fallbacks in production. The application will throw on startup if either is missing. This is by design — see Security Fix #1 and #5.

---

## MongoDB Setup

ZazoPostFlow uses Mongoose 9 with a singleton connection pattern.

### Configuration

- **Connection string**: Set via `MONGODB_URI` environment variable
- **Database name**: Optionally overridden with `DB_NAME`; otherwise inferred from the connection string
- **Connection caching**: The connection is cached globally to prevent multiple connections during development hot-reloads

### Supported Providers

- **MongoDB Atlas** — Fully managed, recommended for most deployments
- **Self-hosted MongoDB** — Ensure your instance is accessible from the deployment environment

### Connection Example

```bash
# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/postflow

# Self-hosted
MONGODB_URI=mongodb://mongo:27017/postflow
```

### Best Practices

- Use connection pooling (Mongoose handles this by default)
- Ensure your MongoDB instance allows connections from your deployment's IP range
- Use TLS/SSL connections in production (`mongodb+srv://` uses TLS by default)

---

## Email Service Setup (Brevo)

ZazoPostFlow uses Brevo (formerly Sendinblue) for transactional emails including email verification, password reset, and account deletion confirmation.

### Setup Steps

1. **Create a Brevo account** at [https://www.brevo.com](https://www.brevo.com)
2. **Get your API key** from the Brevo dashboard (Settings → SMTP & API → API Keys)
3. **Set the environment variable**:
   ```bash
   BREVO_API_KEY=xkeysib-your-api-key-here
   ```
4. **Optionally set the sender email**:
   ```bash
   BREVO_FROM_EMAIL=noreply@yourdomain.com
   ```
   > The sender email must be a verified sender in your Brevo account. If not set, defaults to `noreply@postflow.dev`.

### Email Features

| Feature                    | Template         |
|----------------------------|------------------|
| Email verification         | On registration  |
| Password reset             | On request       |
| Account deletion confirm   | On request       |
| 2FA disable confirmation   | On request       |

---

## Secure Cookie Configuration

Authentication tokens are stored in HTTP cookies with the following security settings:

| Setting        | Value          | Purpose                                           |
|----------------|----------------|---------------------------------------------------|
| `httpOnly`     | `true`         | Prevents JavaScript access to cookies (XSS protection) |
| `Secure`       | `true` (prod)  | Cookies only sent over HTTPS in production        |
| `SameSite`     | `Lax`          | Protects against CSRF while allowing top-level navigation |
| `maxAge`       | 7 days         | Automatic session expiry                          |

> **Note**: The `Secure` flag is only set when `NODE_ENV=production`. In development, cookies are sent over HTTP for convenience.

---

## Rate Limiting Caveats

The built-in rate limiter uses an in-memory `Map` data structure. This has important implications for production deployments:

| Limitation                        | Impact                                                        |
|-----------------------------------|----------------------------------------------------------------|
| Not persistent across restarts    | All rate limit counters reset when the server restarts         |
| Not shared across instances       | Each server instance maintains its own counters                |
| Memory growth                     | Stale entries are cleaned up every 5 minutes                   |

### Multi-Instance Deployments

For deployments with multiple server instances (e.g. Kubernetes, load-balanced VMs), **replace the in-memory rate limiter with a Redis-based solution**. Recommended libraries:

- [`rate-limiter-flexible`](https://github.com/wyattjoh/rate-limiter-flexible) — supports Redis, MongoDB, and other backends
- [`express-rate-limit`](https://github.com/express-rate-limit/express-rate-limit) with `rate-limit-redis` store

---

## Route Protection Notes

The middleware matcher in `middleware.ts` explicitly lists protected route patterns (e.g. `/dashboard/:path*`, `/settings/:path*`). However, some pages are protected indirectly through Next.js route groups rather than the middleware matcher.

### `/shorts` route

The `/shorts` page lives under `src/app/(dashboard)/shorts/page.tsx`. Because it is part of the `(dashboard)` route group, it inherits the authentication check from the dashboard layout — **not** from the middleware matcher. This means:

- The `/shorts` page is still protected and requires authentication to access.
- The middleware matcher does **not** include `/shorts/:path*` explicitly.

If custom middleware-level protection is needed for the `/shorts` route (e.g. for redirect logic, rate limiting, or additional checks before the layout renders), add `/shorts/:path*` to the protected routes array in `middleware.ts`:

```typescript
// middleware.ts
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/settings/:path*',
    '/shorts/:path*',  // add this line for explicit middleware protection
  ],
};
```

---

## Docker Deployment (Recommended)

### Dockerfile

```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY .next/standalone/ ./
COPY .next/static/ ./.next/static/
COPY public/ ./public/
EXPOSE 3000
ENV NODE_ENV=production
CMD ["bun", "server.js"]
```

### Build and Run

```bash
# Build the Next.js app first
next build
cp -r .next/static .next/standalone/
cp -r public .next/standalone/

# Build the Docker image
docker build -t zazopostflow .

# Run the container
docker run -d \
  -p 3000:3000 \
  -e MONGODB_URI=mongodb+srv://... \
  -e JWT_SECRET=your-secret \
  -e NEXT_PUBLIC_APP_URL=https://yourdomain.com \
  -e BREVO_API_KEY=your-brevo-key \
  -e NODE_ENV=production \
  --name zazopostflow \
  zazopostflow
```

### Docker Compose Example

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/postflow
      - JWT_SECRET=${JWT_SECRET}
      - NEXT_PUBLIC_APP_URL=https://yourdomain.com
      - BREVO_API_KEY=${BREVO_API_KEY}
      - NODE_ENV=production
    restart: unless-stopped
```

---

## Health Checks

The standalone Next.js server responds to requests on the configured port. For container health checks:

```bash
curl -f http://localhost:3000/ || exit 1
```

Or add to your Docker Compose:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/"]
  interval: 30s
  timeout: 10s
  retries: 3
```
