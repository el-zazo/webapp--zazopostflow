# ZazoPostFlow

**LinkedIn Post Manager for Developers**

ZazoPostFlow is a full-stack web application built to help developers plan, organize, and schedule LinkedIn posts across multiple projects. It provides a calendar-based workflow, project tagging, content management, and robust security features including two-factor authentication.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, standalone output) |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Lucide Icons |
| Database | MongoDB with Mongoose 9 |
| Authentication | JWT (httpOnly cookies), bcrypt password hashing, TOTP 2FA |
| Email | Brevo API (transactional emails) |
| Validation | Zod 4, react-hook-form |
| Runtime | Bun |

---

## Prerequisites

- **Bun** (recommended) or Node.js 18+
- **MongoDB** instance (local or Atlas)
- **Brevo account** for transactional emails

---

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url>
cd postflow
bun install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Required
MONGODB_URI=mongodb://localhost:27017/postflow
JWT_SECRET=your-super-secret-jwt-key-change-this

# Required for production (email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Required for email functionality
BREVO_API_KEY=your-brevo-api-key
BREVO_FROM_EMAIL=noreply@yourdomain.com

# Optional
DB_NAME=postflow
```

See [Environment Variables](#environment-variables) below for details.

### 3. Run Development Server

```bash
bun dev
```

The app will be available at `http://localhost:3000`.

### 4. Build for Production

```bash
bun run build
NODE_ENV=production bun .next/standalone/server.js
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | Secret key for signing JWT tokens. **The app will throw and refuse to start if this is missing.** |
| `NEXT_PUBLIC_APP_URL` | Yes (prod) | — | Base URL of the application, used for generating links in emails. **Throws in production if missing.** |
| `BREVO_API_KEY` | Yes (email) | — | Brevo API key for sending transactional emails |
| `BREVO_FROM_EMAIL` | No | `noreply@postflow.dev` | Sender email address for outgoing emails |
| `DB_NAME` | No | — | MongoDB database name (optional, derived from `MONGODB_URI` if omitted) |
| `NODE_ENV` | No | — | Set to `production` to enable secure cookies and strict mode |

---

## Project Structure

```
postflow/
├── public/                     # Static assets (logo.svg, robots.txt)
├── src/
│   ├── app/
│   │   ├── (auth)/             # Auth pages (login, register, forgot-password, etc.)
│   │   │   ├── confirm-delete-account/
│   │   │   ├── forgot-password/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── reset-password/
│   │   │   └── verify-email/
│   │   ├── (dashboard)/        # Protected dashboard pages
│   │   │   ├── calendar/
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   ├── settings/
│   │   │   └── tags/
│   │   ├── api/                # API route handlers
│   │   │   ├── auth/           # Auth endpoints (login, register, 2FA, etc.)
│   │   │   ├── dashboard/      # Dashboard stats and recent posts
│   │   │   ├── posts/          # Post CRUD + calendar
│   │   │   ├── projects/       # Project CRUD
│   │   │   ├── tags/           # Tag CRUD
│   │   │   └── user/           # User profile/password/theme updates
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── not-found.tsx
│   │   └── page.tsx            # Root redirect (→ /dashboard or /login)
│   ├── components/
│   │   ├── dashboard/          # StatsCard
│   │   ├── layout/             # Header, Sidebar, ThemeProvider
│   │   ├── posts/              # PostForm, PostFilters, PostCard, etc.
│   │   ├── projects/           # ProjectForm, ProjectFilters, ProjectCard
│   │   ├── settings/           # TwoFactorSetup, RegenerateBackupCodes
│   │   ├── shared/             # ConfirmDialog, CopyButton, LogoutButton, etc.
│   │   └── ui/                 # shadcn/ui primitives (button, dialog, form, etc.)
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility libraries (auth, db, email, rate-limit, etc.)
│   ├── models/                 # Mongoose models (User, Post, Project, Tag)
│   ├── types/                  # TypeScript type definitions
│   └── middleware.ts           # Route protection middleware
├── components.json             # shadcn/ui configuration
├── next.config.ts              # Next.js configuration
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Key Features

- **Project-Based Organization** — Group posts under projects with tags, GitHub/demo links
- **Calendar View** — Month-by-month view of scheduled and published posts
- **Content Management** — Create, edit, and manage LinkedIn posts with rich metadata (type, platform, media flags, status)
- **Two-Factor Authentication** — TOTP-based 2FA with backup codes and email-based recovery
- **Email Verification** — New accounts must verify email before logging in
- **Password Security** — bcrypt hashing, password change invalidates existing sessions
- **Dark/Light Theme** — Persisted user preference with system detection
- **Rate Limiting** — IP-based rate limiting on all API endpoints
- **Advanced Email Validation** — 4-step validation pipeline (syntax, blocklist, DNS/MX, external APIs) to prevent disposable emails

---

## Documentation

| Document | Description |
|---|---|
| [API Reference](docs/API.md) | Complete API endpoint documentation (31 endpoints) |
| [Authentication](docs/AUTHENTICATION.md) | Auth flows, 2FA setup, session management |
| [Database](docs/DATABASE.md) | Mongoose models, schemas, indexes |
| [Components](docs/COMPONENTS.md) | UI component props and usage |
| [Hooks](docs/HOOKS.md) | Custom React hooks reference |
| [Deployment](docs/DEPLOYMENT.md) | Production deployment guide |
| [Security](docs/SECURITY.md) | Security fixes and best practices |
| [Rate Limits](docs/RATE-LIMITS.md) | Rate limiting configuration reference |

---

## Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `next dev -p 3000` | Start development server on port 3000 |
| `build` | `next build && cp -r .next/static .next/standalone/ && cp -r public .next/standalone/` | Build for production (standalone output) |
| `start` | `NODE_ENV=production bun .next/standalone/server.js` | Start production server |
| `lint` | `eslint .` | Run ESLint |

---

## License

Private — All rights reserved.
