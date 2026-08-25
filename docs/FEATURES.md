# FEATURES — Propical

Catálogo de features y casos de uso del fork brasileño de **propical.com.br**.
Última actualización: 2026-08-12

> Property manager gratuito y open-source para anfitriones de alquiler temporario.
> El mapa se organiza por dominios funcionales (Jobs To Be Done); cada feature lista
> cómo se manifiesta y las rutas/modelos que la implementan.

---

## 1. 🔐 Autenticación & Gestión de Cuenta

| # | Feature | Cómo se manifiesta | Rutas clave |
|---|---------|-------------------|-------------|
| 1.1 | **Signup con email** | Registro usuario/contraseña. En dev sin `RESEND_API_KEY` el bypass crea y loguea directo (documentado en README) | `POST /api/auth/signup` → `/signup` |
| 1.2 | **Login con email** | JWT en cookie HTTP-only (`propical-session`), rate-limit 5 intentos/60s por IP | `POST /api/auth/login` → `/login` |
| 1.3 | **Google One Tap / OAuth** | Sign-in con Google; crea cuenta con `hasPassword=false` hasta que se setea contraseña | `GET/POST /api/auth/google*` |
| 1.4 | **Password reset** | Código de 6 dígitos por email, flujo forgot → reset | `/api/auth/forgot-password`, `/reset-password` |
| 1.5 | **Logout** | Limpia la cookie de sesión | `POST /api/auth/logout` |
| 1.6 | **Export de datos** | JSON dump de todo lo atado a la cuenta (GDPR) | `/api/admin/export-my-data` |
| 1.7 | **Account lockout** | Bloqueo tras múltiples intentos fallidos | `src/lib/account-lockout.ts` |
| 1.8 | **Delete account** | Borrado completo con cascada (GDPR right-to-erasure) | Panel de admin |

---

## 2. 🏠 Gestión de Propiedades

| # | Feature | Cómo se manifiesta | Modelo / Ruta |
|---|---------|-------------------|---------------|
| 2.1 | **CRUD de propiedades** | Nombre, minNights, checkIn/Out time, bookingWindow | `Property`, `GET/POST/PATCH/DELETE /api/properties/[id]` |
| 2.2 | **Property switcher** | Cambio de propiedad con atajo de teclado desde la sidebar | `PropertySwitcher` |
| 2.3 | **Slug de feed** | Slug único y permanente por propiedad al crearse (no cambia al renombrar) | `Property.feedSlug` |
| 2.4 | **Token de feed** | Feed público opcionalmente protegido por token por propiedad | `Property.feedToken` |
| 2.5 | **Límite 10 props** | Regla de MVP Propical (herencia del fork) | Validado al crear |

> **Navegación (2026-08-14)**: navbar agrupada por scope — `[Painel | Limpeza | Relatórios] ║ [Calendário | Configurações]`, tab `Propriedade`→`Configurações`, dropdown «Todas as propriedades» con etiqueta neutra + destino contextual (duales → forma global; scoped → Painel), vista «Selecione uma propriedade» para views scoped sin propiedad (sin auto-pick). Mapeo URL↔Navbar e inconsistencias conocidas (DT3): ver `docs/NAVIGATION.md`.

---

## 3. 📅 Sincronización de Calendario Multi-Plataforma

| # | Feature | Cómo se manifiesta | Detalle |
|---|---------|-------------------|---------|
| 3.1 | **iCal link management** | Agregar/editar/borrar URLs de export iCal de Airbnb, Booking, Vrbo, etc. | `CalendarLink`, `POST /api/calendar/links` |
| 3.2 | **Sync automático** | Cada 10 min vía cron (`GET /api/calendar/cron?token=...`), o manual `POST /api/calendar/sync` | `src/lib/calendar-sync.ts` |
| 3.3 | **Buffer days** | Días antes/después de cada booking bloqueados automáticamente por propiedad | `CalendarLink.bufferBefore/After` |
| 3.4 | **Public iCal feed** | Cada propiedad expone su feed combinado (todas las plataformas + bloques manuales) | `GET /api/calendar/feed/[propertyId]/[filename].ics` |
| 3.5 | **Platform presets** | 12+ plataformas pre-cargadas con colores, íconos, instrucciones import/export | `CalendarPlatform` |
| 3.6 | **Sync health** | Monitoreo por plataforma: último fetch, errores, conteo de eventos | `GET /api/calendar/health` |
| 3.7 | **Sync alerts** | Banner de alerta cuando una plataforma falla o está desactualizada | `SyncAlertsBanner` |
| 3.8 | **Sync logs** | Registro de actividad de sync por propiedad (info/warn/error) | `SyncLog` |
| 3.9 | **iCal validation** | Test de URL sin guardar | `POST /api/calendar/test` |

