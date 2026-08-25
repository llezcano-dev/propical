/**
 * tokens.test.ts — contrato de contraste WCAG del sistema de tokens.
 *
 * Parse de `src/app/globals.css` (no valores hardcodeados): si alguien cambia
 * un primitivo o semántico en el CSS, este test lo detecta en CI.
 *
 * Dos capas de asserts:
 *  1. Pares AA estrictos — texto ≥ 4.5:1, UI/no-texto ≥ 3:1 (ambos temas).
 *  2. Deuda documentada — pares que no cumplen AA se congelan con un
 *     "floor" (= contraste actual) para impedir regresiones sin que CI
 *     rompa; al corregirse, se mueven a la capa estricta.
 *
 * Referencia de reglas: piso tipográfico (texto < 14px prohibido salvo
 * eyebrows uppercase), CTA primario siempre ≥ 4.5:1, --noite-4 solo texto
 * grande.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const CSS_PATH = new URL("../app/globals.css", import.meta.url).pathname;

/* ─────────────────────────── parser CSS mínimo ─────────────────────────── */

type BlockMap = Record<string, string>;

/** Extrae todos los bloques `selector { ... }` (balanceo de llaves) y los
 *  fusiona — hay DOS `:root` (primitivos + semánticos) que suman. */
function extractBlock(css: string, selector: string): string {
  const re = new RegExp(`(?:^|\\n)\\s*${selector}\\s*\\{`, "gm");
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const open = m.index + m[0].lastIndexOf("{");
    let depth = 0;
    for (let i = open; i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") {
        depth--;
        if (depth === 0) {
          blocks.push(css.slice(open + 1, i));
          break;
        }
      }
    }
  }
  if (blocks.length === 0) throw new Error(`Bloque "${selector}" no encontrado`);
  return blocks.join("\n");
}

/** Extrae `--nombre: valor;` de un bloque, ignorando comentarios. */
function parseVars(block: string): BlockMap {
  const out: BlockMap = {};
  const clean = block.replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) out[m[1]] = m[2].trim();
  return out;
}

/** Resuelve var(--x) recursivamente hasta un color literal. */
function resolve(name: string, map: BlockMap, depth = 0): string {
  if (depth > 10) throw new Error(`Cadena var() demasiado profunda: ${name}`);
  const v = map[name];
  if (v === undefined) throw new Error(`Token desconocido: ${name}`);
  const m = v.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  if (m) return resolve(m[1], map, depth + 1);
  return v;
}

/* ─────────────────────────── colores + contraste ───────────────────────── */

type RGBA = { r: number; g: number; b: number; a: number };

function parseHex(hex: string): RGBA {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) throw new Error(`Hex inválido: ${hex}`);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: 1,
  };
}

function parseRgba(value: string): RGBA {
  const m = value.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/,
  );
  if (!m) throw new Error(`rgba() inválido: ${value}`);
  return {
    r: Number(m[1]),
    g: Number(m[2]),
    b: Number(m[3]),
    a: m[4] === undefined ? 1 : Number(m[4]),
  };
}

