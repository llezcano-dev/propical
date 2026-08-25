/**
 * typographic-floor.test.ts — piso tipográfico 0.85rem.
 *
 * Scan de todos los `.tsx` bajo `src/`: falla si reaparece `text-[10px]`,
 * `text-[11px]`, `text-[12px]` o `text-[13px]` (todos < 0.85rem ≈ 13.6px,
 * violan AA).
 *
 * Regla del brand book: "ningún texto por debajo de
 * 0.85rem (≈14px). Abaixo disso, só UI decorativa." — y la app no tiene
 * excepciones decorativas hoy.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = new URL("../", import.meta.url).pathname;

/** Recorre `src/` y devuelve todos los `.tsx` (recursivo). */
function walkTsx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walkTsx(p));
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const FLOOR_VIOLATION = /text-\[1[0-3]px\]/g;

describe("piso tipográfico 0.85rem", () => {
  const files = walkTsx(SRC);
  const offenders: { file: string; line: number; match: string }[] = [];

  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      FLOOR_VIOLATION.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = FLOOR_VIOLATION.exec(line))) {
        offenders.push({ file, line: i + 1, match: m[0] });
      }
    });
  }

  it("ningún text-[10px]/[11px]/[12px]/[13px] en src/**/*.tsx", () => {
    expect(offenders).toEqual([]);
  });

  it("el scan cubre todos los .tsx de src/", () => {
    // Guard: si el walker deja de encontrar archivos, el test de arriba
    // pasaría por vacío — este assert fija un piso de cobertura.
    expect(files.length).toBeGreaterThan(50);
  });
});