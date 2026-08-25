import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Eyebrow — label en mayúsculas (capa 3 de marca).
 *
 * Unifica los ~50+ `uppercase tracking-*` inline de la app en 4 sub-flavors:
 * section / field / tag / semibold. La base `text-sm` (0.875rem) respeta el
 * rendering actual; la `@utility text-eyebrow` (0.85rem / 0.18em / --resina)
 * es el rol del brand book para marketing, no se usa acá.
 *
 * Uso:
 *   <Eyebrow>Próximas estadías</Eyebrow>              → section (h2/secciones)
 *   <label className={eyebrowVariants({ variant: "field" })}>Nome</label>
 *   <th className={eyebrowVariants({ variant: "tag" })}>Data</th>
 */
const eyebrowVariants = cva("text-sm uppercase", {
  variants: {
    variant: {
      /** Secciones / títulos de bloque. */
      section: "font-medium tracking-wide text-text-faint",
      /** Labels de campos de formulario. */
      field: "font-medium tracking-wider text-text-faint",
      /** Cabeceras de tabla / etiquetas livianas (sin peso propio). */
      tag: "tracking-wider text-text-faint",
      /** Cabecera de semana del calendario (semibold, tracking-wider). */
      semibold: "font-semibold tracking-wider text-text-faint",
    },
  },
  defaultVariants: { variant: "section" },
});

function Eyebrow({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof eyebrowVariants>) {
  return <span className={cn(eyebrowVariants({ variant }), className)} {...props} />;
}

export { Eyebrow, eyebrowVariants };
