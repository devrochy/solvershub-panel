#!/usr/bin/env node
// Generador de Design Tokens de SolversHub (sin dependencias — solo Node).
//
// Fuente única: tokens.json (DTCG). Salidas:
//   tokens.css                      variables CSS (panel, landing, cualquier web)
//   dist/tailwind-theme.css         mapeo @theme inline (Tailwind v4)
//   dist/theme.ts                   tema tipado para React Native (solvershub-apk)
//   dist/android/colors.xml         recursos Android (tema claro)
//   dist/android/values-night/*.xml recursos Android (tema oscuro)
//
// Uso: node build.mjs   (o `npm run build`)
//
// Regla de nombres: `--sh-` + ruta del token con `-`, quitando el prefijo del
// grupo `color` (así `color.navy.700` → `--sh-navy-700`). El resto conserva su
// grupo (`font.display` → `--sh-font-display`).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, "dist");
const SRC = join(ROOT, "tokens.json");

const doc = JSON.parse(readFileSync(SRC, "utf8"));
const brand = Object.fromEntries(
  Object.entries(doc.brand ?? {})
    .filter(([k]) => !k.startsWith("$") && doc.brand[k]?.$value !== undefined)
    .map(([k, v]) => [k, v.$value]),
);

const isToken = (n) => n && typeof n === "object" && !Array.isArray(n) && "$value" in n;

function flatten(node, path = [], inheritedType, out = []) {
  const type = node.$type ?? inheritedType;
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    if (isToken(child)) {
      out.push({
        path: [...path, key],
        type: child.$type ?? type,
        value: child.$value,
        description: child.$description,
      });
    } else if (child && typeof child === "object") {
      flatten(child, [...path, key], type, out);
    }
  }
  return out;
}

const SKIP_ROOTS = new Set(["theme", "brand"]);
const tokens = flatten(doc).filter((t) => !SKIP_ROOTS.has(t.path[0]));

// ---- resolución de alias {color.navy.700} ----
const byPath = new Map(tokens.map((t) => [t.path.join("."), t.value]));
function resolve(value, seen = new Set()) {
  if (typeof value !== "string") return value;
  return value.replace(/\{([^}]+)\}/g, (full, ref) => {
    if (seen.has(ref)) throw new Error(`Ciclo de alias en {${ref}}`);
    seen.add(ref);
    if (!byPath.has(ref)) throw new Error(`Alias sin destino: {${ref}}`);
    return resolve(byPath.get(ref), seen);
  });
}

// ---- nombres ----
function cssName(path) {
  const p = path[0] === "color" ? path.slice(1) : path;
  return `--sh-${p.join("-")}`;
}

const pxToNum = (v) => (typeof v === "string" && /^-?\d+(\.\d+)?px$/.test(v) ? Number(v.slice(0, -2)) : v);

// ---- tokens.css ----
const groups = new Map();
for (const t of tokens) {
  const g = t.path[0];
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push(t);
}
const order = ["color", "gradient", "font", "radius", "space"];
const rootLines = [];
for (const g of order) {
  const list = groups.get(g) ?? [];
  if (!list.length) continue;
  rootLines.push(`  /* ${g} */`);
  for (const t of list) rootLines.push(`  ${cssName(t.path)}: ${resolve(t.value)};`);
}
// alias histórico
rootLines.push("  /* alias */", "  --sh-gradient: var(--sh-gradient-brand);");

function themeBlock(themeName) {
  const theme = doc.theme?.[themeName] ?? {};
  const lines = [`[data-theme="sh-${themeName}"], .sh-${themeName} {`];
  for (const [k, v] of Object.entries(theme)) {
    if (k.startsWith("$") || !v?.$value) continue;
    lines.push(`  --sh-${k}: ${resolve(v.$value)};`);
  }
  lines.push("}");
  return lines.join("\n");
}

const css = `/* SolversHub — Design Tokens (GENERADO por build.mjs — NO EDITAR A MANO)
 * Fuente: tokens.json · v${brand.version ?? "?"} · ${brand.product} (${brand.company})
 * Tema oscuro por defecto: usar .sh-dark / [data-theme="sh-dark"] en un ancestro. */
:root {
${rootLines.join("\n")}
}

${themeBlock("dark")}

${themeBlock("light")}
`;

writeFileSync(join(ROOT, "tokens.css"), css);