---

## 4. 📋 Reservas & Calendario Visual

| # | Feature | Cómo se manifiesta |
|---|---------|-------------------|
| 4.1 | **Reserva manual** | Crear reserva "direct" clickeando un día en el calendario, con nombre de huésped | `POST /api/reservations` |
| 4.2 | **Claim de booking** | "Reclamar" un evento iCal importado → crea Reservation linkeada al CalendarEvent | Popover "Name this booking" |
| 4.3 | **Editar/borrar reserva** | Cambiar fechas, nombre, plataforma, o eliminar con cascada de guests | `PATCH/DELETE /api/reservations/[id]` |
| 4.4 | **Detección de double-booking** | Conflicto 409 si fechas solapan, flag visual en dashboard | Validación en API |
| 4.5 | **Calendario vertical multi-mes** | Stack infinito sin paginación (hoy−6 meses a hoy+12 meses) | `PropertyCalendar` + `DateSlider` |
| 4.6 | **Barras coloreadas por plataforma** | Cada evento se pinta con el color del `CalendarPlatform` correspondiente | `data-uid`, `data-platform` |
| 4.7 | **Date overrides** | Marcar días como "open" o "closed" manualmente con nota opcional | `DateOverride`, `POST/DELETE /api/date-overrides` |
| 4.8 | **Extensión de reserva** | Reservas linkeadas a un CalendarEvent vía `linkedEventUid` (extensiones direct-pay) | `Reservation.linkedEventUid` |

---

## 5. 🧹 Limpieza (Cleaning Schedule)

| # | Feature | Cómo se manifiesta |
|---|---------|-------------------|
| 5.1 | **Cleaning schedule diario** | Cada check-out → check-in genera una fila de limpieza; conflicto de buffer days flaggeado | `CleaningSchedule` |
| 5.2 | **Cleaner assignment** | Asignar perfiles de cleaner (metadata, sin login) a propiedades, con prioridad (0 = default, 1/2 = backup) | `Cleaner`, `CleanerAssignment` |
| 5.3 | ~~**Cleaner role**~~ | ~~Rol `cleaner` con login y vista restringida~~ — **eliminado (G7, 2026-08-13)**: UI `CleanerApp`/`CleanerShell` + role `"cleaner"` + columna `CleanerAssignment.cleanerId` borrados. Los cleaners son metadata pura (ver 5.8) | ~~`CleanerApp`~~ |
| 5.4 | **Cleaning records** | Marcar limpieza como `pending`/`done`/`skipped`, con fotos y notas | `CleaningRecord`, `POST /api/cleaning-records` |
| 5.5 | **Vista global de limpieza** | Todas las propiedades en una sola tabla | `GlobalCleaningView` |
| 5.6 | **Vista por propiedad** | Limpieza de una propiedad específica | `PropertyCleaningView` |
| 5.7 | **Master toggle** | Deshabilitar lógica de limpieza por propiedad (`cleaningEnabled=false`) | `Property.cleaningEnabled` |
| 5.8 | **Cleaner profiles sin login** | Limpiadores como metadata (nombre, teléfono) sin cuenta; pool scoped por `ownerUserId` (seed del futuro rol Colaborador) | `Cleaner` (profile-only) |

> **Nota (decidido)**: la rotación de cleaners será **manual** — el `priority` queda como sugerencia, no como asignación automática.

---

## 6. 👥 Multi-Propiedad & Co-Hosts

| # | Feature | Cómo se manifiesta |
|---|---------|-------------------|
| 6.1 | **Property managers** | Invitar co-hosts por link con token único; aceptan con un click | `PropertyManagerInvite` → `/invite/[token]` |
| 6.2 | **Manager role** | Co-host ve y gestiona las propiedades asignadas | `PropertyManager` |
| 6.3 | **Revocación de acceso** | El owner puede revocar un manager en cualquier momento | `revokedAt` en `PropertyManagerInvite` |

> **Pendiente**: trazar cada acción del manager en `AuditLog` (¿quién hizo qué en una propiedad compartida?). Ver ISSUES.md — Gestores.

