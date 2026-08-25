import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Chip — pill / tag de status, tone o plataforma (capa 3 de marca).
 *
 * Unifica los ~28+ pills inline de la app. Los tones mapean a tokens
 * `--tone-*` (derivados del brand: mata/coral/ambar/mar).
 *
 * Uso:
 *   <Chip tone="neutral">Feed público</Chip>                    → pill neutral
 *   <Chip tone="success">OK</Chip>                              → pill tone
 *   <Chip variant="tag" tone="error" className="font-semibold"> →
 *                                                       tag uppercase (log level)
 *   <Chip tone="brand" style={{ backgroundColor: color }}>Booking</Chip>
 *                                                    → pill sólido de plataforma
 *   <Chip leading={<PlatformDot platform="booking" />}>Booking</Chip>
 *                                                    → pill con dot de marca
 *
 * className se mergea con twMerge → sirve para overrides puntuales
 * (py, radius, font-weight) de instancias que no calzan en los defaults.
 */
const chipVariants = cva("inline-flex items-center gap-1.5", {
  variants: {
    variant: {
      /** Clásico pill redondeado (rounded-full). */
      pill: "rounded-full",
      /** Tag de status/log: rounded + uppercase tracking-wide. */
      tag: "rounded uppercase tracking-wide",
    },
    tone: {
      /** Fondo neutro (hover-fill) + texto muted. */
      neutral: "bg-surface-hover text-text-muted",
      /** Neutro más tenue (archived / inactivo). */
      faint: "bg-surface-hover/50 text-text-faint",
      /** Outline + fill suave de acción. */
      action: "border border-action-primary/30 bg-action-primary/10 text-action-primary-text",
      success: "bg-tone-success-bg text-tone-success-fg",
      error: "bg-tone-error-bg text-tone-error-fg",
      warning: "bg-tone-warning-bg text-tone-warning-fg",
      info: "bg-tone-info-bg text-tone-info-fg",
      /** Pill sólido de marca (platform): el bg entra por inline style. */
      brand: "text-white",
    },
    size: {
      sm: "px-1.5 py-0.5 text-sm",
      md: "px-2 py-0.5 text-sm",
      lg: "px-2.5 py-1 text-sm",
    },
  },
  defaultVariants: { variant: "pill", tone: "neutral", size: "md" },
});

interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {
  /** Elemento previo al texto (dot, swatch, icono). */
  leading?: React.ReactNode;
}

function Chip({ className, variant, tone, size, leading, children, ...props }: ChipProps) {
  return (
    <span className={cn(chipVariants({ variant, tone, size }), className)} {...props}>
      {leading}
      {children}
    </span>
  );
}

export { Chip, chipVariants };