// ---- dist/tailwind-theme.css (Tailwind v4) ----
const tw = `/* SolversHub — mapeo @theme para Tailwind v4 (GENERADO).
 * Los utilitarios (bg-surface, text-body, font-display…) referencian var(--sh-*),
 * así que cambiar de tema en un ancestro (.sh-dark/.sh-light) los actualiza. */
@theme inline {
  --color-bg: var(--sh-bg);
  --color-bg-deep: var(--sh-bg-deep);
  --color-surface: var(--sh-surface);
  --color-surface-2: var(--sh-surface-2);
  --color-surface-raised: var(--sh-surface-raised);
  --color-border: var(--sh-border);
  --color-border-soft: var(--sh-border-soft);
  --color-border-strong: var(--sh-border-strong);
  --color-control-border: var(--sh-control-border);
  --color-headline: var(--sh-text);
  --color-text-strong: var(--sh-text-strong);
  --color-body: var(--sh-text-muted);
  --color-text-soft: var(--sh-text-soft);
  --color-hover: var(--sh-hover);
  --color-overlay: var(--sh-overlay);
  --color-link: var(--sh-link);

  --color-primary: var(--sh-navy-700);
  --color-primary-hover: var(--sh-navy-600);
  --color-blue: var(--sh-blue-500);
  --color-accent: var(--sh-cyan-400);
  --color-gold: var(--sh-gold-500);
  --color-success: var(--sh-success);
  --color-warning: var(--sh-warning);
  --color-danger: var(--sh-danger);

  --font-display: var(--sh-font-display);
  --font-sans: var(--sh-font-body);
  --font-mono: var(--sh-font-mono);

  --radius-sm: var(--sh-radius-sm);
  --radius-md: var(--sh-radius-md);
  --radius-lg: var(--sh-radius-lg);
  --radius-pill: var(--sh-radius-pill);
}
`;

// ---- dist/theme.ts (React Native) ----
const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
function toObj(list, keyFn, valueFn) {
  const o = {};
  for (const t of list) {
    const k = keyFn(t);
    o[k] = valueFn(t);
  }
  return o;
}
const colorObj = {};
for (const t of tokens.filter((t) => t.path[0] === "color")) {
  const p = t.path.slice(1);
  let node = colorObj;
  for (let i = 0; i < p.length - 1; i++) node = node[p[i]] ??= {};
  node[camel(p[p.length - 1])] = resolve(t.value);
}
const themeObj = {};
for (const name of ["dark", "light"]) {
  themeObj[name] = toObj(
    Object.entries(doc.theme?.[name] ?? {}).filter(([k, v]) => !k.startsWith("$") && v?.$value).map(([k, v]) => ({ k, value: v.$value })),
    (t) => camel(t.k),
    (t) => resolve(t.value),
  );
}
const dimObj = (group) =>
  toObj(
    tokens.filter((t) => t.path[0] === group),
    (t) => camel(t.path.slice(1).join("-")),
    (t) => pxToNum(resolve(t.value)),
  );

const ts = `// SolversHub — tema React Native (GENERADO por build.mjs — NO EDITAR).
import type { TextStyle } from "react-native";

export const shBrand = ${JSON.stringify(brand, null, 2)} as const;

export const shColor = ${JSON.stringify(colorObj, null, 2)} as const;

export const shFont = {
  display: ${JSON.stringify(resolve(doc.font.display.$value))},
  body: ${JSON.stringify(resolve(doc.font.body.$value))},
  mono: ${JSON.stringify(resolve(doc.font.mono.$value))},
} as const satisfies Record<string, TextStyle["fontFamily"]>;

export const shRadius = ${JSON.stringify(dimObj("radius"), null, 2)} as const;
export const shSpace = ${JSON.stringify(dimObj("space"), null, 2)} as const;

export const shTheme = ${JSON.stringify(themeObj, null, 2)} as const;

export type ShThemeName = keyof typeof shTheme;
export type ShTheme = (typeof shTheme)[ShThemeName];
`;

// ---- dist/android ----
function androidColorName(name) {
  return `sh_${name.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase()}`;
}
// Android no acepta rgba(); los recursos de color usan #AARRGGBB.
function toAndroidColor(value) {
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+)\s*)?\)$/.exec(value);
  if (!m) return value;
  const hex = (n) => Number(n).toString(16).padStart(2, "0").toUpperCase();
  const alpha = m[4] === undefined ? 255 : Math.round(Number(m[4]) * 255);
  return `#${hex(alpha)}${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
}
function androidXml(themeName) {
  const theme = doc.theme?.[themeName] ?? {};
  const lines = ['<?xml version="1.0" encoding="utf-8"?>', "<resources>"];
  for (const [k, v] of Object.entries(theme)) {
    if (k.startsWith("$") || !v?.$value) continue;
    lines.push(`  <color name="${androidColorName(k)}">${toAndroidColor(resolve(v.$value))}</color>`);
  }
  for (const t of tokens.filter((t) => t.path[0] === "color")) {
    lines.push(`  <color name="${androidColorName(t.path.slice(1).join("-"))}">${toAndroidColor(resolve(t.value))}</color>`);
  }
  lines.push("</resources>", "");
  return lines.join("\n");
}

mkdirSync(join(DIST, "android", "values-night"), { recursive: true });
writeFileSync(join(DIST, "tailwind-theme.css"), tw);
writeFileSync(join(DIST, "theme.ts"), ts);
writeFileSync(join(DIST, "android", "colors.xml"), androidXml("light"));
writeFileSync(join(DIST, "android", "values-night", "colors.xml"), androidXml("dark"));

console.log(`✓ tokens.css · ${tokens.length} tokens`);
console.log("✓ dist/tailwind-theme.css · dist/theme.ts · dist/android/{colors.xml,values-night/colors.xml}");
