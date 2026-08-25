import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Brand casing guard.
 *
 * The 2026-08 rebrand replaced "PropiCal" with two context-dependent
 * forms: the lowercase wordmark "propical" (visual brand surfaces) and
 * the proper-noun "Propical" (prose). The old camelCase form must never
 * reappear. This test walks src/ and fails with file:line for any
 * offender — same pattern as the removed-feature copy guards in
 * home-copy.test.ts.
 */

const SRC_ROOT = join(process.cwd(), "src");
const SELF = join(process.cwd(), "src", "lib", "brand-casing.test.ts");
const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx"]);
const SKIP_DIRS = new Set(["node_modules", "generated"]);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      yield* walk(full);
    } else if (ALLOWED_EXTENSIONS.has(full.slice(full.lastIndexOf(".")))) {
      yield full;
    }
  }
}

describe("brand casing — no legacy 'PropiCal' anywhere in src/", () => {
  it("uses 'propical' (wordmark) or 'Propical' (prose), never 'PropiCal'", () => {
    const offenders: string[] = [];

    for (const filePath of walk(SRC_ROOT)) {
      // Skip this file: its assertions necessarily contain the needle.
      if (filePath === SELF) continue;
      const lines = readFileSync(filePath, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (line.includes("PropiCal")) {
          offenders.push(`${filePath}:${i + 1}: ${line.trim().slice(0, 80)}`);
        }
      });
    }

    expect(
      offenders,
      `legacy camelCase brand found (${offenders.length}):\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