---

## 7. 🛂 Datos de Pasaporte de Huéspedes

> **Eliminado (2026-08)**: el pipeline OCR con Google Gemini (`POST /api/extract`,
> `ExtractionLog`, cuota diaria, UI de dropzone) fue removido del producto. Los
> datos de pasaporte ahora se cargan manualmente o vía los formularios
> pre-arrival (sección 8). El parsing local de documentos (RG/pasaporte)
> sigue como feature propuesta — ver [TODO.md](TODO.md).

| # | Feature | Cómo se manifiesta |
|---|---------|-------------------|
| 7.6 | **Vinculación guest↔reservation** | Cada guest pertenece a una reserva; `parentId` para child→adult | `Guest.reservationId`, `parentId` |

---

## 8. 📝 Pre-Arrival Guest Forms

| # | Feature | Cómo se manifiesta |
|---|---------|-------------------|
| 8.1 | **Form templates por propiedad** | Campos configurables: short-text, long-text, number, select, multi-select, date, time, yes-no, phone | `GuestFormTemplate` |
| 8.2 | **Share link único por reserva** | Link one-time para completar sin login | `GuestFormSubmission.shareToken` → `/g/[token]` |
| 8.3 | **Multi-idioma** | Traducciones por locale de labels, helpText y opciones | `GuestFormTemplate.i18n` |
| 8.4 | **Respuestas inmutables** | Answers capturadas al submit; editar el template no afecta submissions previas | `GuestFormSubmission.answers` |

> **Pendiente**: agregar `field type: "document"` para que el huésped suba el pasaporte desde `/g/[token]` con validación client-side. Detalle en [TODO.md](TODO.md).

---

## 9. ✉️ Message Templates

| # | Feature | Cómo se manifiesta |
|---|---------|-------------------|
| 9.1 | **Templates por propiedad** | Variables: `{{guestName}}`, `{{checkIn}}`, `{{wifiPassword}}`, etc. | `MessageTemplate` |
| 9.2 | **Multi-idioma** | Campo `language` por template | `MessageTemplate.language` |
| 9.3 | **Copy to clipboard** | Un click copia el mensaje resuelto | `MessageTemplatesPanel` |
| 9.4 | **Send offset** | Programar envío N días antes/después | `sendOffsetDays` |

> **Pendiente**: deeplink de WhatsApp/Telegram directo desde el reservation view con el template pre-seleccionado (evitar copy/paste).

---

## 10. 📊 Reportes & KPIs

| # | Feature | Cómo se manifiesta |
|---|---------|-------------------|
| 10.1 | **Reportes multi-propiedad** | Ventanas de 3/6/12/24 meses o all-time | `ReportsPanel` |
| 10.2 | **Métricas** | Occupancy, ADR, revenue por propiedad | Recharts |
| 10.3 | **CSV export** | Export de reservas en CSV (columna `guests` = hóspedes vinculados vía extracción/form, **no** reservas directas) | `GET /api/reservations/export` |
| 10.4 | **Custom legend chart** | Gráfico con leyenda personalizable | Recharts |

> **Nota**: el período (3/6/12/24/all) sí recalcula el chart (verificado en código, `setPeriodMonths` → `buckets` → `aggregate` → `chartData`).

---

## 11. 👤 Gestión de Huéspedes (Guest Management)

| # | Feature | Cómo se manifiesta |
|---|---------|-------------------|
| 11.1 | **CRUD de guests** | Editar campos de pasaporte, notas, teléfono | `PATCH/DELETE /api/guests/[id]` |
| 11.2 | **Guest cards** | Vista de tarjetas de huéspedes en la reserva | `GuestCards` |
| 11.3 | **Group invites** | Guardar link de grupo WhatsApp/Telegram por reserva, con validación de URL | `Reservation.waGroupUrl`, `tgGroupUrl` |
| 11.4 | **Group name** | Nombre personalizado del grupo (o auto-generado) | `Reservation.groupName` |
| 11.5 | **Guest phone** | Teléfono de contacto por reserva (E.164 laxo) | `Reservation.phone` |
| ~~11.6~~ | ~~**Cmd-K search**~~ | ~~Búsqueda global de huéspedes por nombre~~ — **REMOVIDO**: solo buscaba `Guest`, inútil sin extracción de pasaporte | — |

---

## 12. 🗑️ Blog — ELIMINADO (2026-08-13)

