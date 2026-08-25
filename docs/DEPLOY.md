# Deploying to Vercel + Turso

Step-by-step guide to deploy Propical to production using [Vercel](https://vercel.com) (hosting) and [Turso](https://turso.tech) (database).

## Prerequisites

- A [Turso](https://turso.tech) account (free tier: 500 DBs, 9 GB storage, 500M row reads/month)
- A [Vercel](https://vercel.com) account
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
| `RESEND_API_KEY` | Resend API key | Required for signup — email verification is always on in production |
| `EMAIL_FROM` | `Propical <noreply@your-domain.com>` | Sender address — must be on a domain verified in Resend |

> **Tip:** Set all variables for **Production**, **Preview**, and **Development** environments as needed. The Turso variables should be Production + Preview; `JWT_SECRET` and `CRON_SECRET` should differ per environment.

### Verify your sending domain in Resend

Resend does not allow free/public domains (`gmail.com`, `outlook.com`, `yahoo.com`) as the sender — you must own a custom domain (e.g. `propical.com.br`) and verify it:

1. In **Resend → Domains → Add Domain**, enter your domain (a subdomain like `mail.propical.com.br` is recommended to isolate sending reputation).
2. Resend shows DNS records — copy the **SPF** (TXT), **DKIM** (TXT), and **DMARC** (TXT) values.
3. In your DNS host (e.g. [registro.br](https://registro.br) → domain → **Zona DNS**), create those TXT records. The root domain's default SPF (`v=spf1 -all`) must be replaced by Resend's SPF (`v=spf1 include:amazonses.com ~all`).
4. Wait for DNS propagation (minutes, `TTL`-dependent) and click **Verify** in Resend until the status is **Verified**.
5. Set `RESEND_API_KEY` + `EMAIL_FROM` (e.g. `Propical <noreply@mail.propical.com.br>`) and deploy.

### Deploy

Push to `main` (or your default branch). Vercel auto-deploys on every push.

## 4. Calendar sync cron

Propical syncs iCal feeds every 10 minutes. This is handled by an **external scheduler** — Vercel Cron is NOT used (Hobby plan allows only 1 job/day).

### Set up cron-job.org (recommended)

1. Sign up at [cron-job.org](https://cron-job.org) (free tier: unlimited jobs).
2. Create a new job:
   - **URL:** the cron URL from the admin panel (**Tasks** tab → "Cron URL" section). It looks like `https://your-domain.vercel.app/api/calendar/cron?secret=YOUR_SECRET`.
   - **Schedule:** every 10 minutes (`*/10 * * * *`).
   - **Request method:** GET.
3. Save and enable the job.

The cron URL includes `?secret=$CRON_SECRET` for authentication. You can also view the URL via `GET /api/calendar/cron-url` (superadmin only).

The endpoint also accepts `Authorization: Bearer <CRON_SECRET>` if you prefer header-based auth (e.g. for custom schedulers).

> **Tip:** If `CRON_SECRET` is not set, it falls back to `JWT_SECRET`. Always set `CRON_SECRET` explicitly for clarity.

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

Vercel serverless functions have a timeout (60s on Hobby, 300s on Pro). If `syncAllCalendars` takes longer (many calendar links), the cron-job.org request may time out. Monitor via Vercel → Logs. If timeouts occur, consider splitting the sync into batches or upgrading to Pro.

---

## Troubleshooting

**Build fails with "prisma generate" error.** Ensure `postinstall: prisma generate` runs (it's in `package.json`). The generate step is offline — it doesn't need a database connection.

**Cron not firing.** Check: (1) `CRON_SECRET` is set in Vercel env, (2) the cron-job.org job is enabled and the URL is correct (check the Tasks panel in the admin UI), (3) the job status in cron-job.org shows "Success" — if it shows errors, check Vercel → Logs.

**Database connection errors at runtime.** Verify `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set in Vercel → Settings → Environment Variables for the Production environment.

**Schema drift.** If you add columns/models, update `prisma/push-schema.ts` AND `prisma/schema.prisma` in lockstep. Run `pnpm db:push` against Turso before deploying the code.
