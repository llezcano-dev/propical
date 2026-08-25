# Deploying to Vercel + Turso

Step-by-step guide to deploy Propical to production using [Vercel](https://vercel.com) (hosting) and [Turso](https://turso.tech) (database).

## Prerequisites

- A [Turso](https://turso.tech) account (free tier: 500 DBs, 9 GB storage, 500M row reads/month)
- A [Vercel](https://vercel.com) account (Hobby plan supports cron)
- [Turso CLI](https://docs.turso.tech/cli/install) installed locally
- Node.js 22+ and pnpm 10+

---

## 1. Create the Turso database

```bash
# Create the database
turso db create propical

# Get the connection URL (save this — you'll need it for Vercel)
turso db show propical --url

# Create an auth token (save this too)
turso db tokens create propical
```

## 2. Apply schema and seed data

Run these locally, pointing at your Turso database. The hand-rolled DDL script (`prisma/push-schema.ts`) is the only way to apply schema to Turso — `prisma db push` does not support `libsql://` URLs.

```bash
# Set Turso env vars (add to .env or export inline)
export TURSO_DATABASE_URL="libsql://your-db.turso.io"
export TURSO_AUTH_TOKEN="your-token"

# Apply schema (idempotent — safe to re-run)
pnpm db:push

# Create a superadmin (never use the default "admin" username in production)
SEED_ADMIN_USERNAME='your-admin@example.com' \
SEED_ADMIN_PASSWORD='your-strong-password' \
pnpm db:seed
```

## 3. Configure Vercel

### Import the project

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your GitHub repository.
3. Vercel auto-detects Next.js — no framework preset needed.
4. Leave build settings as default (`pnpm build`).

### Set environment variables

In **Vercel → Settings → Environment Variables**, add:

| Variable | Value | Notes |
|---|---|---|
| `JWT_SECRET` | `openssl rand -hex 32` | Auth signing key |
| `CRON_SECRET` | `openssl rand -hex 32` | Cron endpoint auth |
| `TURSO_DATABASE_URL` | `libsql://your-db.turso.io` | From step 1 |
| `TURSO_AUTH_TOKEN` | Your token | From step 1 |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID | Optional — enables "Continue with Google" |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN | Optional — error tracking |
| `SENTRY_AUTH_TOKEN` | Sentry auth token | Optional — source map upload |
| `RESEND_API_KEY` | Resend API key | Optional — email-verified signup |
| `EMAIL_FROM` | `Propical <noreply@your-domain.com>` | Optional — sender address |

> **Tip:** Set all variables for **Production**, **Preview**, and **Development** environments as needed. The Turso variables should be Production + Preview; `JWT_SECRET` and `CRON_SECRET` should differ per environment.

### Deploy

Push to `main` (or your default branch). Vercel auto-deploys on every push.

## 4. Calendar sync cron

Propical syncs iCal feeds every 10 minutes. This is handled by **Vercel Cron** (configured in `vercel.json`):

```json
{
  "crons": [
    { "path": "/api/calendar/cron", "schedule": "*/10 * * * *" }
  ]
}
```

When `CRON_SECRET` is set in Vercel, the cron job automatically sends `Authorization: Bearer <CRON_SECRET>` with each request. The `/api/calendar/cron` endpoint validates this header.

**Limits:**
- Vercel Hobby: 2 cron jobs, cron runs only on Production deployments.
- Vercel Pro: 40 cron jobs.

No additional setup needed — the cron is active as soon as `vercel.json` is in the repo and `CRON_SECRET` is set.

## 5. Custom domain

1. In **Vercel → Settings → Domains**, add `propical.com.br`.
2. Update your DNS records as instructed by Vercel (typically a CNAME to `cname.vercel-dns.com`).
3. Vercel provisions TLS automatically (Let's Encrypt).

## 6. Health check

The app exposes `/api/health` (returns JSON with DB status, last sync time, version). Use it with [BetterStack](https://betterstack.com) or any uptime monitor.

## 7. Subsequent deploys

Every push to `main` triggers an automatic deploy. To apply schema changes:

```bash
# Local, pointing at Turso
TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." pnpm db:push
```

Then push the code — Vercel rebuilds and redeploys.

---

## Known limitations

### Rate limiting and account lockout are per-instance

`src/lib/rate-limit.ts` and `src/lib/account-lockout.ts` use in-memory state. On Vercel (serverless), each lambda invocation has fresh memory — rate limits and lockouts don't persist across requests or instances. This means:

- Brute-force protection is weaker than on a single-server deployment.
- Rate limits reset on cold starts.

**Mitigation (future):** Swap the in-memory stores for [Upstash Redis](https://upstash.com) (serverless-friendly, free tier available). Not implemented yet — tracked as a follow-up.

### Backups

Turso handles backups on their side. For manual backups:

```bash
turso db dump propical > backup.sql
```

The old `scripts/backup-db.sh` (SQLite file backup with tiered retention) is no longer used — Turso's managed infrastructure replaces it.

### Cron execution time

Vercel Cron functions have a default timeout (10s on Hobby, 60s on Pro). If `syncAllCalendars` takes longer (many calendar links), the cron invocation may time out. Monitor via Vercel → Logs. If timeouts occur, consider splitting the sync into batches or upgrading to Pro.

---

## Troubleshooting

**Build fails with "prisma generate" error.** Ensure `postinstall: prisma generate` runs (it's in `package.json`). The generate step is offline — it doesn't need a database connection.

**Cron not firing.** Check: (1) `CRON_SECRET` is set in Vercel env, (2) `vercel.json` is in the repo root, (3) you're on a Production deployment (cron doesn't run on Preview).

**Database connection errors at runtime.** Verify `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set in Vercel → Settings → Environment Variables for the Production environment.

**Schema drift.** If you add columns/models, update `prisma/push-schema.ts` AND `prisma/schema.prisma` in lockstep. Run `pnpm db:push` against Turso before deploying the code.
