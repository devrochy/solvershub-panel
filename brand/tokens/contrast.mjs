#!/usr/bin/env node
// Verificador de contraste WCAG 2.2 de los tokens (sin dependencias — solo Node).
//
// Lee tokens.json, resuelve cada tema y revisa los pares texto/fondo que usa el
// producto: texto ≥ 4,5:1 (1.4.3) y elementos no textuales ≥ 3:1 (1.4.11). Los
// fondos con transparencia (status-*-bg) se componen sobre la superficie antes de
// medir. Sale con código 1 si algún par no cumple (lo corre el CI de tokens).
//
// Uso: node contrast.mjs   (o `npm run contrast`)

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(readFileSync(join(ROOT, "tokens.json"), "utf8"));

// ---- resolución de alias (mismo criterio que build.mjs) ----
const byPath = new Map();
(function walk(node, path) {
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith("$") || !v || typeof v !== "object") continue;
    if ("$value" in v) byPath.set([...path, k].join("."), v.$value);
    else walk(v, [...path, k]);
  }
})(doc, []);

function resolve(value) {
  if (typeof value !== "string") return value;
  return value.replace(/\{([^}]+)\}/g, (_, ref) => {
    if (!byPath.has(ref)) throw new Error(`Alias sin destino: {${ref}}`);
    return resolve(byPath.get(ref));
  });
}

// ---- color ----
function parse(c) {
  const hex = /^#([0-9a-f]{6})$/i.exec(c);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/.exec(c);
  if (rgba) return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: rgba[4] === undefined ? 1 : +rgba[4] };
  throw new Error(`Color no soportado: ${c}`);
}

/** Compone `top` (con alfa) sobre `bottom` (opaco). */
function over(top, bottom) {
  const a = top.a;
  return {
    r: top.r * a + bottom.r * (1 - a),
    g: top.g * a + bottom.g * (1 - a),
    b: top.b * a + bottom.b * (1 - a),
    a: 1,
  };
}

function luminance({ r, g, b }) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(fg, bg) {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// ---- pares a verificar ----
const TEXT = 4.5;
const NON_TEXT = 3;
const STATUS = ["success", "warning", "danger", "info"];

function pairsFor(themeName) {
  const theme = Object.fromEntries(
    Object.entries(doc.theme[themeName])
      .filter(([k, v]) => !k.startsWith("$") && v?.$value)
      .map(([k, v]) => [k, resolve(v.$value)]),
  );
  const color = (k) => {
    if (!(k in theme)) throw new Error(`theme.${themeName}.${k} no existe`);
    return parse(theme[k]);
  };
  const surfaces = ["bg", "surface", "surface-2"];
  const pairs = [];
  const add = (fgName, fg, bgName, bg, min) => pairs.push({ fgName, bgName, value: ratio(fg, bg), min });

  for (const s of surfaces) {
    const bg = color(s);
    for (const t of ["text", "text-muted", "text-soft", "link"]) add(t, color(t), s, bg, TEXT);
    for (const st of STATUS) add(`status-${st}-fg`, color(`status-${st}-fg`), s, bg, TEXT);
    add("control-border", color("control-border"), s, bg, NON_TEXT);
    add("focus", color("focus"), s, bg, NON_TEXT);
  }
  // Badges y banners: texto de estado sobre su tinte, compuesto sobre la superficie.
  for (const s of ["surface", "bg"]) {
    for (const st of STATUS) {
      const tinted = over(color(`status-${st}-bg`), color(s));
      add(`status-${st}-fg`, color(`status-${st}-fg`), `status-${st}-bg/${s}`, tinted, TEXT);
    }
  }
  // Marcas de datos: no textuales, sobre la superficie de las tarjetas.
  for (const d of ["data-cat-1", "data-cat-2", "data-cat-3", "data-cat-4", "data-single"]) {
    add(d, color(d), "surface", color("surface"), NON_TEXT);
  }
  return pairs;
}

// La CTA lleva texto blanco sobre el degradado: se mide en cada parada.
function ctaPairs() {
  const gradient = resolve(byPath.get("gradient.cta"));
  const stops = gradient.match(/#[0-9a-f]{6}/gi) ?? [];
  if (stops.length < 2) throw new Error("gradient.cta sin paradas hex");
  const white = parse(resolve(byPath.get("color.white")));
  const cta = stops.map((s) => ({ fgName: "white", bgName: `gradient-cta ${s}`, value: ratio(white, parse(s)), min: TEXT }));
  // Rellenos de botón con texto blanco en los dos temas (Tailwind: bg-action, bg-danger-strong).
  const rellenos = ["color.blue.600", "color.status.light.danger", "color.navy.600"].map((ref) => ({
    fgName: "white",
    bgName: ref,
    value: ratio(white, parse(resolve(byPath.get(ref)))),
    min: TEXT,
  }));
  return [...cta, ...rellenos];
}

const results = [
  ...["light", "dark"].flatMap((t) => pairsFor(t).map((p) => ({ theme: t, ...p }))),
  ...ctaPairs().map((p) => ({ theme: "ambos", ...p })),
];
const failures = results.filter((r) => r.value < r.min);

for (const r of failures) {
  console.error(`✗ [${r.theme}] ${r.fgName} sobre ${r.bgName}: ${r.value.toFixed(2)}:1 (mínimo ${r.min}:1)`);
}
console.log(`${failures.length ? "✗" : "✓"} contraste · ${results.length} pares · ${failures.length} fallas`);
process.exit(failures.length ? 1 : 0);