/** Sólo se admiten los valores que usa la capa primitiva/semántica. */
function parseColor(value: string): RGBA {
  if (/^#[0-9a-fA-F]{3,8}$/.test(value.trim())) return parseHex(value.trim());
  if (/^rgba?\(/.test(value.trim())) return parseRgba(value.trim());
  throw new Error(`Formato de color no soportado en tokens: ${value}`);
}

/** Compone un color con alpha sobre un fondo sólido. */
function composite(fg: RGBA, bg: RGBA): RGBA {
  const ch = (f: number, b: number, a: number) => Math.round(a * f + (1 - a) * b);
  return { r: ch(fg.r, bg.r, fg.a), g: ch(fg.g, bg.g, fg.a), b: ch(fg.b, bg.b, fg.a), a: 1 };
}

function luminance({ r, g, b }: RGBA): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(fg: RGBA, bg: RGBA): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/* ─────────────────────────────── cargar tokens ─────────────────────────── */

const css = readFileSync(CSS_PATH, "utf8");

/** Resuelve un color de token a RGBA, componiendo alpha sobre la superficie
 *  base del tema (que es lo que pasa visualmente en la app: los pills/chips
 *  translúcidos se pintan sobre el fondo areia). */
function colorOf(token: string, theme: "light" | "dark"): RGBA {
  const surface = parseColor(resolve("--areia", themeVars[theme]));
  const raw = resolve(token, themeVars[theme]);
  return composite(parseColor(raw), surface);
}

/** En dark, los semánticos viven en :root y `.dark` re-pinta SOLO los
 *  primitivos (--areia, --noite…). El map dark = :root + primitivos dark. */
const themeVars: Record<"light" | "dark", BlockMap> = (() => {
  const root = parseVars(extractBlock(css, ":root"));
  const dark = parseVars(extractBlock(css, "\\.dark"));
  return { light: root, dark: { ...root, ...dark } };
})();

function pairRatio(fgToken: string, bgToken: string, theme: "light" | "dark"): number {
  return contrast(colorOf(fgToken, theme), colorOf(bgToken, theme));
}

function fmt(n: number): string {
  return n.toFixed(2);
}

/* ───────────────────────────── pares semánticos ────────────────────────── */

/** [texto, fondo, umbral, motivo] — deben cumplir en AMBOS temas. */
const STRICT_PAIRS: Array<[string, string, number, string]> = [
  ["--text-primary", "--surface", 4.5, "texto principal"],
  ["--text-secondary", "--surface", 4.5, "texto secundario"],
  ["--text-muted", "--surface", 4.5, "texto informativo (--noite-3, mínimo para contenido)"],
  ["--text-primary", "--surface-raised", 4.5, "títulos en cards/popover"],
  ["--text-muted", "--surface-raised", 4.5, "texto informativo en cards"],
  ["--text-primary", "--surface-hover", 4.5, "texto sobre muted/accent (hover fills)"],
  ["--text-secondary", "--surface-hover", 4.5, "texto secundario sobre fills"],
  ["--link", "--surface", 4.5, "enlaces (--coral-deep)"],
  ["--success", "--surface", 4.5, "texto/íconos de estado éxito"],
  ["--info", "--surface", 4.5, "texto/íconos de estado info"],
  ["--resina", "--surface", 4.5, "eyebrow (label uppercase)"],
  ["--status-buffer-fg", "--surface", 4.5, "fg del chip de buffer/limpieza sobre el fondo"],
  ["--status-free", "--surface", 3, "pill de estado libre (no-texto)"],
  ["--status-booked", "--surface", 3, "pill de estado ocupado (no-texto) — coral-deep"],
  ["--text-faint", "--surface", 4.5, "texto decorativo (--noite-4) — oscurecido a 5.64:1 light / 4.77:1 dark, ya no es solo texto grande"],
  ["--text-faint", "--surface-raised", 4.5, "texto decorativo en cards"],
  // El CTA primario es açaí con tinta clara (--acai-fg), nunca
  // blanco sobre ámbar. El borde del botón contra la superficie es UI suave
  // (1.84 light) — decisión de diseño del brand book, compensada con sombra
  // (box-shadow .btn-primary) y texto de alto contraste.
  ["--action-primary-fg", "--action-primary-bg", 4.5, "texto del CTA primario sobre açaí"],
  // El açaí como letra (#5b21b6) fallaba ~1.6:1. --action-primary-text
  // es el açaí oscuro AA (light #4c1d95 / dark #c4b5fd) para texto/íconos
  // sobre superficie y fondos suaves bg-action-primary/10-30.
  ["--action-primary-text", "--surface", 4.5, "açaí como texto sobre superficie"],
  ["--action-primary-text", "--surface-raised", 4.5, "açaí como texto en cards"],
  ["--action-primary-text", "--surface-hover", 4.5, "açaí como texto sobre fills"],
  ["--action-primary-text-hover", "--surface", 4.5, "hover del açaí como texto"],
];

/** [texto, fondo, theme, floor, razón] — deuda conocida; floor = contraste
 *  actual, inamovible salvo mejora. Las deudas previas (--text-faint,
 *  CTA dark, --status-booked) fueron corregidas y movidas a STRICT_PAIRS;
 *  la lista queda vacía a propósito: si vuelve a aparecer un par que no
 *  cumple AA, se documenta acá con su floor. */
const DEBT_PAIRS: Array<[string, string, "light" | "dark", number, string]> = [];

describe("design tokens — contraste WCAG", () => {
  it("parsea :root y .dark sin tokens duplicados perdidos", () => {
    const light = themeVars.light;
    const dark = themeVars.dark;
    // Primitivos y semánticos clave presentes en ambos temas.
    for (const token of [
      "--areia", "--areia-2", "--areia-3",
      "--noite", "--noite-2", "--noite-3", "--noite-4",
      "--ambar", "--mel", "--mel-alt", "--resina",
      "--coral-deep", "--coral", "--mata", "--mar",
      "--acai", "--acai-2", "--acai-soft", "--acai-fg",
      "--acai-text", "--acai-text-hover",
      "--line", "--line-2",
      "--ambar-fg",
      "--surface", "--surface-raised", "--surface-hover",
      "--text-primary", "--text-secondary", "--text-muted", "--text-faint",
      "--action-primary-bg", "--action-primary-hover", "--action-primary-soft",
      "--action-primary-fg",
      "--link", "--success", "--info", "--border", "--border-strong",
      "--status-buffer-fg", "--status-buffer-bg", "--status-buffer-border",
      "--status-booked", "--status-free",
    ]) {
      expect(light[token], `light ${token}`).toBeDefined();
      expect(dark[token], `dark ${token}`).toBeDefined();
    }
    // Semánticos que referencian primitivos (cero valores directos).
    expect(light["--surface"]).toBe("var(--areia)");
    expect(light["--text-primary"]).toBe("var(--noite)");
    expect(light["--border"]).toBe("var(--line)");
    expect(light["--muted-foreground"]).toBe("var(--text-muted)");
  });

  it("pares AA estrictos en light y dark", () => {
    for (const [fg, bg, threshold, why] of STRICT_PAIRS) {
      for (const theme of ["light", "dark"] as const) {
        const r = pairRatio(fg, bg, theme);
        expect(
          r,
          `${fg} sobre ${bg} (${theme}) debe ser ≥${threshold} (${why}) — actual ${fmt(r)}`,
        ).toBeGreaterThanOrEqual(threshold);
      }
    }
  });

  it("deuda documentada no regresa (floor congelado)", () => {
    for (const [fg, bg, theme, floor, reason] of DEBT_PAIRS) {
      const r = pairRatio(fg, bg, theme);
      expect(
        r,
        `${fg} sobre ${bg} (${theme}) floor ${fmt(floor)} — actual ${fmt(r)}. ${reason}`,
      ).toBeGreaterThanOrEqual(floor - 0.01);
    }
  });

  it("la capa semántica de texto no expone --noite-4 para contenido (regla §3.2)", () => {
    // El texto de contenido mapea a --noite-3 como mínimo; --text-faint existe
    // pero no debe usarse como default de texto (solo decorativo grande).
    const light = themeVars.light;
    expect(light["--muted-foreground"]).not.toBe("var(--text-faint)");
    expect(light["--text-secondary"]).not.toBe("var(--noite-4)");
  });
});
