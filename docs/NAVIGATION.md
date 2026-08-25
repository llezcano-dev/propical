# Navegación — mapeo URL ↔ Navbar (v1, 2026-08-14)

> Documento de decisiones de IA (information architecture). Registra el mapeo
> actual entre URLs y navbar, la inconsistencia deliberada entre ambas
> jerarquías, y las direcciones futuras. La inconsistencia es un requisito no
> funcional conocido — trackeado como **DT3** en [TODO.md](TODO.md), se puede
> atacar en una tarea aparte.

## Contexto — dos jerarquías

Propical tiene DOS jerarquías que **no son 1:1**:

1. **Jerarquía de URL** (anidada, scope-first): la propiedad es el recurso
   primario; las vistas son sub-recursos.
2. **Jerarquía de features** (de importancia/flujo): lo que el usuario percibe
   como features de primera clase.

La navbar sigue la jerarquía de FEATURES (agrupada por scope operativo); las
URLs siguen la de scope. La inconsistencia es conocida y aceptada
(ver «Inconsistencias conocidas»).

## Mapeo URL ↔ Navbar

### URLs (sin cambios — query params)

| URL | Significado |
|---|---|
| `/dashboard` | Painel — home del portfolio (nivel global) |
| `/dashboard?property=X` | La propiedad X; su home por defecto es **Calendário** (URL pelada sin `&view=`) |
| `/dashboard?property=X&view=cleaning` | Limpeza de la propiedad X (subvista) |
| `/dashboard?property=X&view=sync` | Configurações de la propiedad X (subvista) |
| `/dashboard?property=X&view=reports` | Relatórios de la propiedad X (subvista) |
| `/dashboard?view=reports` | Relatórios global (todas las propiedades) |
| `/dashboard?view=cleaning` | Limpeza global (`GlobalCleaningView`) |
| `/dashboard?view=calendar` | Sin forma global → renderiza «Selecione uma propriedade» (`PropertyRequiredView`) |
| `/dashboard?view=sync` | Ídem → «Selecione uma propriedade» |
| `/dashboard?property=X&reservation=Y&view=guests` | Detalle de reserva Y |

### Navbar (agrupada por scope operativo)

```
[Painel | Limpeza | Relatórios] ║ [Calendário | Configurações]
└─ grupo portfolio (funcionan sin elegir propiedad)
                                 └─ grupo por-propiedad (exigen propiedad)
```

| Tab | En portfolio (sin propiedad) | En propiedad |
|---|---|---|
| Painel | home del portfolio | (elegir propiedad → Calendário) |
| Limpeza | global (`GlobalCleaningView`) | por propiedad |
| Relatórios | global | por propiedad |
| Calendário | «Selecione uma propriedade» | grid (home de la propiedad) |
| Configurações | «Selecione uma propriedade» | settings de la propiedad |

## Decisiones registradas

1. **Naming estándar de industria** (Guesty / Hostaway / Lodgify / Airbnb host):
   | Tab | pt-BR | es | en |
   |---|---|---|---|
   | dashboard | Painel | Panel | Dashboard |
   | calendar | Calendário | Calendario | Calendar |
   | cleaning | Limpeza | Limpieza | Cleaning |
   | reports | Relatórios | Informes | Reports |
   | sync | **Configurações** | **Configuración** | **Settings** |
   - `Configurações` reemplaza al genérico «Propriedade»: ese tab configura la
     propiedad (iCal, buffers, horarios, limpieza), no es «la propiedad».
2. **Grupos por scope, no por importancia**: el separador `║` significa
   «a la derecha necesitás elegir una propiedad». Limpeza está junto a Painel
   porque ambas funcionan a nivel portfolio — no porque sean igual de
   importantes.
3. **Painel → elegir propiedad → Calendário**: el home de la propiedad es
   Calendário (la URL pelada `?property=X`). Estándar Airbnb host / Guesty.
4. **Dropdown «Todas as propriedades» — etiqueta neutra + destino contextual**:
   - Etiqueta constante «Todas as propriedades» (ya no «Painel (todas)»).
   - Destino: desde Limpeza/Relatórios → forma global de la vista actual;
     desde Calendário/Configurações/reserva → Painel.
   - El dropdown es «el pill Todas siempre visible»: misma lógica que
     `PropertySwitcher` (`allPropertiesDestination` en `src/lib/navigation.ts`).
5. **Sin auto-pick**: las tabs Calendário/Configurações sin propiedad navegan
   a su `?view=X`, que renderiza «Selecione uma propriedade» (`PropertyRequiredView`,
   pills + empty state) + tooltip al hover. Se elimina el ghost state donde la
   URL decía calendar/sync pero se renderizaba el Panel.
6. **Global = todas las propiedades**: NO hay sub-selección (`?prop=1,2,3`)
   en el roadmap. Si algún día llega, condiciona el diseño de URL.

## Inconsistencias conocidas (a organizar luego — DT3)

- La navbar agrupa por scope operativo; la URL anida por propiedad. Ej.:
  Limpeza aparece a nivel portfolio en la navbar pero es subvista
  (`&view=cleaning`) en la URL.
- Calendário es el home de la propiedad en la URL (`?property=X` pelado)
  pero vive en el grupo «por-propiedad» de la navbar.
- Relatórios/Limpeza son duales (global O por propiedad): la URL lo expresa
  con/sin `&view=`; la navbar, por pertenencia al grupo portfolio.

## Direcciones futuras (no comprometidas)

- **Reservas** como tab propia (hoy la home muestra próximas reservas por
  tarjeta). Estándar: `Painel | Reservas | Manutenção | Relatório ║ …`.
- **Manutenção** (futuro grupo = Limpeza + servicios/especialistas/issues del
  depto). Renombra a Limpeza cuando aterricen esos features.
- **Modelo de dominio consorcio → depto**: ¿«propiedad» es el consorcio o el
  depto? Decisión de dominio que afecta URLs y esquema — no la navbar.
- **Migración a paths** (`/dashboard/{prop}/calendar`): alternativa evaluada
  (Opción B) y descartada por ahora; revisitar si la inconsistencia molesta.

## Implementación

La lógica pura vive en `src/lib/navigation.ts` (unit-tested en
`src/lib/navigation.test.ts`): `requiresProperty`, `hasPortfolioForm`,
`allPropertiesDestination`, `NAVBAR_TAB_GROUPS`, `defaultViewFor`,
`resolveActiveView`. Los componentes consumen esos helpers:
`top-bar.tsx` (navbar desktop centrada + menú hamburguesa mobile + dropdown),
`page.tsx` (routing del selector), `property-required-view.tsx` (selector).

**Mobile (2026-08-14)**: la navbar < lg es un **menú hamburguesa** (☰ a la
izquierda del logo) que abre los mismos 2 grupos en un panel, con hint
inline para tabs scoped sin propiedad. El header tiene **hide-on-scroll**
(se esconde al bajar, reaparece al subir — mobile only; desktop siempre fijo).
Los view headers (Limpeza/Relatórios, global y por propiedad) son la única
fuente del título + scope — el `ScopeBadge` se eliminó por redundancia.
