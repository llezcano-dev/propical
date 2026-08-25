# E2E Testing — Propical

Infraestructura de tests end-to-end con Playwright para propical
(fork de RentTools.io).

---

## Tabla de contenidos

- [Nuevos archivos](#nuevos-archivos)
- [Script de ejecución](#script-de-ejecución)
- [Specs de tests y su razón de ser](#specs-de-tests-y-su-razón-de-ser)
- [Fixtures (helpers)](#fixtures-helpers)
- [Archivos iCal de test](#archivos-ical-de-test)
- [Arquitectura contra el rate limit de login](#arquitectura-contra-el-rate-limit-de-login)
- [Convención de selectores: `data-testid` vs `data-*`](#convención-de-selectores-data-testid-vs-data-)
- [Fixes aplicados durante el setup](#fixes-aplicados-durante-el-setup)
- [Cómo ejecutar](#cómo-ejecutar)
- [Problemas conocidos](#problemas-conocidos)
- [Troubleshooting — flaky en test 1.2](#troubleshooting--flaky-en-test-12)
- [Simplificación futura](#simplificación-futura)

---

## Nuevos archivos

```
playwright.config.ts          ← Config de Playwright (sin webServer, 2 proyectos)
.env.test                     ← Variables de entorno para DB de test
e2e/
├── global-setup.ts           ← Login UNA vez, guarda cookies para el proyecto "authenticated"
├── auth.spec.ts              ← Spec: login, signup, logout, session gating (7 tests)
├── calendar.spec.ts          ← Spec: reserva manual + claim de booking iCal (2 tests)
├── dashboard-onboarding.spec.ts ← Spec: wizard de onboarding (2 tests)
├── fixtures/
│   ├── auth.ts               ← Helpers: login(), signup(), logout(), assertProtectedRedirect()
│   ├── db.ts                 ← Helpers: resetTestDb(), seedTestDb()
│   └── property.ts           ← Helpers: createProperty(), addCalendarLink(), triggerSync(), etc.
public/test-fixtures/
├── airbnb-sample.ics         ← iCal de Airbnb con 4 eventos (3 reservas + 1 bloqueo)
└── booking-sample.ics        ← iCal de Booking con 3 eventos (2 reservas + 1 bloqueo)
scripts/
└── run-e2e.sh                ← Script que levanta server, DB, y corre tests
```

### Dependencia nueva

```
@playwright/test  1.62.1  (devDependency)
```

---

## Script de ejecución

`scripts/run-e2e.sh` — script autónomo que hace todo el ciclo:

```bash
pnpm test:e2e                     # todos los specs
pnpm test:e2e auth.spec.ts        # un spec específico
pnpm test:e2e --keep              # deja el server corriendo al terminar
pnpm test:e2e visual.spec.ts --update-snapshots   # (re)genera el baseline visual
```

> **Baseline visual** (`visual.spec.ts`): los PNGs viven en
> `e2e/visual.spec.ts-snapshots/` (gitignoreados, efímeros por rama — `cleanup.sh` los
> borra en cada `branch-finish`). Flujo: generar el baseline desde **main limpio** con
> `--update-snapshots`, aplicar los cambios de la rama, y rerunear el spec sin el flag
> para confirmar diff 0. `--update-snapshots` es passthrough del flag homónimo de
> Playwright: escribe/reemplaza los "to-be" en vez de comparar.

### Qué hace

1. Mata cualquier proceso en puerto 3001 (el e2e NO usa el 3000 del dev server)
2. Borra y recrea `data/test.db`
3. Corre `pnpm db:push` (crea schema)
4. Corre `pnpm db:seed-test-user` (usuario e2e dedicado `e2e@propical.com.br / E2eTest123456!` — distinto del usuario de dev `test@propical.com.br` que crea el seed por defecto, para que el testeo manual no contamine los datos de e2e)
5. Levanta `next dev -p 3001` con `DATABASE_URL=file:./data/test.db` en background (usa `pnpm exec next dev` directo — bypasea `scripts/dev.sh`, que mata stale servers en :3000, para no tocar el dev server del usuario)
6. Espera hasta que `curl http://localhost:3001` responda (máx 60s)
7. Corre `npx playwright test`
8. Al terminar (éxito o fallo), mata el dev server y `data/test.db`
9. Con `--keep`, deja el server corriendo para debugear con `--ui`

### Playwright config (`playwright.config.ts`)

- `workers: 1` — SQLite no soporta escritura concurrente
- `baseURL: http://localhost:3001` (configurable con `E2E_BASE_URL`; `run-e2e.sh` usa `E2E_PORT`, default 3001)
- `headless: true`
- `executablePath: /usr/bin/chromium` — usa Chromium del sistema
- **Sin `webServer`** — el server se levanta con `run-e2e.sh` en vez de Playwright, para controlar mejor las env vars (evita conflicto con `.env.local` que apunta a `prod.db`)
- **`globalSetup: e2e/global-setup.ts`** — loguea UNA vez con el test user y guarda cookies en `e2e/.auth/test-user.json` (gitignoreado)
- **2 proyectos** que separan los specs por requerimiento de auth:

| Proyecto | testMatch | storageState | Specs |
|---|---|---|---|
| `auth` | `auth.spec.ts`, `admin-gate.spec.ts`, `superadmin-gates.spec.ts` | — (cada test maneja su propio login/logout) | Auth + gates admin |
| `authenticated` | `calendar.spec.ts`, `dashboard-onboarding.spec.ts`, `cleaner-leak.spec.ts`, `reports.spec.ts`, `navbar.spec.ts` | `e2e/.auth/test-user.json` | Calendar, onboarding, cleaner-leak, reports, navbar |

La razón de esta separación es el **rate limit de login** — ver [Arquitectura contra el rate limit de login](#arquitectura-contra-el-rate-limit-de-login).

---

## Specs de tests y su razón de ser

### `e2e/auth.spec.ts` — 7 tests

El spec más crítico. Sin auth, ningún otro spec puede ejecutarse.

| # | Test | Por qué |
|---|------|---------|
| 1.1 | Signup crea cuenta y va a `/dashboard` | Verifica el flow completo: formulario → API → sesión → dashboard |
| 1.2 | Signup con email duplicado muestra error | Valida manejo de conflicto (409) |
| 1.3 | Login con credenciales válidas | Verifica el flow de login exitoso |
| 1.4 | Login con password inválido | Valida manejo de credenciales incorrectas (401) |
| 1.6 | `/dashboard` sin sesión redirige a `/login` | Verifica middleware de protección de rutas |
| 1.7 | Logout limpia sesión | Verifica que el cookie se borra y la ruta protegida vuelve a redirigir |
| Health | Server responde y login API no crashea | Smoke test: homepage 200, login page 200, login API no es 500 |

> El test 1.5 (submit vacío) fue **eliminado**: era redundante con 1.4 (ambos
> pegan a `/api/auth/login` con credenciales inválidas) y cada POST al login
> consume un slot del bucket compartido de rate limit (5 intentos/60s por IP).
> El health check también dejó de hacer POST al login — ver [Arquitectura
> contra el rate limit](#arquitectura-contra-el-rate-limit-de-login).

### `e2e/calendar.spec.ts` — 2 tests

Cubre el ciclo de reservas desde el calendario. Corre en el proyecto
`authenticated` (usa el storageState de `global-setup.ts`, nunca loguea).

| # | Test | Por qué |
|---|------|---------|
| 2.1 | Crear reserva manual desde un día seleccionado | Flujo completo: click en celda → panel lateral → "Create reservation" → form → verifica vía API |
| 2.2 | Claimear un booking iCal sincronizado desde la barra | Flujo de claim: barra del evento sync → popover → nombre del huésped → verifica vía API |

Ambos crean una propiedad efímera (`createProperty`) y la borran al final
(`deleteProperty`) para no ensuciar la DB de test.

### `e2e/dashboard-onboarding.spec.ts` — 2 tests

Cubre el wizard de onboarding in-dashboard (host nuevo con 0 propiedades).
Usa `signup()` con email único, así cada test arranca con un usuario limpio.

| # | Test | Por qué |
|---|------|---------|
| 3.1 | Sample property escapa del wizard sin recarga completa | **Valida el fix crítico**: `onComplete` → refetch sin `window.location.reload()`. Marca un flag en `window` y verifica que sobrevive (una recarga lo borraría) |
| 3.2 | Nombrar propiedad avanza al paso de conectar calendario; escape manual sale | Flujo de 2 pasos del wizard + el segundo camino de salida (link manual) |

### `e2e/admin-gate.spec.ts` — 6 tests (G2 + E1)

Ahora también cubre el guard de seed (G1) y el gate de suspensión (G3):

| # | Test | Por qué |
|---|------|---------|
| 2.1/2.2 | Non-superadmin recibe 404 en `/dashboard/admin/*` (shell y nested) | G2: defense-in-depth del layout admin |
| G1.1 | Seed **refuse** el username `admin` en producción (exit ≠ 0) | CLI, sin browser: `execSync` con `NODE_ENV=production` + `SEED_ADMIN_USERNAME=admin` sobre `data/test.db` |
| G1.2 | Seed con username custom + password → exit 0 y persiste | 2ª corrida → "password updated" prueba que la fila quedó |
| G3.1 | Superadmin no puede suspender su propia cuenta (400) | Refuse self |
| G3.2 | Superadmin puede suspender otro user (200) | Target creado vía fixture con role "user" (no gasta signup) |

### `e2e/superadmin-gates.spec.ts` — 2 tests (E2, G4 + G5)

| # | Test | Por qué |
|---|------|---------|
| Non-admin | cron-url + schedule → 403; `?view=tasks`/`?view=settings` → "Admin only."; secret nunca en DOM | El cron secret es la llave que dispara un sync global: no debe llegar a un non-admin |
| Superadmin | cron-url → 200 con `?secret=`; schedule → 200 con defaults; `PUT {autoEnabled:true}` → 200; TasksPanel muestra cron URL + frecuencia | Gate GET **y** PUT; el secret sí es visible para el operador |

### Sesiones superadmin minteadas (fixtures/superadmin.ts)

Los specs de gates no pasan por `/api/auth/login`: crean el user vía script tsx
(`create-superadmin-user.ts`, INSERT role `superadmin`) y **mintean el JWT de sesión**
con `jose` + `setSession()`, usando el `JWT_SECRET` fijo de `run-e2e.sh`
(`e2e-test-secret-do-not-use-in-production-32bytes`). Así el bucket de login
(5/60s) queda en 4 usos (global-setup + auth.spec) sin depender del timing entre
specs. Regla: si un spec necesita una sesión que no existe por signup, mintéala —
nunca sumes POSTs al login.

### `e2e/reports.spec.ts` — 1 test (E3, B6)

Valida que el rango único `[De, Até]` es la source of truth de chart+tabla+KPIs+CSV:

| Paso | Qué verifica |
|---|---|
| Setup | 1 propiedad + 2 reservas en meses distintos (2 y 8 meses atrás) |
| 6M default | `rangeLabel` del header muestra el rango de 6 meses; CSV con `from=<mes-6>` **recorta** la reserva vieja |
| 12M | `rangeLabel` se estira a 12 meses; CSV con `from=<mes-12>` **incluye** la reserva vieja |
| Volver a 6M | CSV recorta de nuevo |

El CSV se captura como evento `download` (`page.waitForEvent("download")`); la URL
lleva `from`/`to` del preset activo y el body correlaciona con el rango visible.

### `e2e/navbar.spec.ts` — 3 tests (E4, U1)

| Test | Qué verifica |
|---|---|
| A1 | `?view=calendar` sin propiedad → `PropertyRequiredView` ("Selecione uma propriedade") + hint en el tab; sin ghost state (no grid `[data-date]`, selector neutral) |
| A2 | En Limpeza, el dropdown "Todas as propriedades" **queda** en Limpeza global (label "Todas as propriedades (N)") — destino dual |
| A3 | En Calendário, el dropdown "Todas" aterriza en **Painel** (`allPropertiesDestination` = dashboard → URL `/dashboard`, grid fuera) |

### Locale pt pinneado (fixtures/locale.ts)

Chromium envía `Accept-Language: en-US` → el middleware resuelve `"en"` aunque
`DEFAULT_LOCALE` sea `"pt"`. Los specs que asertan copy pt deben fijar la cookie
`rt-locale=pt` con `usePtLocale(page)` **antes** del primer `goto`. Regla: no
cambiar `use.locale` globalmente — specs existentes (auth, admin-gate,
superadmin-gates) asertan EN a propósito.

### Hardening de global-setup (anti-hydration-race)

`global-setup.ts` usaba `page.fill` crudo y era el único login susceptible a la
race de hidratación (el timeout intermitente de 30s documentado abajo). Ahora usa
el mismo stack que `auth.ts`: `waitHydrated()` (`networkidle` tras goto) +
`fillSettled()` (retry fill + `toHaveValue` con pre-check de `inputValue`).

### Anti-flake en verificación por API (calendar.spec 2.1)

El GET de verificación de reservas se envuelve en `expect(...).toPass({ timeout })`:
bajo carga, el dev server puede responder `ECONNRESET` transitorio a una conexión
nueva mientras aún procesa el POST previo. El retry de la lectura idempotente
absorbe ese reset sin reintentar la escritura.

### Selectores usados

- `input#username`, `input#password` — campos del form de login
- `input#email`, `input#password` — campos del form de signup
- `button[type='submit']` — botón de submit en ambos forms
- `button[aria-label="User menu"]` — menú de usuario en dashboard
- `button.text-rose-500` — botón de logout (tiene clase `text-rose-500` en top-bar.tsx)
- `[role="alert"]:not([id="__next-route-announcer__"])` — alertas de error, excluyendo el announcer interno de Next.js
- `input#code` — campo de verificación en signup (señal de que el API respondió)

### Por qué estos y no otros

- **Login/Signup** → desbloquea acceso a todas las features autenticadas
- **Session gating** → verifica que el middleware funciona, protección básica de seguridad
- **Health check** → smoke test para detectar crashes del server antes de correr specs más pesados
- **NO incluye Google OAuth** → requiere credenciales reales + dominio público, no testeable en local
- **NO incluye reset password** → requiere RESEND_API_KEY, no disponible en dev

---

## Fixtures (helpers)

### `e2e/fixtures/auth.ts`

| Función | Qué hace |
|---------|----------|
| `signup(page, email, password)` | Navega a `/signup`, llena form, espera que el API devuelva → espera `input#code` (señal de éxito) → navega a `/dashboard` |
| `login(page)` | Navega a `/login`, llena credenciales seed, espera response del API → navega a `/dashboard` |
| `logout(page)` | Abre menú de usuario → click en botón rose → espera redirect a `/login` |
| `assertProtectedRedirect(page, path)` | Navega a ruta protegida → verifica redirect a `/login?next=...` |

#### Detalle importante: signup en dev bypass

En dev sin `RESEND_API_KEY`, el API de signup (`src/app/api/auth/signup/route.ts` línea 84-88) crea la cuenta **inmediatamente** y setea el cookie de sesión. Pero el **cliente** siempre transiciona al paso "verify" (muestra `input#code`). El fixture espera ese input y luego navega a `/dashboard` directamente — el cookie ya está puesto, así que el middleware deja pasar.

### `e2e/fixtures/db.ts`

| Función | Qué hace |
|---------|----------|
| `resetTestDb()` | Borra `data/test.db`, `-journal`, `-wal`, `-shm` |
| `seedTestDb()` | Ejecuta `pnpm db:push` + `pnpm db:seed-test-user` con env vars de test |

### `e2e/fixtures/property.ts`

Para futuros specs de calendar import y dashboard CRUD:

| Función | Qué hace |
|---------|----------|
| `createProperty(page, name)` | `POST /api/properties` |
| `deleteProperty(page, id)` | `DELETE /api/properties/[id]` |
| `addCalendarLink(page, propertyId, platform, url)` | `POST /api/calendar/links` |
| `triggerSync(page, propertyId)` | `POST /api/calendar/sync` |
| `testICalUrl(page, url)` | `POST /api/calendar/test` |
| `navigateToPropertyView(page, propertyId, view)` | `page.goto(/dashboard?property=X&view=Y)` |

---

## Archivos iCal de test

Servidos como estáticos por Next.js desde `/public/test-fixtures/`. El parser
(`src/lib/ical.ts → parseICal`) los lee con `fetch()`.

### `airbnb-sample.ics`

4 eventos con fechas en agosto-septiembre 2026 (siempre futuras):

| UID | SUMMARY | Fechas | Tipo |
|-----|---------|--------|------|
| `airbnb-res-001@e2e` | Reserved | 10-15 Ago | Reserva |
| `airbnb-res-002@e2e` | Reserved | 20-24 Ago | Reserva |
| `airbnb-block-001@e2e` | Not available | 5-7 Ago | Bloqueo |
| `airbnb-res-003@e2e` | Reserved | 1-7 Sep | Reserva |

### `booking-sample.ics`

3 eventos:

| UID | SUMMARY | Fechas | Tipo |
|-----|---------|--------|------|
| `booking-res-001@e2e` | Booking.com reservation | 12-18 Ago | Reserva |
| `booking-res-002@e2e` | John Smith | 25-28 Ago | Reserva |
| `booking-block-001@e2e` | Closed | 2-4 Ago | Bloqueo |

**Overlap intencional**: Airbnb res-001 (10-15 Ago) se solapa con Booking
res-001 (12-18 Ago) — permite testear detección de conflictos en calendario.

**Nota**: Airbnb y Booking ponen datos diferentes en el iCal real. Estos
fixtures son minimalistas y pueden necesitar ajustes cuando se implemente
el spec de calendar import (el parser actual solo lee UID, SUMMARY, DTSTART,
DTEND — no procesa DESCRIPTION ni otros campos extendidos).

### Mocks para desarrollo manual (`public/mock/`)

Para probar el import de iCal localmente con `pnpm dev`, usá los mocks
generados en `/public/mock/`:

```bash
pnpm mock:ical
```

Esto crea/actualiza:

- `public/mock/airbnb.ical`
- `public/mock/booking.ical`

Sus fechas son **relativas al día de hoy**, por lo que se regeneran cada vez
que corrés el comando. Están en `.gitignore` y son editables a mano.

**Diferencias clave con los fixtures de e2e**:

| | `public/test-fixtures/` | `public/mock/` |
|---|---|---|
| Uso | e2e (`calendar.spec.ts`) | `pnpm dev` manual |
| Commiteados | Sí | No (`.gitignore`) |
| Fechas | Fijas (Ago-Sep 2026) | Relativas a hoy |
| Contenido | Minimalista, estático | Realista, cambiante |

**URLs locales para agregar en Settings → Calendar sync**:

- `http://localhost:3000/mock/airbnb.ical`
- `http://localhost:3000/mock/booking.ical`

**Reglas de oro si editás a mano**:

1. Mantené las fechas futuras (el sync descarta `endDate < hoy`).
2. No uses UIDs `renttool-*` ni `SUMMARY:Blocked (...)` — el sync los filtra.
3. Los bloqueos de 1 día adyacentes a otros eventos se filtran como buffer
   reflejado; dejalos multi-día o aislados.
4. Conservá el UID para actualizar fechas; cambialo solo si querés un evento nuevo.

---

## Arquitectura contra el rate limit de login

**Problema original**: correr TODOS los specs juntos fallaba con

```
Error: Login failed with status 429: {"error":"Too many login attempts. Try again in 44s."}
```

**Causa**: `/api/auth/login` (ver `src/lib/rate-limit.ts` + `src/app/api/auth/login/route.ts`)
tiene rate limit de **5 POSTs por IP por ventana de 60s**. El bucket es
**compartido entre todos los specs**, porque corren contra el mismo dev
server (misma IP). El conteo real:

| POST al login | Quién lo dispara |
|---|---|
| 1 | `auth.spec.ts` 1.3 — login válido |
| 2 | `auth.spec.ts` 1.4 — password inválido (también pega al endpoint) |
| 3 | `auth.spec.ts` 1.5 — form con espacios (eliminado, era redundante) |
| 4 | `auth.spec.ts` 1.7 — logout + re-login |
| **5** | **`calendar.spec.ts` 2.1 — PRIMER login del spec de calendar → 429** |

Los tests de login *fallido* (1.4, 1.5) consumen slots del mismo bucket, así
que cualquier spec posterior que llame `login()` quedaba fuera del límite.
Usar `signup()` en vez de `login()` no resolvía nada: solo trasladaba el
problema al bucket de signup (también 5/60s).

**Solución — patrón `globalSetup` + `storageState`** (2 capas):

1. **`e2e/global-setup.ts`** — corre UNA vez antes de todos los tests. Abre
   Chromium, loguea con el test user, y guarda las cookies de sesión en
   `e2e/.auth/test-user.json` (gitignoreado).
2. **`playwright.config.ts`** — separa los specs en 2 proyectos:
   - `auth` (sin `storageState`): cada test maneja su propio login/logout.
     Es el único que pega al endpoint de login, y lo hace a propósito
     (testea el flujo).
   - `authenticated` (con `storageState`): Playwright inyecta las cookies
     guardadas en cada contexto de browser. Los specs de calendar y
     onboarding **nunca** llaman a `login()` ni pegan al endpoint.

**Conteo final de POSTs al login** (4 de 5, margen holgado):

| Orden | Origen |
|---|---|
| 1 | `global-setup.ts` (único login de toda la suite) |
| 2 | `auth.spec.ts` 1.3 — login válido |
| 3 | `auth.spec.ts` 1.4 — password inválido |
| 4 | `auth.spec.ts` 1.7 — logout + re-login |

**Reglas para specs futuros**:

- Un spec que solo necesita "estar logueado" → va al proyecto
  `authenticated`, NO llama a `login()`.
- Un spec que testea el flujo de auth (o necesita estar SIN sesión) →
  va al proyecto `auth`.
- Nunca agregar un POST innecesario al login solo para "smoke test"
  (se quitó del health check — un GET alcanza).
- El bucket de signup tiene el mismo límite (5/60s): `signup()` con email
  único, máximo ~2 por spec para no agotarlo entre specs.

---

## Convención de selectores: `data-testid` vs `data-*`

Para que los specs sean robustos (y sobrevivan cambios de copy/estructura)
se siguen estas reglas al elegir selectores:

### `data-testid` — elementos sin identidad de dominio

Para inputs de formulario, botones y links donde no existe un valor natural
que los identifique. El testid es un "id del test" puro:

| testid | Componente |
|---|---|
| `res-guest-name`, `res-save` | `src/components/date-actions-popover.tsx` (form de reserva) |
| `claim-guest-name`, `claim-save` | `src/components/calendar/bar-claim-popover.tsx` (popover de claim) |
| `onboarding-name`, `onboarding-continue`, `onboarding-sample`, `onboarding-manual` | `src/components/dashboard-onboarding.tsx` (wizard) |

### `data-*` — valores del modelo de dominio expuestos al DOM

Cuando el valor que el test necesita **ya existe en el modelo de datos**,
se expone como atributo `data-*` semántico (no como testid artificial):

| Atributo | Dónde | Qué representa |
|---|---|---|
| `data-date="YYYY-MM-DD"` | Celdas del grid (`calendar-grid.tsx`) | El día que pinta la celda |
| `data-uid` | Barras de segmento (`calendar-grid.tsx`) | El `UID` iCal del evento (`eventUid`) — **universal por RFC 5545**, todo `VEVENT` de cualquier OTA lo tiene |
| `data-reservation-id` | Barras de segmento (`calendar-grid.tsx`) | El id de la reserva (vacío para eventos no claimeados) |

**Regla**: si el valor del selector ya es identidad del dominio → `data-*`
semántico. Si es un elemento sin identidad natural → `data-testid`. Esto
permite selectores estables tipo `[data-uid="airbnb-res-001@e2e"]` o
`[data-date="2026-09-19"]` que describen el DOM con precisión.

---

## Fixes aplicados durante el setup

### 1. Reducción de locales (`en` + `es`, default `en`)

**Problema**: La homepage crasheaba con 500 porque `HOME_META` en `page.tsx`
no tenía entrada para `pt` (el default anterior). Cuando `getLocale()`
devolvía `"pt"`, `HOME_META["pt"]` era `undefined` y `meta.title` explotaba.

**Cambios**:

| Archivo | Cambio |
|---------|--------|
| `src/middleware.ts` | `SUPPORTED_LOCALES = ["en", "es"]`, `DEFAULT_LOCALE = "en"` |
| `src/lib/i18n/alternates.ts` | Ídem |
| `src/lib/i18n/context.tsx` | Default `"pt"` → `"en"`, `LOCALE_MAP` sin `pt` |
| `src/app/page.tsx` | `HOME_META` tipo `Record<string, ...>` (solo en/es), fallback `?? HOME_META.en`. `COPY` igual con fallback. |
| `src/lib/seo.ts` | Defaults hardcodeados `"pt"` → `"en"` (líneas 112, 162) |
| `src/lib/i18n/cookie.test.ts` | Tests actualizados de `pt` a `es` |
| `src/lib/seo.test.ts` | `isValidSeoLocale("pt")` → `isValidSeoLocale("es")` |

**Efecto**: La app ya no crashea en homepage. Los bloques `ru`/`de`/`fr` en
`COPY` (page.tsx) siguen siendo código muerto — se pueden borrar en un
refactor separado.

### 2. Selector `[role="alert"]` con strict mode

**Problema**: `page.locator('[role="alert"]')` resolvía a 2 elementos:
1. El `AuthError` component (`<div role="alert">`)
2. El `__next-route-announcer__` de Next.js (`<div role="alert" aria-live="assertive" id="__next-route-announcer__">`)

Playwright en strict mode falla con "resolved to 2 elements".

**Fix**: `page.locator('[role="alert"]:not([id="__next-route-announcer__"])')`

### 3. `eslint.config.mjs` — exclusión de e2e

Agregados a `globalIgnores`:
```
"e2e/**", "playwright.config.ts", "public/test-fixtures/**"
```

### 4. `.gitignore` — cobertura existente

`playwright-report/`, `test-results/`, `*.db`, `/data/` ya estaban en
`.gitignore`. `.env.*` excepto `.env.example` también.

---

## Cómo ejecutar

### Todo en uno

```bash
pnpm test:e2e                    # todos los specs
pnpm test:e2e auth.spec.ts       # un spec
pnpm test:e2e --keep             # deja server corriendo para debug
```

### Manual (para debug)

```bash
# Terminal 1 — server
kill $(lsof -t -i:3001) 2>/dev/null; sleep 1
rm -f data/test.db data/test.db-journal
DATABASE_URL=file:./data/test.db pnpm db:push
DATABASE_URL=file:./data/test.db TEST_USER_EMAIL=e2e@propical.com.br TEST_USER_PASSWORD=E2eTest123456! pnpm db:seed-test-user
DATABASE_URL=file:./data/test.db pnpm dev -- -p 3001

# Terminal 2 — tests
npx playwright test --config=playwright.config.ts auth.spec.ts
npx playwright test --config=playwright.config.ts --ui      # UI mode
npx playwright test --config=playwright.config.ts --headed  # con ventana
```

---

## Decisiones de diseño

Durante el desarrollo de la infraestructura de e2e se tomaron varias
decisiones no obvias. Esta sección documenta el _por qué_ de cada una.

### 1. Sin `webServer` en Playwright config

**Decisión**: El dev server se levanta desde `run-e2e.sh`, no desde
`playwright.config.ts`.

**Por qué**: Playwright permite declarar un `webServer` en la config
que arranca y para el server automáticamente. El problema es que Next.js
carga `.env.local` al iniciar, y aunque Playwright pase `DATABASE_URL`
como env var al proceso, no hay garantía de que Next.js no lo pise
(depende de la implementación interna de `@next/env`). Con el script
bash tenemos control total: exportamos la variable ANTES de `pnpm dev`,
verificamos que el puerto esté libre, y comprobamos que el server
realmente responda en el puerto elegido (no en el siguiente libre por
fallback de Next.js).

### 2. DB lifecycle gestionado por el script, no por los tests

**Decisión**: `run-e2e.sh` crea y seedea `test.db` una sola vez antes
de arrancar el server. Los tests **no** llaman a `resetTestDb()` ni
`seedTestDb()` en sus `beforeAll`.

**Por qué**: Dos razones:

1. **File descriptor stale**: El dev server de Next.js abre una conexión
   a `test.db` al iniciar y mantiene el file descriptor abierto. Si un
   `beforeAll` borra el archivo (`rm -f test.db`) y lo recrea (`db:push`),
   el nuevo archivo tiene un inodo diferente. El file descriptor del
   server sigue apuntando al inodo viejo (borrado) → cualquier write
   posterior produce `SQLITE_READONLY`.

2. **Supervivencia entre suites**: Los tests corren secuencialmente
   (`workers: 1`). No hay necesidad de resetear la DB entre suites
   porque cada test crea datos únicos (emails con `Date.now()`).

### 3. `fuser -k` en vez de `lsof` + `kill`

**Decisión**: El script usa `fuser -k ${PORT}/tcp` (con `PORT` default 3001)
con 3 reintentos y verificación con `ss`, en vez de `kill $(lsof -t -i:3001)`.

**Por qué**: `lsof -t` lista los PIDs escuchando en el puerto, pero
no siempre encuentra procesos zombie o procesos que tienen conexiones
establecidas sin estar escuchando. `fuser -k` es más agresivo: mata
cualquier proceso que tenga el puerto abierto (listen o established).
Los 3 reintentos cubren el caso de procesos que tardan en liberar el
socket. La verificación con `ss -tlnp` confirma que el puerto quedó
realmente libre antes de seguir.

**Bug que motivó esto**: Un `next-server` fantasma (PID 29172) de una
ejecución anterior sobrevivió al `kill` del script. El nuevo server
arrancó en el puerto siguiente (fallback de Next.js), pero los tests y
curl seguían pegando al puerto del server viejo (con `prod.db`).
Resultado: tests fallaban porque el test user no existe en `prod.db`.

### 4. Signup fixture maneja el 2-step flow del cliente

**Decisión**: El fixture de signup espera `input#code` (paso "verify"
del cliente) y luego navega a `/dashboard` directo, en vez de esperar
un redirect.

**Por qué**: En dev sin `RESEND_API_KEY`, el API de signup crea la
cuenta **inmediatamente** y setea el cookie de sesión en la response
HTTP. Pero el cliente React **siempre** transiciona al paso "verify"
(muestra el campo para el código de 6 dígitos). El navegador YA tiene
el cookie (vino en el `Set-Cookie` de la response), así que navegar
a `/dashboard` funciona — el middleware ve el cookie y deja pasar.

### 5. Selector de alertas excluye el route announcer de Next.js

**Decisión**: `[role="alert"]:not([id="__next-route-announcer__"])`
en vez de simplemente `[role="alert"]`.

**Por qué**: Next.js inyecta un `<div role="alert" aria-live="assertive"
id="__next-route-announcer__">` en cada página para anunciar cambios
de ruta a lectores de pantalla. Playwright en strict mode falla si un
selector matchea más de un elemento. Excluir el announcer por ID es
la forma más precisa.

### 6. Test de formulario vacío usa espacios

**Decisión**: `page.fill("input#username", " ")` en vez de dejar el
campo vacío para el test 1.5.

**Por qué**: Los inputs tienen `required` (HTML5 validation). Playwright
respeta la validación nativa del navegador: si un campo `required` está
vacío y se hace submit, el browser muestra un tooltip y **bloquea** el
evento `submit`. El form nunca llega al servidor. Rellenar con espacio
(`" "`) pasa la validación HTML5 (no está vacío) pero es falsy para el
server (`!username` → true), así que el server devuelve 400 y podemos
testear el flujo de error.

---

## Problemas conocidos

### SQLITE_READONLY con `@prisma/adapter-libsql`

**Síntoma**: Después de varias requests, el servidor devuelve 500 con
`SQLITE_READONLY: attempt to write a readonly database`.

**Causa**: El adapter libSQL (`@prisma/adapter-libsql` v7.8.0) pierde
capacidad de escritura sobre SQLite local después de cierto tiempo o número
de conexiones. No ocurre con `tsx` (script standalone), solo con el
dev server de Next.js (múltiples workers/requests).

**Workaround actual**: El script `run-e2e.sh` recrea la DB desde cero en
cada ejecución y los tests nunca borran el archivo durante la ejecución,
lo que evita tanto el problema del adapter como el del file descriptor
stale.

**Fix definitivo**: Evaluar cambiar `@prisma/adapter-libsql` por el driver
nativo de Prisma para SQLite. El proyecto usa SQLite local (`file:./data/prod.db`),
no Turso, así que libSQL no es necesario. Esto eliminaría el bug de raíz.

### `.env.local` pisa `DATABASE_URL`

El dev server carga `.env.local` que apunta a `prod.db`. Si no se pasa
`DATABASE_URL=file:./data/test.db` como env var al iniciar `pnpm dev`,
el server usa la DB de producción. El script `run-e2e.sh` exporta la
variable correcta antes de arrancar.

### Server fantasma en el puerto e2e

Si un `pnpm dev` anterior no se mató correctamente, Next.js arranca en
el puerto siguiente (fallback) y los tests pegan al puerto del server
viejo (con `prod.db`). El script `run-e2e.sh` ahora usa `fuser -k` +
verificación con `ss` para garantizar que el puerto e2e (3001 por
default) esté libre antes de arrancar.

---

## Troubleshooting — flaky en test 1.2

| | |
|---|---|
| **Síntoma** | `toBeVisible()` del alert falla intermitente (`element(s) not found`). Pasa al correrlo solo o en headed |
| **Causa** | Race de hidratación: el `fill` del email cae antes de que React hidrate el input controlado → lo resetea a `""` → `required` bloquea el submit → no hay fetch ni alert. Screenshot: email vacío, password con valor, bubble nativo "Fill out this field" |
| **Afecta** | Todos los tests que llenan el form de auth tras `goto`: 1.2, 1.4, y los helpers `signup()`/`login()` |
| **Repro** | No determinista — `pnpm exec playwright test auth.spec.ts -g "1.2"` repetido en headless. Con un `waitForTimeout(1500)` entre fills se ve la race |
| **Fix** | **Implementado** — stack de 2 capas: `waitHydrated()` (`waitForLoadState("networkidle")` tras `goto` — seguro en login/signup, sin polling) + `fillSettled()` (retry `fill` + `toHaveValue`, con pre-check de `inputValue()` para evitar un `fill` redundante). Usados en `signup()`, `login()`, y los tests 1.2/1.4 |
| **Estado** | Resuelto 2026-08-05 (verificado con 3 corridas consecutivas de la suite completa, 11/11 verdes) |

```ts
async function waitHydrated(page: Page) {
  await page.waitForLoadState("networkidle");
}
async function fillSettled(page: Page, selector: string, value: string) {
  await expect(async () => {
    if ((await page.locator(selector).inputValue()) !== value) {
      await page.fill(selector, value);
    }
    await expect(page.locator(selector)).toHaveValue(value);
  }).toPass({ timeout: 10_000 });
}
```

> Nota: se descartó un `ensureFilled()` extra (re-verificar justo antes del
> submit) — era redundante. Con `waitHydrated` la hidratación ya terminó
> antes de llenar, así que no hay ventana de race que cubrir.

> Alternativa descartada: flag `data-hydrated` en producto — la race no
> afecta a usuarios reales (no tipean en la ventana de <1s de hidratación).

---

## Simplificación futura

Si los e2e resultan lentos, se pueden simplificar:

1. **Modo API-only**: La mayoría de los tests de auth pueden testearse
   vía `page.request.post()` sin navegar a páginas. Ej: login directo al
   API, verificar cookie y status code. Esto evita renderizado y es
   mucho más rápido.

2. **Reducir specs**: El health check y session gating se pueden mergear
   en un solo test de humo.

3. **Mock del servidor**: En vez de levantar Next.js completo, se puede
   usar `page.route()` para interceptar fetch y simular respuestas del API.
   Esto elimina la necesidad de DB de test y acelera dramáticamente.

4. **DB en memoria**: Si se migra de SQLite a `:memory:` para tests, no
   hay que crear/borrar archivos. Requiere cambiar el adapter.

5. **Paralelizar specs**: Si se resuelve el SQLITE_READONLY, se puede
   usar `workers > 1` y correr specs en paralelo (cada uno con su propia DB).

---

## Changelog interno

| Fecha | Cambio |
|-------|--------|
| 2026-08-01 | Setup inicial: Playwright 1.62.1, playwright.config.ts, fixtures, iCal test files |
| 2026-08-01 | Fix de locales: en/es default en, 208 unit tests verdes |
| 2026-08-01 | `scripts/run-e2e.sh` — script autónomo de ejecución |
| 2026-08-01 | `e2e/auth.spec.ts` — 8 tests de auth flow (5 pass, 3 fallaban) |
| 2026-08-01 | `e2e/fixtures/property.ts` — API helpers para specs futuros |
| 2026-08-01 | Fix: `[role="alert"]` excluye `__next-route-announcer__` (strict mode violation) |
| 2026-08-01 | Fix: sacado `resetTestDb()` de `beforeAll` → evitaba SQLITE_READONLY por file descriptor stale |
| 2026-08-01 | Fix: test 1.5 rellena con espacios → bypass HTML5 `required` validation |
| 2026-08-01 | Fix: `run-e2e.sh` usa `fuser -k` + verificación `ss` → elimina server fantasma en 3000 |
| 2026-08-01 | `docs/E2E-TESTING.md` — documentación completa con sección de decisiones de diseño |
| 2026-08-03 | Diagnóstico del flaky en test 1.2: race de hidratación de React con controlled inputs. Fix planificado (`fillSettled`), pendiente |
| 2026-08-05 | `e2e/global-setup.ts` + `playwright.config.ts` con 2 proyectos (`auth` / `authenticated`) — login único con `storageState`, elimina el 429 del rate limit |
| 2026-08-05 | `e2e/calendar.spec.ts` — 2 tests (reserva manual 2.1 + claim iCal 2.2). `e2e/dashboard-onboarding.spec.ts` — 2 tests (sample escape 3.1 + flujo completo 3.2) |
| 2026-08-05 | `data-testid` en popovers/wizard + `data-*` semánticos en calendar grid (`data-date`, `data-uid`, `data-reservation-id`) — ver [Convención de selectores](#convención-de-selectores-data-testid-vs-data-) |
| 2026-08-05 | `auth.spec.ts`: eliminado test 1.5 (redundante) y el POST del health check — baja el uso del bucket de rate limit de 6+ a 4 |
| 2026-08-05 | Fix flakiness: helper `fillSettled()` implementado y usado en `signup()`/`login()`/tests 1.2/1.4 (race de hidratación); `waitForLoadState("networkidle")` en calendar specs; health check espera `domcontentloaded` |
| 2026-08-05 | Fix definitivo de la race de hidratación: `fillSettled()` solo no bastaba (la hidratación resetea el input tras verificar y antes del click). Agregado `waitHydrated()` (`networkidle` tras `goto`) en `signup()`/`login()`/tests 1.2/1.4 |
| 2026-08-05 | Simplificación: eliminado `ensureFilled()` (redundante con `waitHydrated` + `fillSettled`). `fillSettled` incorpora pre-check de `inputValue()` para evitar `fill` redundante. Verificado con 3 corridas consecutivas 11/11 verdes |
| 2026-08-15 | `admin-gate.spec.ts` extendido (E1: G1 seed guard CLI + G3 suspend self/other) + `superadmin-gates.spec.ts` (E2: G4 cron-url + G5 schedule) con sesiones superadmin minteadas (`fixtures/superadmin.ts`, jose + JWT_SECRET fijo) — 23/23 verdes |
| 2026-08-15 | `reports.spec.ts` (E3: presets 6M/12M → rangeLabel + CSV correlacionado con retry de download) + `navbar.spec.ts` (E4: dropdown "Todas as propriedades" contextual, A1-A3). Helper `fixtures/locale.ts` (`usePtLocale` pinnea `rt-locale=pt`; e2e default resuelve EN por Accept-Language) — suite 27/27 verdes |
| 2026-08-15 | Hardening: `global-setup.ts` adopta `waitHydrated`+`fillSettled` (era el único login crudo susceptible a la hydration race); `calendar.spec.ts` 2.1 envuelve la verificación API en `expect(...).toPass()` contra el `ECONNRESET` transitorio del dev server bajo carga |
| 2026-08-17 | `run-e2e.sh` soporta `--update-snapshots` (passthrough de Playwright) → el baseline visual se regenera con `./scripts/run-e2e.sh visual.spec.ts --update-snapshots` desde main limpio, sin flujo manual de 2 terminales. `calendar-link-save.spec.ts` (B7, 2 tests: preset Vrbo + draft custom) — suite 43/43 verdes |
