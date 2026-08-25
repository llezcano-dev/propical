import { cn } from "@/lib/utils";

import { resolvePlatformMeta } from "@/lib/platform-meta";

/**
 * PlatformDot — punto de color de marca de una plataforma de calendario.
 *
 * Envuelve el patrón inline
 * `style={{ backgroundColor: resolvePlatformMeta(x).color }}` sobre un span
 * redondeado (~6 instancias en dashboard / ical-links). El color SIEMPRE sale
 * de platform-meta.ts (única fuente). Los pills con label (dot + texto de
 * plataforma) son Chip.
 *
 * Uso:
 *   <PlatformDot platform={res.platform} />        → 8px (h-2 w-2)
 *   <PlatformDot platform="booking" size="md" />   → 10px (h-2.5 w-2.5)
 *
 * aria-hidden: es puramente decorativo — siempre va acompañado de texto.
 */
interface PlatformDotProps {
  platform: string;
  /** Tamaño visual — reproduce los dots inline de hoy. */
  size?: "sm" | "md";
  className?: string;
}

function PlatformDot({ platform, size = "sm", className }: PlatformDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "shrink-0 rounded-full",
        size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5",
        className,
      )}
      style={{ backgroundColor: resolvePlatformMeta(platform).color }}
    />
  );
}

export { PlatformDot };
