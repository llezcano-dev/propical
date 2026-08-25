# Agregar un idioma / un texto a Propical

Guía compacta del sistema de i18n. El idioma se resuelve **por cookie** (`rt-locale`),
no por prefijos de URL: todos los visitantes comparten la misma URL y la lengua la
decide la cookie → `Accept-Language` del browser → default. Decisión deliberada
(mantiene URLs estables y evita la complejidad SEO de subdirectory routing).

Locales soportados hoy: `en` | `pt` | `es` — default `pt`.

---

## Cómo funciona

1. `src/middleware.ts` define `SUPPORTED_LOCALES` y `DEFAULT_LOCALE`, y adjunta
   los headers `x-locale` / `x-pathname` a cada request.
2. Server components leen `getLocale()` de `src/lib/i18n/server.ts`.
3. Client components leen `useI18n()` de `src/lib/i18n/context.tsx` (bootstrapped
   desde el server, así el primer paint ya tiene el idioma correcto).
4. El switcher (`src/components/locale-switcher.tsx`) escribe la cookie `rt-locale`.

---

## Agregar un idioma nuevo

Son **3 archivos de código** + traducciones. El typechecker te marca todo lo que falte.

### 1. Constantes (3 lugares, deliberadamente duplicados)

| Archivo | Cambio |
|---|---|
| `src/middleware.ts` | `SUPPORTED_LOCALES` + `BROWSER_LOCALE_MAP` (mapeo de Accept-Language) |
| `src/lib/i18n/alternates.ts` | `SUPPORTED_LOCALES` + `DEFAULT_LOCALE` (fuente para metadata/sitemap) |
| `src/lib/i18n/translations.ts` | `export type Locale = "en" \| "pt" \| "es" \| "<nuevo>"` |

> `alternates.ts` vive en runtime Edge frágil y el switcher es client-only — la
> duplicación inline es intencional, son solo constantes baratas de mantener.

### 2. Switcher — flag SVG + opción

`src/components/locale-switcher.tsx`:
- Agregá un componente `Flag<XX>` inline SVG (copiá el patrón de `FlagBR`).
- Agregalo al switch `FlagFor`.
- Agregalo a `OPTIONS` (`code`, `short`, `label`).

> Inline SVG, NO emoji de bandera: Windows renderiza los regional indicators como
> letras sueltas (`🇧🇷` → "BR"). SVG esquiva el fallback de fuente del OS.

### 3. Traducí el copy — corre `npx tsc --noEmit`

El nuevo valor de `Locale` hace que TypeScript marque **cada** `Record<Locale, …>` que
falte. Cada error es una superficie de copy a traducir:

- `src/lib/i18n/translations.ts` — cada entrada `{ en, es, pt }` (dictionary central).
- Bloques `COPY` / `<X>_COPY` por página (ver "Agregar un texto" abajo).
- `HOME_META` + `homeCopy` en `src/lib/i18n/home-copy.ts` (title/description SEO + copy del landing).

No traduzcas nunca: términos de nicho sin equivalente natural, y el copy legal
(`/privacy`, `/terms` quedan EN-only por diseño).

### Marca: convención de casing

La marca se escribe de dos formas según contexto — **nunca** `PropiCal`:

| Contexto | Forma |
|---|---|
| Wordmark visual y strings de marca sueltas en UI (OG image, header del email, heading del login, título del sidebar, PWA `short_name`, aria-label del logo) | `propical` |
| Nombre propio en prosa (títulos `· Propical`, descripciones meta, JSON-LD, copy, emails, docs) | `Propical` |
| Técnico ya-minúscula (dominio, package.json, repo) | sin cambio |

`login.title` y `sidebar.title` en `translations.ts` son wordmark → van en minúsculas
y no se traducen. El guard `src/lib/brand-casing.test.ts` falla si `PropiCal`
reaparece en el código.

### 4. Verificación local

```bash
npx tsc --noEmit        # 1. todos los Record<Locale> completos
pnpm dev                # 2. switcher muestra flag + label nuevos, click cambia el idioma
```

No hay prefijos de URL ni sitemap hreflang por locale que verificar: el sistema emite
solo `x-default` (un solo canonical por URL). Google nunca ve contenido duplicado.

---

## Agregar un texto nuevo a la UI ("adding a label")

Hay **dos patrones** en el codebase. Elegí según el contexto del componente:

### Patrón A — Dictionary central (componentes cliente / strings reusables)

Para strings que se usan en client components (`"use client"`) o se repiten.

1. Agregá la key a `src/lib/i18n/translations.ts`:

```ts
"reservation.statusConfirmed": { en: "Confirmed", es: "Confirmada", pt: "Confirmada" },
```

   Con placeholders si es necesario:

```ts
"reservation.nights": { en: "{n} nights", es: "{n} noches", pt: "{n} noites" },
```

2. En el componente:

```tsx
const { t } = useI18n();
// en el JSX:
{t("reservation.statusConfirmed")}
{t("reservation.nights", { n: nights })}
```

   El typechecker valida la key (es `TranslationKey` tipado) y los 3 locales.

### Patrón B — Bloque `COPY` local (páginas con copy grande)

Para páginas server/marketing con mucho copy local (landing, admin pages). Cada página
define su propio shape + bloque:

```tsx
interface CopyShape {
  title: string;
  subtitle: string;
}
const COPY: Record<Locale, CopyShape> = {
  en: { title: "…", subtitle: "…" },
  es: { title: "…", subtitle: "…" },
  pt: { title: "…", subtitle: "…" },
};
```

```tsx
// server component
const locale = await getLocale();
const t = COPY[locale] ?? COPY.en;
```

```tsx
// client component
const { locale } = useI18n();
const t = COPY[locale] ?? COPY.en;
```

> En client components sin `useI18n` necesario, hay ejemplos con ternarios
> `locale === "es" ? … : …` (legacy) — convertilos al patrón `Record<Locale, …>`.

### Reglas

- **Siempre los 3 locales.** El typechecker te obliga en ambos patrones.
- **Naming de keys** (patrón A): `dominio.verbo/tema`, ej. `login.title`, `common.save`.
- **Placeholders** con `{llaves}`, pasados como `{ n: number }` — no concatenación.
- **Traducción, no transcreación** en UI interna; voz de marca en marketing.
- **i18n en mensajes de API/server**: los mensajes del sync log usan payloads
  estructurados `{key, params}` (`src/lib/sync-log-messages.ts`) con fallback al
  texto crudo para filas legacy — los mensajes nuevos de server deben seguir
  ese patrón.
