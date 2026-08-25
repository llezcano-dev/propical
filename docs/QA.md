# QA — Herramientas de calidad de código

> Guía de uso e interpretación de las 4 herramientas de calidad configuradas en
> este repo: **knip** (código/deps sin uso), **jscpd** (copy-paste), **fallow**
> (dead code + estructura) y **sonarjs** (code smells vía ESLint). Configs en la
> raíz: `knip.json`, `.jscpd.json`, `.fallowrc.json` y el bloque `sonarjs` de
> `eslint.config.mjs`.

---

## Resumen

| Herramienta | Detecta | Config | Comando |
|---|---|---|---|
| **knip** | Archivos, exports, tipos y dependencias sin uso | `knip.json` | `pnpm quality:knip` |
| **jscpd** | Código duplicado (copy-paste) | `.jscpd.json` | `pnpm quality:jscpd` |
| **fallow** | Dead code, deps mal ubicadas, exports duplicados, ciclos | `.fallowrc.json` | `pnpm quality:fallow` |
| **sonarjs** | Code smells (complejidad, duplicación, bugs, seguridad, higiene) | `eslint.config.mjs` (bloque `sonarjs`) | `pnpm lint` |

Las 3 del umbrella corren juntas con:

```bash
pnpm quality
```

> El umbrella usa `;` (no `&&`): las 3 corren siempre, aunque alguna salga con
> exit ≠ 0. El exit code es informativo — ninguna de las 3 es gate de CI.
> **sonarjs no está en el umbrella**: corre como parte de `pnpm lint` (que sí es
> gate de CI — 0 errores).

---

## Cómo interpretar los outputs

### knip (`pnpm quality:knip`)

Reporta por categoría:

- **Unused files** — archivos que ningún entry point alcanza. Si es un
  componente/helper real sin uso → borrarlo o documentarlo (ver Deuda).
- **Unused exports / types** — símbolos exportados que nadie importa. Candidatos
  a borrar, o a `ignoreExportsUsedInFile` si se usan solo dentro del mismo archivo.
- **Unused dependencies / devDependencies** — deps declaradas sin imports.
  Antes de borrar, verificar falsos positivos (ver Quirks).
- **Configuration hints** — patrones de entry redundantes o faltantes. Ideal: 0.

Exit code: `0` si no hay issues, `1` si hay. `--no-exit-code` fuerza 0.

### jscpd (`pnpm quality:jscpd`)

- Tabla por formato: `Clones found`, `Duplicated lines %`, `Duplicated tokens %`.
- **Threshold**: si el % total de líneas duplicadas supera `threshold` (5),
  sale con exit 1. Hoy el repo está en **5.1%** → falla a propósito como señal
  de deuda (ver Deuda).
- Cada clone lista los 2 bloques: `archivo [inicio:fin]` + el par. Mismo archivo
  = copy-paste interno; archivos distintos = lógica duplicada a extraer.

### fallow (`pnpm quality:fallow`)

Resumen final: `✗ N files · N exports · N types · N deps · N duplicate pairs`.

- **Unused files/exports/types** — igual que knip (con su propio grafo).
- **Unused devDependencies** — deps sin imports (ojo: con `e2e/**` ignorado,
  fallow no ve usos dentro de e2e → ver Quirks).
- **Test-only production dependencies** / **Dev dependencies used in production**
  — sugerencias de mover deps entre `dependencies` y `devDependencies`.
- **Duplicate exports** — mismo nombre exportado en 2 archivos (barrels
  ambiguos). Fix: unificar en un solo módulo.

Severidades por regla en `.fallowrc.json`: `unused-files` y
`unused-dependencies` son `error` (fallan el run); el resto `warn` (reportan sin
fallar). Fix automático: `fallow fix --dry-run` (preview) / `fallow fix`.

### sonarjs (`pnpm lint`)

Code smells de SonarSource vía ESLint. **No se usa el `recommended` completo**
(279 reglas → ~2900 warnings de ruido estilístico: `arrow-function-convention`,
`file-header`, `no-implicit-dependencies`…). En `eslint.config.mjs` hay un
**subset curado de ~35 reglas de alto valor**, todas como `warn` para que CI siga
verde y los smells queden visibles en el editor. Agrupadas por categoría:

- **Complejidad**: `cognitive-complexity`, `cyclomatic-complexity`,
  `expression-complexity`, `nested-control-flow`
- **Duplicación / lógica repetida**: `no-duplicate-string`,
  `no-identical-functions`, `no-identical-conditions`, `no-identical-expressions`,
  `no-duplicated-branches`, `no-all-duplicated-branches`
- **Bugs / dead code**: `no-dead-store`, `no-inconsistent-returns`,
  `no-reference-error`, `no-useless-catch`, `no-ignored-return`,
  `no-extra-arguments`, `no-redundant-boolean`, `no-redundant-jump`,
  `no-inverted-boolean-check`, `no-misleading-array-reverse`,
  `no-element-overwrite`, `no-unused-collection`, `no-empty-collection`,
  `no-collection-size-mischeck`, `no-array-delete`, `no-small-switch`,
  `prefer-immediate-return`, `no-unenclosed-multiline-block`
- **Seguridad**: `no-hardcoded-ip`, `no-hardcoded-passwords`, `super-linear-regex`
- **Higiene**: `no-commented-code`, `todo-tag`

Exit code: `0` si no hay errores (los warnings no fallan). `pnpm lint` es gate de
CI — **0 errores obligatorio**, warnings informativos.

---

## Baseline actual (deuda conocida)

> Estado tras la limpieza de dead code: knip y fallow en verde.
> Lo que queda es deuda real documentada en [TODO.md](TODO.md) (DT8).

| Herramienta | Hallazgo | Archivos |
|---|---|---|
| jscpd | 244 clones (5.1% > threshold 5) — falla a propósito | `reports-panel.tsx` (530-547↔722-736), `reservation-view.tsx` (971-981↔993-1001), `sync-settings.tsx` (3 pares), `property-managers-panel.tsx`, `calendar-data-core.ts`, `feed-url-guard.test.ts`, `global-cleaning-view.tsx`↔`property-cleaning-view.tsx`, etc. |
| knip + fallow | `lucide-react` sin imports | declarada como icon library en `components.json`, ningún componente la importa (decisión abierta) |
| sonarjs | **431 warnings, 0 errores** (subset curado, 2026-08-20) | 143 archivos. Top: `no-duplicate-string` (106), `cyclomatic-complexity` (93), `nested-control-flow` (49), `cognitive-complexity` (42), `expression-complexity` (33), `no-hardcoded-ip` (31), `no-reference-error` (28), `no-inconsistent-returns` (15), `no-hardcoded-passwords` (11), `super-linear-regex` (10), `no-dead-store` (9) |

> Los 431 warnings son **solo de sonarjs**. `pnpm lint` total = 499 warnings
> (431 sonarjs + 30 `react-hooks/set-state-in-effect` + 8 `react-hooks/exhaustive-deps`
> + 30 `typescript-eslint/no-unused-vars` — estos últimos ya existían antes del
> audit sonarjs). Atacar los smells como trabajo separado (ver DT8 en [TODO.md](TODO.md)).

**Ya resuelto (limpieza de dead code):**

- 7 componentes sin uso borrados (`sidebar.tsx`, `sidebar-section.tsx`, `calendar-sync.tsx`,
  `calendar/calendar-legend.tsx`, `calendar/calendar-navigation.tsx`, `calendar/calendar-toolbar.tsx`,
  `date-slider.tsx`).
- 21 exports + 11 tipos sin uso eliminados o degradados a internos.
- `@types/bcryptjs` removido; `prisma` movida a devDependencies.
- 2 exports duplicados unificados (`CalendarEvent` → `calendar/types.ts`, `stripDiacritics` → `sanitize.ts`).
- Configs corregidos: `.jscpd.json` globs reales, `.fallowrc.json` + `tailwindcss`, `.gitignore` + `report/`.

**Falsos positivos silenciados en config** (no son deuda):

- `@prisma/client` — usado por el client generado en `src/generated/`
  (gitignored, knip no lo ve). Ignorado en `knip.json`.