> El blog completo (público + admin + APIs + modelos `BlogPost`/`BlogTag`/`BlogComment`)
> se eliminó de la aplicación. El contenido markdown se archivó en [`docs/blog/`](blog/)
> para revisión futura; el detalle del trabajo quedó registrado en el historial de commits.
> El sitemap pasó a ser estático (`/`, `/onboard`, `/signup`, `/login`, `/terms`, `/privacy`).

---

## 13. 🛠️ Admin / Super-Admin

| # | Feature | Ruta dashboard admin |
|---|---------|---------------------|
| 13.1 | **User management** | CRUD de usuarios, suspensión, roles | `/dashboard/admin/workspace/users` |
| 13.2 | **Property audit** | Auditoría: logs de create/update/delete | `/dashboard/admin/operations/property-audit` |
| 13.3 | **Sync logs viewer** | Logs de sincronización | `/dashboard/admin/operations/sync-logs` |
| 13.4 | **System status** | Health del sistema, métricas | `/dashboard/admin/operations/status` |
| 13.5 | **Scheduled jobs** | Gestión de cron jobs | `/dashboard/admin/operations/scheduled-jobs` |
| 13.6 | **Platform management** | Agregar/editar plataformas (custom presets) | `/dashboard/admin/integrations/platforms` |
| 13.7 | **SEO overrides** | Metadata por página y locale (title, description, OG image, canonical) | `SeoOverride`, `/dashboard/admin/integrations/seo` |
| 13.8 | **Site settings** | Config global: support email y anuncios | `SiteSetting`, `/dashboard/admin/workspace/site-settings` |
| 13.9 | **Feedback queue** | Revisar feedback (new/read/archived) | `/dashboard/admin/content/feedback` |
| 13.10 | **Guest forms admin** | Todos los forms y submissions | `/dashboard/admin/content/guest-forms` |
| 13.11 | **Feed token management** | Tokens de feed por propiedad | `/dashboard/admin/integrations/feed-tokens` |
| 13.12 | **iCal links admin** | Vista global de links | `/dashboard/admin/integrations/ical-links` |
| 13.13 | **Impersonation** | Super-admin puede impersonar a cualquier usuario | `ImpersonationBanner` |
| 13.14 | **Announcement banner** | Banner global configurable | `AnnouncementBanner` + `AppSettings` |

> **Nota**: el acceso a `/dashboard/admin/*` es exclusivo de `role === "superadmin"`. El signup **no** es vector de promoción (role hardcodeado a `"user"`).

---

## 14. 🌐 Landing & Páginas Públicas

| # | Feature | Detalle |
|---|---------|---------|
| 14.1 | **Home page** | Landing multi-idioma (en/es) con JSON-LD (`FAQPage`, `SoftwareApplication`) | `/` |
| 14.2 | **Onboarding wizard** | Flujo pre-signup: nombrar propiedad → conectar calendario → "sample property" | `/onboard` |
| 14.3 | **Terms & Privacy** | Páginas legales | `/terms`, `/privacy` |
| 14.4 | **Feedback público** | Botón flotante "Send feedback" (rate-limited) | `FeedbackButton` → `POST /api/feedback` |
| 14.5 | **SEO** | Overrides por path/locale, sitemap estático, robots.txt, hreflang | `SeoOverride`, `/sitemap.ts`, `/robots.ts` |

---

## 15. 🔔 UX / Infraestructura Compartida

| # | Feature | Detalle |
|---|---------|---------|
| 15.1 | **i18n** | 3 locales: `en`, `pt` (default), `es`. Detección vía cookie `rt-locale` o `Accept-Language` | `src/lib/i18n/` |
| 15.2 | **Tema claro/oscuro** | Toggle en top-bar, CSS variables | `ThemeToggle` |
| 15.3 | **Keyboard shortcuts** | Atajo `?` para overlay de ayuda (el Cmd-K de guest search fue removido) | `KeyboardShortcuts` |
| 15.4 | **Breadcrumbs** | Navegación jerárquica | `Breadcrumbs` |
| 15.5 | **Audit log** | Registro de acciones create/update/delete por usuario | `AuditLog` |
| 15.6 | **Rate limiting** | Por IP hash + por cuenta en endpoints sensibles | `src/lib/rate-limit.ts` |
| 15.7 | **Sentry** | Error tracking edge + server | `sentry.edge.config.ts`, `sentry.server.config.ts` |
| 15.8 | **PWA** | Manifest, instalable como app mobile | `manifest.ts` |
| 15.9 | **CSRF protection** | JWT cookie HTTP-only + SameSite | |

