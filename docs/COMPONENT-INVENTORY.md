# Inventario de componentes — propical

> Inventario de patrones de UI de la app y su extracción a la capa de
> componentes (capa 3 del sistema de tokens — ver [TOKENS.md](TOKENS.md)).
> Generado por análisis de `src/`; complementa las reglas de decisión de abajo.

## Componentes extraídos

### Átomos (`src/components/ui/atoms/`)

- **`Eyebrow`** — 4 sub-flavors (`section`/`field`/`tag`/`semibold`); unifica
  los ~50+ labels `uppercase tracking-*` inline en ~25 archivos.
- **`PlatformDot`** — envuelve el patrón inline
  `style={{backgroundColor: resolvePlatformMeta(x).color}}` sobre span
  redondeado (~16 instancias en 8 archivos).
- **`Chip`** — cva con `variant` (pill/tag), `tone`
  (neutral/faint/action/success/error/warning/info/brand), `size` (sm/md/lg) y
  prop `leading`. Unifica los ~28+ pills inline. Tones vía tokens `--tone-*`.

### Moléculas (`src/components/ui/molecules/`)

- **`PageHeader`** — `title`/`subtitle`/`actions`/`level` (h1|h2)/`align`
  (start|center) + overrides `titleClassName`/`subtitleClassName` (twMerge).
  Unifica el patrón `h2 text-2xl font-bold` + subtítulo (~24 páginas admin,
  settings-panel, tasks-panel, profile-panel, property-cleaning-view).

### Tokens de messenger

`--messenger-whatsapp` (#25d366) / `--messenger-telegram` (#229ed9) en
`globals.css` (capa 1 + `@theme inline` → `bg-messenger-whatsapp/15` etc.).
Reemplazan las instancias hardcodeadas en reservation-view y guest-cards.
No hay `messenger-meta.ts`: no hay consumidor JS del color (solo clases) —
los tokens CSS son la consolidación.

### Infraestructura de tests de componentes

`@testing-library/react` + `jsdom` + `jest-dom` (devDeps); `vitest.config.ts`
con `setupFiles: ["./src/test/setup.ts"]` (cleanup automático de RTL, ya que
vitest corre sin `globals: true`). Los tests de componentes optan por jsdom
con `// @vitest-environment jsdom` en el docblock — el entorno `node` de los
tests de lógica no se toca. Nota: `scroll-area` (base-ui) requiere mock de
`ResizeObserver` y `Element.prototype.getAnimations` en jsdom.

---

## Regla de decisión (extraer si cumple ≥ 2)

1. **Frecuencia**: aparece en 3+ archivos distintos.
2. **Semántica de marca**: representa un concepto (status, plataforma, eyebrow, acción).
3. **Peso compositivo**: combina ≥ 4 propiedades (tamaño + font + tracking + color + padding + radius).
4. **Encapsulamiento**: lleva estados / a11y (hover, focus-ring, disabled, aria).
5. **Acoplamiento de cambio**: lo que va a cambiar junto (color, tipografía) → extraer concentra el diff.

---

## Inventario medido

| Patrón | Instancias | Archivos | Decisión |
|---|---|---|---|
| **Eyebrow** inline (uppercase + tracking) | ~50+ | ~25 | 🆕 `Eyebrow` ✅ |
| **Dot de plataforma** (`style={{backgroundColor: resolvePlatformMeta(x).color}}` sobre span redondeado) | ~16 | 8 | 🆕 `PlatformDot` ✅ |
| Colores de plataforma hardcodeados (`#003580` Booking) | ~8 | 4 (`calendar-grid`, `calendar-legend`, `calendar-sync`, `tasks-panel`) | → `platform-meta` ✅ |
| **Chip / pill** (platform, status, tone) | ~28+ | 5 | 🆕 `Chip` ✅ |
| **PageHeader** (título + subtítulo + acción) | ~24 | 24 | 🆕 `PageHeader` ✅ |
| Botones ad-hoc (saltan `<Button>` base-ui) | ~30 | — | Alinear — pendiente |
| Inputs ad-hoc (saltan `<Input>`) | ~10 | — | Alinear — pendiente |
| Colores de messenger (`#25D366` WhatsApp / `#229ED9` Telegram) | ~6 | 2 (`reservation-view`, `guest-cards`) | tokens `--messenger-*` ✅ |
| Slots legacy (`text-muted-foreground`, `text-primary/60`, `bg-background`) | ~50+ | — | aliasados a semánticos (funcionales); normalizar = follow-up opcional |

---

## Sub-flavors de Eyebrow encontrados

Los patrones reales (classes exactas hoy en `src`):

| Sub-flavor | Classes | Usado en |
|---|---|---|
| section | `text-sm font-medium uppercase tracking-wide text-text-faint` | property-cleaning-view, global-cleaning-view, reports-panel, date-actions-popover, tasks-panel (th), cleaners-panel, property-switcher, message-templates-panel, property-managers-panel |
| field | `text-sm font-medium uppercase tracking-wider text-text-faint` | reports-panel, feedback-button, settings-panel (th), sync-settings, dashboard-onboarding, cleaning-schedule (th) |
| tag (sin weight) | `text-sm uppercase tracking-wider text-text-faint` | reports-panel (thead), cleaning-schedule (thead), property-managers-panel, guest-form-filler, guest-form-page |
| semibold | `text-sm font-semibold uppercase tracking-wider text-text-faint` | property-calendar (weekday header) |

**Normalizaciones** menores aplicadas durante la extracción (fuera del baseline visual):

- `admin-panel.tsx`: `text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground` → piso 0.85rem (`text-sm`) + `text-text-faint`.
- `guest-cards.tsx`: `text-sm font-semibold uppercase tracking-widest text-primary/60` → `text-text-faint`.
- `reservation-view.tsx`: `text-sm font-medium uppercase tracking-wide text-muted-foreground` → `text-text-faint`.
- `guest-form-page.tsx` preview: `text-[#a0a0a8]` → **one-off justificado** (mock "GitHub dark" intencional).

---

## One-offs justificados (se documentan, NO se tocan)

- `guest-form-page.tsx` (líneas ~497-602): preview que emula el tema dark de GitHub (`#161b22`, `#e8e8ec`, `#a0a0a8`, `#ff385c`) — mock deliberado, no es tema de la app.
- **Vrbo `#2c5da9`** en `calendar-grid.tsx`: el calendario usa `#2c5da9`, `platform-meta.ts` define `#245ABC`. **Inconsistencia conocida**: resolver en una decisión dedicada (recomendación: alinear `platform-meta` a `#2C5DA9`, el color de marca real de Vrbo, y convertir el calendario).
- ~~Colores de messenger~~: tokenizados (`--messenger-whatsapp` / `--messenger-telegram`).

---

## Estructura de componentes (capa 3)

```
src/components/ui/            primitivos shadcn base-nova (7: button, input, badge, card, table, scroll-area, separator)
src/components/ui/atoms/      semánticos de marca: Eyebrow, PlatformDot, Chip
src/components/ui/molecules/  compositivos: PageHeader
src/lib/platform-meta.ts      colores de plataforma = datos, fuente única
```

## Dependencias

- `cva` + `class-variance-authority` (ya en deps).
- `cn` (`@/lib/utils`).
- `resolvePlatformMeta` (`@/lib/platform-meta`).