- `lucide-react` — declarada como `iconLibrary` en `components.json` pero sin
  imports en `src/` (ver Quirks). Ignorada en `knip.json` + `.fallowrc.json`.
- `@axe-core/playwright` — usada en `e2e/a11y.spec.ts`; fallow no la ve porque
  `e2e/**` está ignorado. Ignorada en `.fallowrc.json`.
- `sharp`, `fallow`, `jscpd` — usadas vía scripts/CLI (resueltas por los entry
  points de `scripts/*` y los scripts `quality:*`).

---

## Quirks conocidos

1. **Plugin playwright de knip no resuelve los specs** — el plugin hace
   `join(configDir, testDir)` con `path.posix.join`, que **concatena** rutas
   absolutas en vez de resolverlas. Como `playwright.config.ts` usa
   `testDir: path.join(ROOT, "e2e")` (absoluto), el join produce una ruta
   duplicada que no matchea nada. `globalSetup` sí se resuelve (va por `toEntry`
   directo). **Fix aplicado**: entry points explícitos en `knip.json`
   (`e2e/**/*.spec.ts`, `e2e/fixtures/*.ts`). Si algún día `testDir` pasa a ser
   relativo, se pueden quitar esos entries.
2. **`lucide-react` sin imports** — está declarada como icon library de shadcn
   (`components.json`) pero ningún componente la importa. Decisión pendiente:
   usarla al agregar iconos nuevos, o removerla.
3. **jscpd threshold 5 falla hoy** — el total está en 5.14%. Es intencional:
   `quality:jscpd` sale con exit 1 hasta que se deduplique (DT8). Subir a 6 en
   `.jscpd.json` si se quiere verde mientras tanto.
4. **fallow ignora `e2e/**`** — cualquier dep usada solo en e2e aparecerá como
   unused devDep. Agregarla a `ignoreDependencies` de `.fallowrc.json` (como
   `@axe-core/playwright`).
5. **`sonarjs/cyclomatic-complexity` imprime un JSON en el mensaje** — cuando la
   regla reporta con `secondaryLocations`, el mensaje es un blob JSON
   (`{"message":"Function has a complexity of 22...","cost":12,...}`). Ruido
   cosmético de la regla en terminal/editor; no afecta CI.
6. **`no-hardcoded-ip` / `no-hardcoded-passwords` marcan fixtures de tests** —
   IPs (`1.2.3.4`, `5.6.7.8`, `9.9.9.9` en `feed-url-guard.test.ts`) y passwords
   de test son datos intencionales. Warnings aceptables; no silenciar sin revisar.
7. **Reglas type-aware** — varias reglas del subset (`no-inconsistent-returns`,
   `no-ignored-return`, `no-misleading-array-reverse`, `no-small-switch`,
   `prefer-immediate-return`, `no-collection-size-mischeck`, `no-element-overwrite`)
   requieren type info. Reportan con el parser de `eslint-config-next/typescript`;
   si algún día dejan de reportar, revisar `parserOptions.projectService`.

---

## Flujo de trabajo

- **Antes de mergear una feature**: `pnpm quality` + `pnpm lint` y revisar que no
  aparezcan hallazgos NUEVOS (los del baseline están documentados en DT8).
- **Para fixear**: `knip --fix` (borra exports/deps sin uso, con `--fix-type`),
  `fallow fix --dry-run` (preview), refactor manual para clones de jscpd, y
  `eslint --fix` para los smells sonarjs auto-fixables (hoy 2: `prefer-immediate-return`
  y `no-unenclosed-multiline-block`).
- **Para suprimir puntual**: knip → `ignoreDependencies`/`ignoreFiles` en
  `knip.json`; fallow → `// fallow-ignore-next-line <rule>` en el código o
  `ignoreExports` en `.fallowrc.json`; jscpd → `// cpd-disable` en el bloque;
  sonarjs → `// eslint-disable-next-line sonarjs/<rule>` en el código.
- **Regla de oro**: si un hallazgo es real pero no se fixea ahora, se documenta
  en [TODO.md](TODO.md) — nunca se silencia en config sin dejar rastro.