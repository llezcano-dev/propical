/**
 * settings-card.tsx — card reutilizable de la vista de Configurações.
 *
 * Antes cada sección (plataformas, regras de estadia, acesso e
 * compartilhamento) renderizaba su propia card con un título de tamaño
 * distinto (text-sm / text-base / text-eyebrow) — la inconsistencia que
 * el refactor disperso generaba. Este componente unifica el patrón:
 * fondo gris + borde + título + contenido, con el título definido en UN
 * solo lugar.
 *
 * Convenciones (consistentes en TODAS las cards de la vista):
 * - Sin línea divisoria entre header y body (ninguna card la tiene).
 * - Header: título `text-base font-semibold` con padding `px-4 pt-4 pb-2.5`.
 * - Spacing header→body unificado: el gap visual entre título y contenido
 *   es el pb-2.5 del header, idéntico en todas las cards.
 * - El header es un <div> (texto seleccionable/copiable). El colapso
 *   mobile (solo regras de estadia) se activa con `collapsible` +
 *   `open`/`onToggle`: muestra un chevron SOLO en pantallas chicas
 *   (`sm:hidden`); en desktop el contenido siempre está visible.
 */
export function SettingsCard({
  title,
  children,
  className = "",
  collapsible = false,
  open = true,
  onToggle,
  action,
  leading,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Si es true, muestra un chevron que colapsa el contenido en mobile
   *  (solo <sm). En desktop el contenido siempre está visible. */
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
  /** Elemento opcional a la derecha del título (ej. un botón de
   *  acción como "novo modelo"). */
  action?: React.ReactNode;
  /** Elemento opcional a la izquierda del título (ej. el dot de color
   *  de una plataforma). */
  leading?: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border border-border bg-surface-raised ${className}`}>
      <div className="flex w-full items-center justify-between gap-3 px-4 pt-4 pb-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {leading}
          <h2 className="min-w-0 flex-1 truncate select-text text-base font-semibold text-text-primary">{title}</h2>
        </div>
        {collapsible ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={open ? "Collapse" : "Expand"}
            className="shrink-0 rounded p-0.5 text-text-faint transition-transform sm:hidden"
          >
            <svg className={`h-4 w-4 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        ) : (
          action
        )}
      </div>
      <div className={`px-4 pb-4 ${collapsible ? `sm:block ${open ? "block" : "hidden"}` : ""}`}>
        {children}
      </div>
    </div>
  );
}
