# Tokens — propical

> Documentación del mapeo primitivo ↔ semántico ↔ slot del sistema de tokens,
> con valores de [ux/index.html](ux/index.html) (brand book v1.1).
>
> Fuente de verdad operativa: `src/app/globals.css`. Este doc registra el mapeo y
> los pares de contraste; el enforcement en CI vive en `src/lib/tokens.test.ts`.

---

## 1 · Arquitectura (3 capas)

```
Capa 1 · Primitivos (pt-BR, brand)   areia · noite · ambar · mel · resina · coral · mata · mar · line
                                      (.dark re-pinta SOLO esta capa)
Capa 2 · Semánticos (EN, por rol)     surface · text-* · action-* · border · link · success ·
                                      status-* · chart-*
Capa 3 · Componentes + @theme inline  <Button variant> · bg-surface · text-text-muted · @utility
```

Reglas inmutables:

- **Cero valores directos en la capa semántica** — todo referencia `var(--primitivo)`.
- **`.dark` re-pinta solo primitivos** — los semánticos y slots se resuelven contra
  ellos automáticamente (`var()` se resuelve en el contexto del elemento).
- **Máx. 2 capas de variables + 1 capa de clases**. Prohibido un tercer nivel
  de vars por componente → lo resuelve `cva` en `ui/*`.

---

## 2 · Mapeo legacy → semántico → primitivo

| Nombre legacy (`.editorial`) | Semántico | Primitivo brand | Rol |
|---|---|---|---|
| `--bg` | `--surface` | `--areia` | fondo base |
| `--bg-2` | `--surface-raised` | `--areia-2` | cards, popover, paneles |
| `--bg-3` | `--surface-hover` | `--areia-3` | hover fills, muted/accent bg |
| `--ink` | `--text-primary` | `--noite` | texto principal |
| `--ink-2` | `--text-secondary` | `--noite-2` | texto secundario |
| `--ink-3` | `--text-muted` | `--noite-3` | texto informativo (mínimo para contenido) |
| `--ink-4` | `--text-faint` | `--noite-4` | **solo texto grande** (regla AA) |
| `--line` / `--line-2` | `--border` / `--border-strong` | `--line` / `--line-2` | bordes |
| `--m-accent` | `--action-primary-bg` | `--acai` | CTA primario (bg) |
| `--m-accent-2` | `--action-primary-hover` | `--acai-2` | CTA hover |
| `--m-accent-soft` | `--action-primary-soft` | `--acai-soft` | pill/soft de acción |
| — | `--action-primary-fg` | `--acai-fg` | tinta del CTA sobre açaí |
| — | `--link` | `--coral-deep` | enlaces |
| — | `--success` / `--info` | `--mata` / `--mar` | estados |
| `--cleaning-*` | `--status-buffer-*` | pills ámbar | chip de buffer/limpieza |
| — | `--status-booked` / `--status-free` | `--coral-deep` / `--mata` | status del calendario |
| — | `--chart-1…5` | `--acai` / `--mata` / `--mar` / `--coral` / `--resina` | roles de datos |

---

## 3 · Slots shadcn → semánticos

Los slots de shadcn que **nombran un rol** se declaran como alias a los
semánticos. Los que tienen identidad propia de componente se listan en §4.

| Slot shadcn | = | Semántico |
|---|---|---|
| `--background` | → | `--surface` |
| `--foreground` | → | `--text-primary` |
| `--card` / `--popover` | → | `--surface-raised` |
| `--card-foreground` / `--popover-foreground` | → | `--text-primary` |
| `--primary` | → | `--noite` |
| `--primary-foreground` | → | `--areia` |
| `--secondary` / `--muted` / `--accent` | → | `--surface-hover` |
| `--secondary-foreground` / `--muted-foreground` / `--accent-foreground` | → | `--text-primary` / `--text-muted` |
| `--border` | → | `--line` |
| `--radius` | — | `0.625rem` |

---

## 4 · Excepciones con identidad propia de componente

Estos slots no aliasan a un semántico genérico: se derivan directo contra los
primitivos del brand book — **cero valores directos**:

| Slot | = | Primitivo | Nota |
|---|---|---|---|
| `--input` | → | `--line-2` | borde de inputs |
| `--ring` | → | `--acai` | focus ring |
| `--destructive` | → | `--coral-deep` | acciones destructivas |
| `--chart-1…5` | → | `--acai` / `--mata` / `--mar` / `--coral` / `--resina` | roles de datos |
| `--sidebar-*` | → | `--surface` / `--noite` / `--areia` / `--surface-hover` / `--line` | navegación |

No se declaran en el bloque `.dark` — resuelven vía `var()` contra los
primitivos que `.dark` re-pinta.

---

## 5 · Tipografía (`@utility` — capa 3)

Los roles se emiten solo cuando una página los usa.

| Rol | Familia · tamaño · peso · tracking | Color |
|---|---|---|
| `.text-display` | DM Mono 500 · clamp(2.2rem, 7vw, 3.6rem) · ls −0.02em | `--noite` |
| `.text-title` | DM Mono 500 · clamp(1.4rem, 4vw, 2rem) · ls −0.01em | `--noite` |
| `.text-eyebrow` | DM Mono 400 · 0.85rem · uppercase · ls 0.18em | `--resina` |
| `.text-body` | DM Sans 400 · 1.0625rem · lh 1.65 | `--noite-2` |
| `.text-caption` | DM Sans 400 · 0.875rem | `--noite-3` |
| `.text-data` | DM Mono 400 · 0.85rem | `--noite` |