---

## 📐 Arquitectura Técnica (resumen)

```
Stack:        Next.js 16 (App Router) + TypeScript strict + React 19
UI:           Tailwind CSS 4 + shadcn/ui + Recharts + Lucide Icons
Auth:         jose JWT en cookie HTTP-only + bcryptjs + Google OAuth
DB:           SQLite (libSQL) vía Prisma 7, schema en prisma/schema.prisma
Testing:      Vitest (214 tests unitarios) + Playwright (11 specs e2e)
Error tracking: Sentry
```

**Estructura de rutas:**
- `src/app/` — 25+ rutas Next.js (pages + layouts)
- `src/app/api/` — 26 grupos de endpoints REST
- `src/components/` — 56 componentes React
- `src/lib/` — 53 módulos de lógica (auth, iCal, i18n, SEO, etc.)
- `prisma/` — schema con 22 modelos

---

## 🔀 Diff Propical vs RentTools upstream

| Área | Cambio |
|------|--------|
| **i18n** | Locales reducidos de 5 (en/ru/de/fr/es) a 3 (**pt** default, en, es) |
| **MVP rules** | Límite 10 propiedades, sin soporte 1:1, sin pricing intelligence, sin WhatsApp inbox, gratis sin trial |
| **Branding** | Rebrand completo RentTools → propical |
| **Dev mode** | Signup mockeado sin verificación de email si `NODE_ENV !== 'production'` y no hay `RESEND_API_KEY` |
| **DB** | SQLite local (`data/prod.db`) |
| **Tests** | 214 tests unitarios + 11 specs e2e (Playwright) |

---

## 🧪 Cobertura de Tests E2E Actual

| Spec | Tests | Qué cubre |
|------|-------|-----------|
| `auth.spec.ts` | 5 | Signup, login (válido/inválido), session gating, logout, health check |
| `calendar.spec.ts` | 4 | Reserva manual, claim de booking iCal, claim→vista completa, platform "Direct" |
| `dashboard-onboarding.spec.ts` | 2 | Wizard: sample property escape, name→connect calendar→manual escape |

**Total: 11 tests e2e.** Faltan specs para: cleaning, guest forms, message templates, reports, admin panel y multi-property managers.

---

## 📅 Modelo de Fechas: UTC vs. Día de Calendario

Las reservas y los eventos iCal guardan la misma fecha de dos formas **distintas**:

| Dato | Cómo se guarda | Ejemplo |
|------|----------------|---------|
| Reserva (`checkIn`/`checkOut`) | Instante UTC (hora `00:00:00` + `Z`) | `2026-08-14T00:00:00.000Z` |
| Evento iCal (`startDate`/`endDate`) | Día de calendario flotante (sin zona) | `2026-08-14` |

Un instante UTC leído con getters **locales** (`getFullYear`/`getDate`) se corre ±1 día en timezones no-UTC (ej. en Argentina `2026-08-14T00:00:00Z` es el **13** a las 21:00). Eso rompía el claim, el dedup reserva↔iCal y la extensión de reservas — una familia entera de bugs de timezone.

**Reglas que garantiza la app (cualquier timezone del server o del browser):**

1. **`toUtcDateStr(d)`** — lee un instante UTC con getters UTC → round-trip `date-string → Date → date-string` **lossless** en cualquier país. Usado para leer reservas en surfaces que comparan contra strings de iCal.
2. **`localMidnightFromDateStr(s)` + `toLocalDateStr(d)`** — par de construcción/lectura **local**: la medianoche local + getters locales round-trippean el día de calendario exacto. Nunca mezclar con lecturas UTC.
3. **`reservationDateKey(checkIn, checkOut)`** — key de dedup reserva↔iCal (`start|end`) que aterriza en los mismos días que `ev.startDate|ev.endDate` en toda timezone. Es el corazón del claim/dedup del dashboard.
4. El **único** lugar que depende de la zona del browser es el "hoy" (cortes de limpieza, marcador de día actual) — deliberado.

**Cobertura:** `src/components/calendar/date-tz-invariance.test.ts` corre los helpers, `getExtendableBookings` y `buildCalendarExportText` bajo `America/Argentina/Buenos_Aires`, `Asia/Tokyo`, `Europe/Madrid` y `UTC`, assertando salida idéntica en todas.
