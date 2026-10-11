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
// Uso: node build.mjs   (o `npm run build`). El contraste se verifica aparte con
// `node contrast.mjs` (lo corre el CI).
//
// v1.4 (SPEC-29, HU-DS-01): estados con AA por tema, paleta de datos, CTA,
// tipografía (web en CSS, app en RN), elevación, motion, densidad y breakpoints.
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

// Valores compuestos (typography) resuelven sus alias campo por campo.
function resolveDeep(value) {
  if (Array.isArray(value)) return value.map(resolveDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveDeep(v)]));
  }
  return resolve(value);
}

// ---- nombres ----
function cssName(path) {
  const p = path[0] === "color" ? path.slice(1) : path;
  return `--sh-${p.join("-")}`;
}

const pxToNum = (v) => (typeof v === "string" && /^-?\d+(\.\d+)?px$/.test(v) ? Number(v.slice(0, -2)) : v);
const msToNum = (v) => (typeof v === "string" && /^\d+(\.\d+)?ms$/.test(v) ? Number(v.slice(0, -2)) : v);
const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function cssValue(t) {
  const v = resolveDeep(t.value);
  if (t.type === "cubicBezier") return `cubic-bezier(${v.join(", ")})`;
  return v;
}

// ---- tokens.css ----
const groups = new Map();
for (const t of tokens) {
  const g = t.path[0];
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push(t);
}
const order = ["color", "gradient", "font", "radius", "space", "density", "motion", "breakpoint"];
const rootLines = [];
for (const g of order) {
  const list = groups.get(g) ?? [];
  if (!list.length) continue;
  rootLines.push(`  /* ${g} */`);
  for (const t of list) rootLines.push(`  ${cssName(t.path)}: ${cssValue(t)};`);
}
// Tipografía web: cada rol se abre en sus propiedades (--sh-type-h1-font-size…).
// `type.app` es solo del tema React Native.
const typeWeb = (groups.get("type") ?? []).filter((t) => t.path[1] === "web");
if (typeWeb.length) {
  rootLines.push("  /* type (web) */");
  for (const t of typeWeb) {
    for (const [prop, v] of Object.entries(resolveDeep(t.value))) {
      rootLines.push(`  --sh-type-${t.path[2]}-${kebab(prop)}: ${v};`);
    }
  }
}
// alias histórico
rootLines.push("  /* alias */", "  --sh-gradient: var(--sh-gradient-brand);");

const themeEntries = (themeName) =>
  Object.entries(doc.theme?.[themeName] ?? {}).filter(([k, v]) => !k.startsWith("$") && v?.$value);

function themeBlock(themeName) {
  const lines = [`[data-theme="sh-${themeName}"], .sh-${themeName} {`];
  for (const [k, v] of themeEntries(themeName)) lines.push(`  --sh-${k}: ${resolve(v.$value)};`);
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
// v1.4 (SPEC-29): estados con AA, datos, elevación, motion y escala tipográfica.
// Los tamaños usan el prefijo `sh-` (text-sh-h1…) para no chocar con colores como `text-body`.
const STATUS = ["success", "warning", "danger", "info"];
const twLines = ["  /* estados con AA por tema: text-status-*-fg, bg-status-*-bg, border-status-*-border */"];
for (const s of STATUS) {
  for (const part of ["fg", "bg", "border"]) twLines.push(`  --color-status-${s}-${part}: var(--sh-status-${s}-${part});`);
}
twLines.push("", "  /* datos (orden fijo, nunca se cicla) */");
for (const i of [1, 2, 3, 4]) twLines.push(`  --color-data-${i}: var(--sh-data-cat-${i});`);
twLines.push("  --color-data-single: var(--sh-data-single);");
for (const i of [1, 2, 3, 4, 5]) twLines.push(`  --color-data-seq-${i}: var(--sh-data-seq-${i});`);
twLines.push("  --color-data-grid: var(--sh-data-grid);", "  --color-data-axis: var(--sh-data-axis);");
twLines.push("", "  /* elevación: shadow-elev-0…3 */");
for (const i of [0, 1, 2, 3]) twLines.push(`  --shadow-elev-${i}: var(--sh-elev-${i});`);
twLines.push("", "  /* motion: ease-sh-out/in/emphasized; `transition` usa fast + out por defecto */");
for (const e of ["out", "in", "emphasized"]) twLines.push(`  --ease-sh-${e}: var(--sh-motion-easing-${e});`);
twLines.push(
  "  --default-transition-duration: var(--sh-motion-duration-fast);",
  "  --default-transition-timing-function: var(--sh-motion-easing-out);",
);
twLines.push("", "  /* tipografía: text-sh-hero, text-sh-h1… (la familia va aparte: font-display / font-sans) */");
for (const t of typeWeb) {
  const r = t.path[2];
  twLines.push(
    `  --text-sh-${r}: var(--sh-type-${r}-font-size);`,
    `  --text-sh-${r}--line-height: var(--sh-type-${r}-line-height);`,
    `  --text-sh-${r}--font-weight: var(--sh-type-${r}-font-weight);`,
  );
}
const TAILWIND_V2 = twLines.join("\n") + "\n";

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

${TAILWIND_V2}
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
    themeEntries(name).map(([k, v]) => ({ k, value: v.$value })),
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

// Motion para RN: duraciones en ms (número) y curvas como [x1, y1, x2, y2] (Easing.bezier).
const motionObj = { duration: {}, easing: {} };
for (const t of groups.get("motion") ?? []) {
  const [, kind, name] = t.path;
  motionObj[kind][camel(name)] = kind === "duration" ? msToNum(resolve(t.value)) : resolveDeep(t.value);
}

// Tipografía de la app: en RN cada peso es una familia distinta (las que carga App.tsx
// con @expo-google-fonts). La referencia {font.x} decide la familia.
const RN_FONTS = {
  display: { 600: "Montserrat_600SemiBold", 700: "Montserrat_700Bold" },
  body: { 400: "Inter_400Regular", 500: "Inter_500Medium" },
  mono: { 400: "monospace" },
};
const typeAppObj = {};
for (const t of (groups.get("type") ?? []).filter((t) => t.path[1] === "app")) {
  const raw = t.value;
  const fontKey = /^\{font\.(\w+)\}$/.exec(raw.fontFamily)?.[1];
  const family = RN_FONTS[fontKey]?.[raw.fontWeight];
  if (!family) throw new Error(`type.app.${t.path[2]}: sin familia RN para ${raw.fontFamily} ${raw.fontWeight}`);
  typeAppObj[camel(t.path[2])] = {
    fontFamily: family,
    fontSize: pxToNum(raw.fontSize),
    lineHeight: pxToNum(raw.lineHeight),
  };
}

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
export const shDensity = ${JSON.stringify(dimObj("density"), null, 2)} as const;

/** Duraciones en ms y curvas [x1, y1, x2, y2] para Easing.bezier. Con reducir movimiento, usar 0. */
export const shMotion = ${JSON.stringify(motionObj, null, 2)} as const;

/** Escala tipográfica de la app (la familia ya trae el peso: Montserrat_700Bold…). */
export const shType = ${JSON.stringify(typeAppObj, null, 2)} as const satisfies Record<string, TextStyle>;

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
  const lines = ['<?xml version="1.0" encoding="utf-8"?>', "<resources>"];
  for (const [k, v] of themeEntries(themeName)) {
    // Solo colores: las sombras (elev-*) no son recursos de color.
    if (v.$type && v.$type !== "color") continue;
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
