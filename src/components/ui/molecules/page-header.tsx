import { cn } from "@/lib/utils";

/**
 * PageHeader — título + subtítulo + acciones opcionales (capa 3 de marca).
 *
 * Unifica el patrón `h1/h2 text-2xl font-bold text-text-primary`
 * + `p.mt-1 text-sm text-text-faint` + botón a la derecha (inventario: ~20
 * páginas admin + settings/sync/tasks/profile). Reproduce las clases exactas
 * actuales para mantener el diff visual en 0; las variantes por instancia
 * (text-xl, font-semibold, tracking-tight, truncate, flex items-center) se
 * pasan por `titleClassName` (twMerge resuelve los conflictos).
 *
 * Uso:
 *   <PageHeader title={t.title} subtitle={t.subtitle} />
 *   <PageHeader level="h1" title={name} titleClassName="flex items-center gap-2 truncate" />
 *   <PageHeader title={t.title} actions={<Button>Nuevo</Button>} />
 */
interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Acciones a la derecha (botones, links). */
  actions?: React.ReactNode;
  level?: "h1" | "h2";
  /** Alineación vertical de las acciones respecto al título (default: start). */
  align?: "start" | "center";
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

function PageHeader({
  title,
  subtitle,
  actions,
  level = "h2",
  align = "start",
  className,
  titleClassName,
  subtitleClassName,
}: PageHeaderProps) {
  const Heading = level;
  return (
    <div
      className={cn(
        "flex justify-between",
        align === "center" ? "items-center" : "items-start",
        className,
      )}
    >
      <div className="min-w-0">
        <Heading className={cn("text-2xl font-bold text-text-primary", titleClassName)}>
          {title}
        </Heading>
        {subtitle && (
          <p className={cn("mt-1 text-sm text-text-faint", subtitleClassName)}>{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export { PageHeader };