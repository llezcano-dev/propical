// Script de reemplazo mecánico para el piso tipográfico (0.85rem):
// text-[10px]/[11px]/[12px]/[13px] → text-sm (0.875rem = 14px ≥ 0.85rem).
// Uso: node scripts/typographic-floor.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");

const PATTERNS = [
  /text-\[10px\]/g,
  /text-\[11px\]/g,
  /text-\[12px\]/g,
  /text-\[13px\]/g,
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

let total = 0;
const changed = [];

for (const file of walk(SRC)) {
  const original = readFileSync(file, "utf8");
  let content = original;
  for (const re of PATTERNS) {
    const matches = content.match(re);
    if (matches) total += matches.length;
    content = content.replace(re, "text-sm");
  }
  if (content !== original) {
    writeFileSync(file, content);
    changed.push(file);
  }
}

console.log(`Reemplazadas ${total} instancias en ${changed.length} archivos.`);