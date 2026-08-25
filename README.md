# Propical

> **Free, open-source property manager for short-term rental hosts.**
> Sync Airbnb, Booking.com, Vrbo, and any iCal-compatible platform into one dashboard. Automate cleaning schedules, collect guest details with pre-arrival forms, manage multiple properties with co-host access. Use it free at **[propical.com.br](https://propical.com.br)**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/website?url=https%3A%2F%2Fpropical.com.br%2Fapi%2Fhealth&label=propical.com.br)](https://propical.com.br)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)](https://www.typescriptlang.org/)

> **Fork of [RentTools.io](https://github.com/Gribadan/RentTools.io) (MIT).** Propical adapts the upstream for the Brazilian market: pt-BR i18n, message templates, and cheap self-hosting. Upstream history and attribution: [docs/UPSTREAM.md](docs/UPSTREAM.md).

---

## What it does

If you list a place on Airbnb, Booking.com, Vrbo, or any other platform that exposes an iCal export, you have at least four browser tabs open at any given moment. Propical collapses them into one dashboard.

The pitch is the same as the home page: **stop juggling calendar tabs.** Every 10 minutes Propical pulls each platform's iCal feed and republishes a single combined feed back. Airbnb sees Booking.com's bookings and vice versa — the same protection a $100–300/mo channel manager offers, just free and open-source.

### Core features

- **Cross-platform calendar sync.** iCal export URLs from Airbnb, Booking.com, Vrbo, Hostaway, Lodgify, and 7 other platforms feed into one combined output. Manual reservations live alongside synced ones, with double-booking detection across them.
- **Cleaning schedule.** Every check-out → check-in turnover surfaces as a row in the schedule, with cleaner assignments, buffer-day conflicts flagged, copy/print to hand off to a cleaner, and a per-property master toggle when a property doesn't need cleaning logic.
- **Multi-property + co-host.** Add as many properties as you need. Invite co-hosts (managers) by link with one-click access grants. Cleaners are a separate role with a stripped-down view that only shows their assigned properties.
- **Pre-arrival guest forms.** Generate a one-time share link, the guest fills out their info on a dedicated form, the data lands on the reservation. No accounts, no apps for the guest.
- **Message templates.** Per-property templates with variables (`{{guestName}}`, `{{checkIn}}`, `{{wifiPassword}}`, …). Copy to clipboard, paste into Airbnb / Booking.com / WhatsApp. Multi-language.
- **Group invites.** Send the guest a one-tap WhatsApp or Telegram group invite link from the reservation row.
- **Reports.** Past-3 / 6 / 12 / 24-month or all-time KPIs across properties: occupancy, ADR, revenue, with a custom-legend chart and CSV export.
- **Public iCal feed.** Each property exposes its own combined export URL — paste it back into Airbnb / Booking so they pick up your manual blocks and other-platform bookings.


---

## Use it free

Sign up at **[propical.com.br](https://propical.com.br)** — no credit card, per-account rate limits keep usage sane on the shared instance.


---

## FAQ

**Does it actually prevent double-bookings?**
It cuts the risk dramatically — not to zero, but close. iCal sync is *not* real-time. Airbnb refreshes imported calendars every 2–4 hours; Booking.com every 2–6 hours. The free middle layer (Propical) refreshes faster, but it can't speed up the destination platform's own poll. For 1–3 listings, the iCal handshake handles 99% of cases. For 20+ listings or 90%+ occupancy, look at a paid channel manager.

**Can guests see my data?**
No. Each property is scoped to its owner + invited managers + assigned cleaners. The only public surface is the per-property iCal feed (read-only, blocks-only — no guest names exposed) and the optional pre-arrival form share link (one-time, scoped to a single reservation).

**Where is data stored?**
Turso (libSQL cloud) for the production instance at propical.com.br. Local development uses a SQLite file on disk. See [propical.com.br/privacy](https://propical.com.br/privacy) for the full list of what's collected and how to delete your account.

**Can I export my data?**
Yes — *Profile → Export my data* gives you a JSON dump of everything tied to your account. Account deletion (GDPR right-to-erasure) is one click in the same panel.

**How do I report a bug or request a feature?**
[Open an issue](https://github.com/llezcano-dev/propical/issues/new) on this repo. Or use the in-app **Send feedback** button — it lands in the maintainer's super-admin queue.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, server + client components) |
| Language | TypeScript (strict) |
| UI | Tailwind CSS 4, light + dark theme, mobile-responsive, PWA |
| Auth | jose JWT in HTTP-only cookie + bcryptjs, Google One Tap |
| Database | SQLite (libSQL/Turso) via Prisma 7, hand-rolled migrations |
| SEO | Per-page JSON-LD (`FAQPage`, `SoftwareApplication`, `Organization`, `WebSite`, `BreadcrumbList`), static sitemap, `/llms.txt` |
| Errors | Sentry |
| Uptime | BetterStack |
| Hosting | Vercel + Turso (libSQL cloud) |

---

## Repo layout

```
src/app/                  Next.js App Router routes (pages + API)
src/components/           React components
src/lib/                  Utilities (auth, prisma, ical, i18n, …)
prisma/                   Schema + hand-rolled push-schema.ts + seed scripts
public/uploads/           Runtime uploads (gitignored)
scripts/                  Build-time + maintenance scripts
docs/                     Setup runbook, API reference, contributing guide
```

---

## Local development

### Prerequisites

- Node.js 22+
- pnpm 10+

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
JWT_SECRET=<openssl rand -hex 32>
CRON_SECRET=<openssl rand -hex 32>
DATABASE_URL=file:./data/prod.db
```

The remaining variables (Google OAuth, Resend, Sentry) are optional for local development.

> **Note:** Prisma/seed scripts read `.env`, not `.env.local`. Keep the same values in both, or run the scripts with an explicit `DATABASE_URL=...`.

### 3. Create the SQLite database

```bash
pnpm db:push
```

### 4. (Optional) Create a test user

```bash
pnpm db:seed-test-user
```

Default credentials: `test@propical.com.br` / `Test123456!`

### 5. Run the dev server

```bash
pnpm dev
```

Open `http://localhost:3000`.

### 6. (Optional) Create a superadmin (site operator)

The superadmin is the **site operator** — not a host privilege (hosts with property access use the `PropertyManager` system, scoped per property). The superadmin controls everything global to the instance at `/dashboard/admin`: users, all tenants' properties, platforms, cron schedule, sync logs, feed tokens, SEO, and more. Login is the same as the app — `/dashboard/admin` is gated by role (any other role gets 404).

**Create/update via seed** (official path):

```bash
SEED_ADMIN_USERNAME='admin@propical.com.br' \
SEED_ADMIN_PASSWORD='your-strong-password' \
pnpm db:seed
```

- If the user doesn't exist, it's created with `role: superadmin`; if it exists, the password is reset and the role is guaranteed (`prisma/seed.ts`).
- Without `SEED_ADMIN_PASSWORD`, the seed generates a random password and prints it once — save it before closing.
- ⚠️ **Production**: never run the seed without a custom `SEED_ADMIN_USERNAME`. With the default `admin` in production the seed **aborts** (guard G1 in `src/lib/seed-guard.ts`) — avoids a predictable superadmin account and resetting an existing `admin` with the password printed to stdout.

**Why signup promotes nobody**: the role is fixed to `"user"` in the signup handler (`src/app/api/auth/signup/route.ts`) and in verify-email. There is no self-promotion path.

**Promote an existing user manually** (SQL):

```sql
UPDATE User SET role = 'superadmin' WHERE username = 'email@example.com';
```

> There is no API endpoint to change a user's role (`/api/users/[id]` only has `DELETE` and requires superadmin). The official path is the seed; the manual path is the SQL above.

### Test the API locally

```bash
# Login (or signup with dev bypass)
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test@propical.com.br","password":"Test123456!"}' \
  -c cookies.txt

# Create a property
curl -s -b cookies.txt -X POST http://localhost:3000/api/properties \
  -H "Content-Type: application/json" \
  -d '{"name":"Casa Copacabana"}'

# Create an iCal link
curl -s -b cookies.txt -X POST http://localhost:3000/api/calendar/links \
  -H "Content-Type: application/json" \
  -d '{"propertyId":1,"platform":"airbnb","icalExportUrl":"https://..."}'

# Trigger sync
curl -s -b cookies.txt -X POST http://localhost:3000/api/calendar/sync \
  -H "Content-Type: application/json" \
  -d '{"propertyId":1}'

# Public feed
curl -s http://localhost:3000/api/calendar/feed/1/propical.ics
```

> **Email-verification bypass (dev/test only):** when `NODE_ENV !== "production"` **and** `RESEND_API_KEY` is not set, `/api/auth/signup` creates the account and logs in immediately, without a verification code — intentional, so dev and e2e work without a real mailbox (`src/app/api/auth/signup/route.ts`). The gate is always closed in **production**: with `NODE_ENV === "production"` the bypass never applies and the account is only created after the 6-digit code is confirmed at `/api/auth/verify-email` (if the email provider fails, signup returns 502 — never leaves an unverified account). Outside production, setting `RESEND_API_KEY` also disables the bypass (verification becomes mandatory again).

### Tests

```bash
# Unit
pnpm test

# Lint
pnpm lint

# e2e (Playwright)
pnpm test:e2e              # all specs (auth, calendar, onboarding)
pnpm test:e2e auth.spec.ts # a single spec
```

The e2e infrastructure (login rate limit, storageState, selector conventions) is documented in [docs/E2E-TESTING.md](docs/E2E-TESTING.md).

---

## License

MIT — see [LICENSE](LICENSE). Translation: do anything you want, just don't blame the maintainer if it breaks.