Piso tipográfico: ningún texto < `0.85rem` (≈14px). `text-[10px]/[11px]/[12px]/[13px]`
→ `Eyebrow` o `text-sm`.

### 5.1 · Mapeo componente → rol (sistema de roles)

Regla de oro: **un componente tiene UN solo rol** — así se elimina la
inconsistencia (p. ej. "Próximas reservas" 12px vs "Hospedados agora" 14px
uppercase pegados). El color lo define el rol; el contexto solo agrega
variantes de color semántico (estados, plataformas).

| Componente / patrón | Rol | Notas |
|---|---|---|
| Hero / tagline marketing | `text-display` | solo marketing |
| Título de sección grande (h1/h2) | `text-title` | páginas, secciones grandes |
| **Título de card** (panel) | `text-sm font-medium` + `--ink` | mini-título pragmático (0.875rem) |
| **Header de sección dentro de card** ("Hospedados agora") | `text-eyebrow` | `--resina`, uppercase |
| **Table thead** | `text-eyebrow` | `--resina`, uppercase |
| Label de campo / form | `text-eyebrow` (variante field) o `text-sm` | si es uppercase → eyebrow |
| Texto de lectura / párrafos | `text-body` | 1.0625rem |
| Metadatos, descripciones, subtítulos | `text-caption` | `--noite-3` |
| Valores numéricos, fechas, códigos, mono | `text-data` | `--noite`, mono |
| Badge de plataforma (Airbnb/Booking) | `text-data` (chico) + color plataforma | `platform-meta` es dato, no token |
| Badge de estado (status pill) | `text-eyebrow` + color semántico | `--status-*` |
| Tooltip / hint | `text-caption` | `--noite-3` |
| Footer / legal | `text-caption` | `--noite-3` |

> **Regla de color**: texto informativo NUNCA usa `--noite-4`
> (`--text-faint`) — mínimo `--noite-3`. Solo UI decorativa o texto grande
> puede usar `--noite-4`. Los section headers y footers usan `--noite-3`
> o roles tipográficos.

---

## 6 · Pares de contraste AA (enforced en `src/lib/tokens.test.ts`)

> Regla: texto ≥ 4.5:1, UI/no-texto ≥ 3:1. Verificado programáticamente por
> `src/lib/tokens.test.ts` (parsea `globals.css`, no valores hardcodeados).
> Cualquier cambio de token que rompa un par estricto → CI rojo.

### 6.1 · Pares AA estrictos (light y dark)

| Fondo | `--text-primary` | `--text-secondary` | `--text-muted` | otro |
|---|---|---|---|---|
| `--surface` | 18.46 / 17.00 | 10.82 / 11.04 | 5.06 / 5.82 | `--link` 5.26 / 8.18 · `--resina` 6.37 / 7.89 · `--success` 7.28 / 5.16 · `--info` 9.18 / 5.37 · `--status-buffer-fg` 6.79 / 13.12 |
| `--surface-raised` | 17.51 / 15.85 | — | 4.80 / 5.42 | — |
| `--surface-hover` | 16.13 / 14.53 | 9.45 / 9.43 | — | — |

UI/no-texto ≥ 3:1: `--ambar` sobre `--surface` 3.37 / 6.14 · `--status-free` 7.28 / 5.16 ·
`--status-booked` sobre `--surface` 3.00 / 3.00 (coral-deep) ·
`--text-faint` sobre `--surface` 3.00 / 3.00.

CTA: `--action-primary-fg` sobre `--action-primary-bg` ≥ 4.5:1 en
light y dark (tinta `--ambar-fg` = `--noite` light / `--areia` dark, nunca blanco).

### 6.2 · Deuda de contraste

No queda deuda pendiente: los pares que alguna vez estuvieron por debajo del
mínimo (`--text-faint`, `--status-booked` y el CTA dark) fueron corregidos y
hoy se enforcean estrictos en §6.1.

---

## 7 · Cómo verificar / regenerar

```bash
# Unit test de contraste (parsea globals.css) — commiteado, corre en CI
pnpm test src/lib/tokens.test.ts

# Baseline visual — EFÍMERO (los PNGs no se commitean, ver .gitignore)
# 1. Desde main sin cambios, generar el baseline (estado conocido-bueno):
DATABASE_URL=file:./data/test.db pnpm dev -- -p 3001   # terminal 1 (e2e corre en :3001, el dev server del usuario queda en :3000)
npx playwright test e2e/visual.spec.ts --update-snapshots  # terminal 2
# 2. Aplicar los cambios → correr el spec de nuevo:
npx playwright test e2e/visual.spec.ts
#    Sin cambio visual esperado: PASS. Con cambio intencional: revisar los -diff.png.
# 3. Antes de mergear, borrar los PNGs generados.
#    El baseline del próximo ciclo de trabajo se regenera desde el nuevo main.

# Suite completa
./scripts/run-e2e.sh
```

Los PNGs viven en `e2e/visual.spec.ts-snapshots/` solo durante el ciclo de
trabajo local. El enforcement de contraste AA en CI lo da
`src/lib/tokens.test.ts` (commiteado).
