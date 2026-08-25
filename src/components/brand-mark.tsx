/**
 * Propical brand mark — brandbook variant "a · uso principal":
 * gradient tile (âmbar → coral), full areia
 * sun top-right, noite house silhouette. Geometry is the brandbook's
 * 120-unit viewBox, fixed ("não deformar nem girar").
 */

const AMBAR = "#F2A93B";
const CORAL = "#FF6A47";
const AREIA = "#FAF5EC";
const NOITE = "#241A10";

interface BrandMarkProps {
  /** Size / effects classes applied to the tile SVG itself. */
  className?: string;
}

export function BrandMark({
  className = "h-9 w-9 shrink-0 shadow-sm shadow-[color-mix(in_srgb,var(--ambar)_30%,transparent)] transition-all duration-200 ease-out group-hover:scale-110 group-hover:shadow-md group-active:scale-90 group-active:duration-75",
}: BrandMarkProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pc-mark-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={AMBAR} />
          <stop offset="100%" stopColor={CORAL} />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#pc-mark-grad)" />
      <circle cx="74" cy="40" r="26" fill={AREIA} />
      <path d="M48 36 L24 64 L24 88 L72 88 L72 64 Z" fill={NOITE} />
    </svg>
  );
}
