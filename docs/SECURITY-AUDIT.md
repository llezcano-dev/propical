# Per-route ownership audit (RT-21.1)

Last run: 2026-05-05.

Scope: every file under `src/app/api/**/route.ts`. The audit checks
each handler for:

  (a) calls `getSession()` (or a stricter helper like `requireSuperadmin()`)
  (b) where an ID param or property-scoped resource is touched, gates writes
      through `canManageProperty()` / `canReadProperty()` / `isPropertyOwner()`
      from `src/lib/ownership.ts` before any DB mutation.

The acceptance criterion for RT-21.1: **a property in a different account
cannot be read or modified by an authenticated user who is neither owner
nor manager**. Two endpoints violated that and were fixed in the same
commit; remaining findings are documented as follow-ups.

## Properly gated routes

All of the routes below were verified to (a) require an authenticated
session and (b) gate property-scoped reads/writes through the ownership
helpers (or an inline `userId` equality check for owner-only actions).

| Route | Methods | Gating |
| --- | --- | --- |
| `/api/properties` | GET | scoped to owned + managed |
| `/api/properties` | POST | bound to current `session.userId` |
| `/api/properties/[id]` | PATCH | `canManageProperty` |
| `/api/properties/[id]` | DELETE | `isPropertyOwner` (managers cannot delete) |
| `/api/properties/[id]/rotate-feed-token` | POST | `canManageProperty` |
| `/api/properties/sample` | POST | bound to current `session.userId` |
| `/api/reservations` | GET | scoped to `listAccessiblePropertyIds` |
| `/api/reservations` | POST | `canManageProperty` |
| `/api/reservations/[id]` | PATCH/DELETE | `canManageProperty` via `loadManageableReservation` |
| `/api/reservations/import` | POST | `canManageProperty` per row + `accessibleIds` set |
| `/api/reservations/export` | GET | scoped to `listAccessiblePropertyIds` |
| `/api/guests` | GET | `canManageProperty` on parent reservation |
| `/api/guests/[id]` | PATCH/DELETE | `canManageProperty` via `loadManageableGuest` |
| `/api/calendar/links` | GET | `userId == session.userId OR managers.some(managerId)` |
| `/api/calendar/links` | POST | `canManageProperty` |
| `/api/calendar/links/[id]` | PATCH/DELETE | `canManageProperty` via `loadManageableLink` |
| `/api/calendar/sync` | GET | scoped to `listAccessiblePropertyIds` |
| `/api/calendar/feed/[propertyId]/[filename]` | GET | per-property `feedToken` (timing-safe compare); legacy unset = public-by-design |
| `/api/date-overrides` | GET | `canReadProperty` |
| `/api/date-overrides` | POST/DELETE | `canManageProperty` |
| `/api/cleaning-records` | GET | `canReadProperty` |
| `/api/cleaning-records` | POST | `canReadProperty` (mark done) |
| `/api/cleaner-assignments` | GET | `canReadProperty` (co-hosts on a shared property can read) |
| `/api/cleaner-assignments` | POST | `isPropertyOwner` + `Cleaner.ownerUserId == session.userId` (profile-based only; legacy `username` branch removed in G7) |
| `/api/cleaner-assignments/[id]` | DELETE | inline `property.userId == session.userId` (owner-only) |
| `/api/property-managers` | GET/POST/DELETE | `isPropertyOwner` (only owner manages managers) |
| `/api/property-manager-invites` | GET/POST/DELETE | `isPropertyOwner` |
| `/api/property-manager-invites/accept` | GET/POST | token IS the permission; idempotent re-accept allowed |
| `/api/message-templates` | GET/POST | `canManageProperty` |
| `/api/message-templates/[id]` | PATCH/DELETE | `canManageProperty` via `loadManageableTemplate` |
| `/api/sync-alerts` | GET/POST | scoped to `listAccessiblePropertyIds`; POST self-only |
| `/api/activity` | GET | scoped to `listAccessiblePropertyIds` |
| `/api/audit` | GET | self-only (`userId == session.userId`) |
| `/api/auth/export-data` | GET | self-only data dump |
| `/api/auth/delete-account` | POST | self-only |
| `/api/auth/change-password` | POST | self-only |
| `/api/admin/export-my-data` | GET | `requireSuperadmin` |
| `/api/admin/site-settings` | GET/PUT | `requireSuperadmin` + key allowlist |
| `/api/admin/users` | GET | `requireSuperadmin` |
| `/api/admin/users/[id]/suspend` | POST/DELETE | `requireSuperadmin` |
| `/api/users/[id]` | DELETE | `requireSuperadmin` (and refuses self-delete) |
| `/api/users` | POST | `requireSuperadmin` |
| `/api/calendar/cron` | GET | `CRON_SECRET` (header bearer or `?secret=`) |
| `/api/extract` | POST | self-only with daily quota |
| `/api/onboard` | GET/POST | anonymous by design (cookie-bound draft, claimed at signup) |
| `/api/auth/login` `/signup` `/google/*` `/logout` `/me` `/session` | various | auth flow itself, no property access |
| `/api/health` | GET | unauthenticated liveness probe — by design |
| `/api/site-config` | GET | unauthenticated public site config — by design |

