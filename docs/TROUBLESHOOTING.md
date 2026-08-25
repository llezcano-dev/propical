# Troubleshooting

Problemas comunes de desarrollo y sus soluciones. Bien corto, en orden de
frecuencia.

---

## `FATAL: An unexpected Turbopack error occurred` + loop de refresh

**Síntoma**: `pnpm dev` arranca pero crashea con

```
FATAL: An unexpected Turbopack error occurred. A panic log has been
written to /tmp/next-panic-*.log.
```

El browser entra en un loop de refresh: Turbopack crashea → el server se
cae → el browser recarga → Turbopack compila de nuevo → vuelve a crashear.

**Causa**: Cache corrupta de Turbopack en `.next/` (puede inflarse a
gigabytes). No es un bug del código — por eso "antes andaba".

**Fix**:

```bash
pnpm clean        # borra .next/ + node_modules/.cache
pnpm dev
```

Si sigue, reinstalación completa desde el lockfile:

```bash
pnpm clean:deep   # nuke .next/ + node_modules/ + pnpm install
pnpm dev
```

**Fallback**: si aun así persiste, cambiar el bundler de dev a webpack
(estable, no paniquea — es el mismo que usa `next build`):

```diff
  "scripts": {
-   "dev": "next dev",
+   "dev": "next dev --webpack",
  }
```

> Nota: el log del panic queda en `/tmp/next-panic-*.log`. Si querés
> reportarlo a Vercel, pegá ese archivo — no es información sensible.
