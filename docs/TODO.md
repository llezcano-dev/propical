# TODO — Propical

## Features propuestas

### Extracción local de documentos (RG / pasaporte)
Reemplazar la extracción asistida por IA de `/api/extract` por parsing local:
evaluar librerías (tesseract.js, pdf417.js…), decidir si corre en server o
client, y agregar validación determinística del RG brasileño (9 dígitos +
estado). La IA puede quedar como opción opt-in en una segunda etapa.

### Upload de documento en el guest form
Nuevo tipo de campo `document` en los templates de guest form, con endpoint de
submit que acepte archivos (validación de tamaño y MIME) y preview en la UI,
accesible desde `/g/[token]`.

### Asignación manual de cleaners
Hoy la asignación es automática según el `priority` sugerido. Agregar UI para
asignar un cleaner a un registro de limpieza puntual, dejando `priority` como
sugerencia. Incluir spec e2e.

### Mejoras varias
- Sidebar reorganizada (Panel / Propriedades / Relatórios).
- Messenger: deeplink de WhatsApp/Telegram desde la vista de reserva con el
  template pre-seleccionado (hoy requiere copy/paste).
- AuditLog por gestor: inventariar acciones registradas vs faltantes,
  consistencia actor/action/target/timestamp, cobertura e2e.
- Spec e2e del flujo completo (signup → propiedad → reserva → limpieza).

### Refactors diferidos
- Rename snake_case → camelCase (~80 archivos, mecánico; hacer después de
  subir cobertura de tests).
- Auditoría de dependencias (`pnpm outdated`) y reevaluación de `recharts`.
- Testing e2e en Firefox real (instalar el build de Playwright, ~150 MB) y
  evaluar migrar Vitest a jsdom + React Testing Library.
- Consolidar la administración de overrides de SEO: hoy conviven dos UIs
  vivas sobre el mismo `/api/admin/seo` — el panel embebido en settings
  (`admin-panel.tsx`) y la página dedicada
  (`/dashboard/admin/integrations/seo`). Decidir cuál queda y remover la otra.

### Generador de documentación de API
Script que escanee los route handlers y regenere `docs/API.md` — hoy
desactualizado (faltan ~25 endpoints). Hook `pnpm docs:api`.

### Owner reporting
Sobre la base de métricas existente en reports: ingresos brutos y por
plataforma, ADR, RevPAR, estadía media; estacionalidad (curva mensual);
comparación año-año; valuación (yield + estado de cuenta exportable a
PDF/CSV); proyección a 6 meses.

---

## Deuda técnica conocida

- **DT1** — Separar los specs e2e en `e2e/ui/` vs `e2e/api/`: mover archivos y
  actualizar `testMatch` en `playwright.config.ts` y `run-e2e.sh`.
- **DT3** — La navbar agrupa por scope operativo mientras las URLs anidan por
  propiedad: inconsistencia deliberada y documentada en [NAVIGATION.md](NAVIGATION.md).
  Revisitar cuando moleste.
- **DT4** — Columna `guests` del CSV export: el "0" es correcto. Si aparece
  demanda, agregar tooltip + nota.
- **DT5** — Los headers del CSV export van en inglés a propósito: son contrato
  de datos, no se localizan (los labels/buttons de la UI sí).
- **DT6** — Pluralización ad hoc: extraer helper `plural(n, singular, plural)`
  en `src/lib/i18n/plural.ts` + `trPlural()` en `useI18n()`. Hay ~67
  ocurrencias en 12 archivos: las ~45 ya localizadas van al helper; las ~22
  restantes (páginas admin sin localizar) requieren i18n completo de admin
  primero. Nota: la regla "1 vs other" vale para en/pt/es; si se agregan otros
  idiomas, migrar a `Intl.PluralRules`.
- **DT8** — Deuda detectada por el tooling de calidad (guía de uso e
  interpretación en [QA.md](QA.md)): ~240 clones detectados por jscpd (5.1%,
  sobre el threshold configurado), `lucide-react` declarada como icon library
  pero sin imports (usarla o removerla), y ~490 warnings de sonarjs con 0
  errores (top: strings duplicadas, complejidad ciclomática, anidamiento).
  Atacar en cambios separados.
- **DT9** — Bypass de verificación de email en dev: el gate se infiere del
  entorno (`NODE_ENV !== "production" && !RESEND_API_KEY`) en vez de ser
  opt-in explícito — cualquier entorno no-productivo sin Resend queda con
  bypass activo — y la UI siempre muestra el paso "verificá tu email" aunque
  el backend ya haya creado la sesión. Opciones: flag explícita
  `ALLOW_DEV_SIGNUP_BYPASS=1`, o que la UI distinga cuenta creada vs
  verificación pendiente.

---

## Pre-publicación

- Completar `REPO_URL` en `src/lib/site.ts` (hoy placeholder) y las URLs
  correspondientes en `package.json` (`repository.url` / `bugs.url`) y en los
  links de soporte post-login (`support-footer.tsx`, `guest-form-filler.tsx`).

---

## Referencias

- Feature map: [FEATURES.md](FEATURES.md)
- Arquitectura de información: [NAVIGATION.md](NAVIGATION.md)
- Infraestructura e2e: [E2E-TESTING.md](E2E-TESTING.md)
- API: [API.md](API.md)
- Seguridad: [SECURITY-AUDIT.md](SECURITY-AUDIT.md)
- Self-hosting: [DROPLET-SETUP.md](DROPLET-SETUP.md)
- i18n: [ADDING-A-LANGUAGE.md](ADDING-A-LANGUAGE.md)
- Calidad: [QA.md](QA.md)