## Findings fixed in this commit

### F1 — `/api/calendar/health` leaked all calendar URLs (HIGH)

The handler had no auth check at all and returned every property's
`calendarLinks.icalExportUrl` across the entire platform. Airbnb iCal
URLs embed a per-listing access token; any visitor could enumerate
properties and pull every host's booking calendar.

**Fix**: gated with `requireSuperadmin()`. The only caller in the codebase
is `src/components/admin-panel.tsx` (admin-panel-only debug link), so this
matches actual usage.

### F2 — `/api/calendar/test` was anonymous SSRF (HIGH)

The handler accepted an arbitrary URL and fetched it server-side with no
authentication, turning the application server into a fetch proxy for
unauthenticated callers. Internal endpoints (loopback, cloud metadata at
`169.254.169.254`, etc.) were reachable through this.

**Fix**: requires `getSession()`. The endpoint is used by the calendar-sync
wizard, where the user is already authenticated. The follow-up to add a
URL allowlist (block private IP ranges, only allow HTTPS, etc.) is filed
as **F-FOLLOWUP-3** below.

## Findings deferred (out-of-scope for the acceptance criterion)

These do not let an authenticated user read or modify another user's
property data — they are operational / privilege-escalation issues
that warrant their own RT tasks to fix without breaking UI flows.

### F-FOLLOWUP-1 — `/api/calendar/cron-url` exposes the cron secret to any auth user (MEDIUM)

Returns `?secret=<CRON_SECRET>` in the URL string. Any authenticated
user (including a freshly-created free account) can retrieve it and
use it to trigger global syncs at will. The endpoint comment even
acknowledges this. Caller is `src/components/tasks-panel.tsx`, which
is loaded for every signed-in dashboard. Fix needs to (a) gate the
endpoint with `requireSuperadmin()` and (b) hide the cron URL block
in TasksPanel for non-superadmins. Track as a separate task.

### F-FOLLOWUP-2 — `/api/calendar/schedule` PUT lets any auth user change global sync settings (MEDIUM)

Toggles `sync_auto_enabled` and `sync_frequency_minutes`, which control
the cron behaviour for the whole platform. Currently gated only by
`getSession()`. Same UI-coupling problem as F-FOLLOWUP-1 (TasksPanel
calls it). Fix: gate PUT with `requireSuperadmin`, hide the controls
in TasksPanel for non-superadmins; GET can stay open since the values
aren't sensitive.

### F-FOLLOWUP-3 — `/api/calendar/test` SSRF still possible for authenticated users (LOW) — **FIXED (G6, 2026-08-13)**

After F2, anonymous SSRF is closed, but an authenticated user can still
make the server fetch arbitrary URLs. Add a URL allowlist (HTTPS-only,
deny private/loopback/link-local/cloud-metadata IPs after DNS resolution).

Closed via `src/lib/feed-url-guard.ts` (see the Annex below): HTTPS-only,
post-DNS-resolution blocklist of non-public ranges, reused by both
`/api/calendar/test` and `calendar-sync.ts`'s `fetchICal`. See
[Annex: SSRF & DNS rebinding](#annex-ssrf--dns-rebinding) for the full
threat model and the documented DNS-rebinding limitation.

### F-FOLLOWUP-4 — `/api/calendar/sync` POST lets any auth user trigger a global sync (LOW)

Already documented in the route's leading comment. DoS / load issue,
no data leak. Should switch to a per-user sync that only touches
`listAccessiblePropertyIds` for the caller.

### F-FOLLOWUP-5 — `/api/users` GET enumerates every account (LOW) — **FIXED (G7, 2026-08-13)**

Returns id, username, role, createdAt for every user in the system.
Was gated to superadmin (`requireSuperadmin`) in `src/app/api/users/route.ts`.
The only non-admin consumer — `cleaner-assignment-section.tsx` fetching
`/api/users?role=cleaner` — was deleted; the cleaner picker uses the
scoped `/api/cleaners` pool (`ownerUserId: session.userId`). The legacy
`?role=cleaner` filter was removed entirely.

### F-FOLLOWUP-6 — `/api/settings` GET returns all `AppSettings` rows to any auth user (LOW) — **FIXED (G7b, 2026-08-13)**

Originally only one key was masked; the remaining keys (`sync_last_run`,
`sync_last_result`, `sync_auto_enabled`, `sync_frequency_minutes`)
were returned as-is. `sync_last_result` is a stringified
`syncAllCalendars()` summary and may include cross-user property
counts/error messages.

Closed via a per-key allowlist in `src/app/api/settings/route.ts` GET:
non-superadmins receive only keys explicitly allowlisted — currently
none, since the sole former entry belonged to the removed OCR
integration. Every `sync_*` key — including the cross-user
`sync_last_result` — is dropped before the response.

### F-FOLLOWUP-7 — Legacy cleaner system leaks across tenants (MEDIUM) — **FIXED (G7, 2026-08-13)**

Two vectors, both in the legacy "User-cleaner" flow:

1. **Enumeration** — closed: `/api/users` GET is superadmin-only
   (`requireSuperadmin`) and the `?role=cleaner` filter was removed.

2. **Cross-tenant assignment** — closed: the legacy POST branch of
   `/api/cleaner-assignments/route.ts` that assigned by `username`
   validating only `role === "cleaner"` was removed. POST now accepts
   only `cleanerProfileId`, and the profile must satisfy
   `Cleaner.ownerUserId === session.userId` plus `isPropertyOwner`.

The whole legacy login-capable cleaner system was deleted in the same
branch (G7): `CleanerApp`/`CleanerShell` UI, the `cleaner` role handling,
and the `CleanerAssignment.cleanerId` column. Cleaners are now metadata
only (the `Cleaner` profile pool, RT-25.10). A regression e2e spec
(`e2e/cleaner-leak.spec.ts`) documents both vectors with inverted
bug-assertions.

## Acceptance criterion verdict

> A property in a different account cannot be read or modified by an
> authenticated user who is neither owner nor manager.

**PASS** after this commit. F1 (calendar/health) was the only path that
leaked another user's property data; it is now superadmin-only. Every
remaining route either binds to `session.userId`, scopes by
`listAccessiblePropertyIds`, or gates writes through the ownership
helpers. The deferred F-FOLLOWUP findings do not violate this criterion.

---

## Annex: SSRF & DNS rebinding (G6)

> Added 2026-08-13. Documents the server-side request forgery vector
> closed by `src/lib/feed-url-guard.ts` and the one residual risk we
> chose to accept.

### The vector

`/api/calendar/test` (and `calendar-sync.ts`'s `fetchICal`) fetch a URL the
user supplies, **server-side**. Before G6, the only gate was "be logged
in". A server-side fetch is dangerous because the server sits in a
different network position than the attacker's browser: it can reach
addresses the attacker cannot reach directly. An authenticated attacker
could therefore:

1. **Reach the cloud metadata endpoint** — `http://169.254.169.254/...`
   (AWS/GCP/DigitalOcean). On some providers this leaks instance identity
   or API tokens.
2. **Probe the private network** — `10.x`, `192.168.x`, `172.16-31.x`,
   `127.0.0.1` — enumerating internal services and open ports via the
   response's HTTP status and the ~200-char `preview` echo.
3. **Bypass the reverse proxy** — talking straight to the internal
   Next.js port (`localhost:3000`) behind nginx.
4. **Exfiltrate up to 200 chars** of any unauthenticated internal
   response, via the `preview` field.

A public IP — **including the application's own public IP** — is *not* a
win for the attacker: it is reachable from the open internet, so fetching
it server-side grants no new privilege. The only targets that matter are
those reachable from the server's network position but *not* from the
public internet, which is exactly the set the guard blocks.

### The fix

`validateFeedUrl()` (pure, resolver injected for testability) enforces:

- **HTTPS-only** — `http://` is refused (it is the transport of nearly
  every internal service that lacks TLS).
- **Post-DNS-resolution blocklist** — the hostname is resolved and *every*
  resulting IP is checked against the non-public ranges: `0.0.0.0/8`,
  `10.0.0.0/8`, `100.64.0.0/10`, `127.0.0.0/8`, `169.254.0.0/16`,
  `172.16.0.0/12`, `192.0.0.0/24`, `192.168.0.0/16`, `198.18.0.0/15`,
  `224.0.0.0/4`, `240.0.0.0/4`; IPv6 `::/128`, `::1/128`,
  `::ffff:0:0/96`, `fc00::/7`, `fe80::/10`, `ff00::/8`. Literal IPs are
  checked directly.
- **Generic error** — the caller returns `400 "Invalid calendar feed URL"`
  without revealing whether the refusal was the scheme, a private IP, or a
  DNS failure, so the attacker learns nothing to tune a bypass.

Development exception: with `NODE_ENV !== "production"`, loopback targets
over `http://` are allowed so the dev/e2e test feeds at
`http://localhost:3001/api/test/ical/*.ics` keep working.

### Residual risk: DNS rebinding

The guard validates *after resolving*, but `fetch` **re-resolves** the
hostname internally. That opens a TOCTOU race: a DNS server under the
attacker's control can answer the *public* IP to the validation lookup and
a *private* IP (e.g. `127.0.0.1`) to the fetch's own lookup, smuggling a
private target past the check.

**Accepted for now.** Exploiting it requires the attacker to control a
domain and win a tight timing window against a specific fetch. Closing it
means pinning the resolved IP for the actual request (e.g. `https.request`
with a `lookup` override against the validated IP while preserving SNI/Host
for TLS verification). Revisit if Propical becomes a high-value
multi-tenant target.
