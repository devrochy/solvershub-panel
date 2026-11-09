#!/usr/bin/env node
// Compila el kit del panel para el sistema de diseño de SolversHub (artifact «Design System»).
//
// Genera, en build/design-system/project/components/:
//   - bundle.js   un solo script clásico que asigna window.SolversHub (componentes reales de
//                 components/ui, dataviz y templates), leyendo window.React y window.ReactDOM.
//   - bundle.css  el CSS que Tailwind v4 genera para esos componentes, con el @theme de
//                 app/globals.css. NO incluye tokens.css: los valores salen de tokens.json del
//                 sistema, así un token editado en la página cambia las vistas previas.
//   - lib/        React y ReactDOM de node_modules (19.x ya no publica builds UMD).
//   - <Comp>/preview.html  copiadas de scripts/design-system/previews/.
//
// Uso: npm run design-system:build   (o `node scripts/design-system/build.mjs [carpeta-de-salida]`)
// Después se publican esos archivos al artifact (ver README.md de esta carpeta).

import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

const AQUI = dirname(fileURLToPath(import.meta.url));
const PANEL = resolve(AQUI, "..", "..");
const SALIDA = resolve(process.argv[2] ?? join(PANEL, "build", "design-system"), "project", "components");
const PREVIEWS = join(AQUI, "previews");
const require = createRequire(join(PANEL, "package.json"));

// Orden de las tarjetas en el sistema (los niveles del kit de DESIGN.md). AppShell no va:
// su vista previa es marcado estático porque la barra real necesita sesión y permisos.
const ORDEN = [
  "Button", "Badge", "Card", "Avatar", "Kbd", "Skeleton", "Select", "Textarea", "InputPassword", "InputNumero",
  "Checkbox", "RadioGroup", "Switch", "ThemeSwitch", "Tooltip", "Separator", "IconAction",
  "Field", "SearchInput", "Breadcrumbs", "Tabs", "TabLinks", "FilterChips", "DropdownMenu", "Popover", "KpiTile",
  "EmptyState", "Pagination", "FormFeedback", "UsageBar", "Progress", "Stepper", "Dropzone", "ListaDeFrases",
  "SelectConIcono", "CampoTelefono",
  "DataTable", "Dialog", "Confirm", "Sheet", "Toaster", "PageHeader",
  "Sparkline", "LineChart", "BarChart", "ProgressRing",
  "ListPage", "DetailPage", "DashboardPage", "SettingsPage",
];

const FUENTES =
  '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400&family=Montserrat:wght@600;700&display=swap");';

const GLOBALES = {
  react: "window.React",
  "react-dom": "window.ReactDOM",
  "react-dom/client": "window.ReactDOM",
};

/** Resuelve @/…, cambia next/link y next/navigation por shims y lee React de window. */
const resolverDelPanel = {
  name: "panel",
  setup(b) {
    b.onResolve({ filter: /^@\// }, (a) => b.resolve("./" + a.path.slice(2), { resolveDir: PANEL, kind: a.kind }));
    b.onResolve({ filter: /^next\/link$/ }, () => ({ path: join(AQUI, "shims", "next-link.mjs") }));
    b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: join(AQUI, "shims", "next-navigation.mjs") }));
    b.onResolve({ filter: /^(react|react-dom|react-dom\/client|react\/jsx-runtime|react\/jsx-dev-runtime)$/ }, (a) => ({
      path: a.path,
      namespace: "global",
    }));
    b.onLoad({ filter: /.*/, namespace: "global" }, (a) => {
      if (a.path.startsWith("react/jsx")) {
        // El runtime de JSX sobre createElement (children ya viene dentro de props).
        return {
          contents: `const R = window.React;
function jsx(type, props, key) { return R.createElement(type, key === undefined ? props : { ...props, key }); }
module.exports = { jsx, jsxs: jsx, jsxDEV: jsx, Fragment: R.Fragment };`,
          loader: "js",
        };
      }
      return { contents: `module.exports = ${GLOBALES[a.path]};`, loader: "js" };
    });
  },
};

const comun = {
  bundle: true,
  format: "iife",
  minify: true,
  platform: "browser",
  target: "es2020",
  define: { "process.env.NODE_ENV": '"production"' },
  nodePaths: [join(PANEL, "node_modules")],
  logLevel: "warning",
  write: false,
};

/** Un script no puede llevar estas secuencias: quien lo use lo pega dentro de <script>. */
function sinCierres(nombre, texto) {
  if (/<\/script|<!--/i.test(texto)) throw new Error(`${nombre} contiene </script o <!--`);
  return texto;
}

async function bundle() {
  const r = await esbuild.build({
    ...comun,
    entryPoints: [join(AQUI, "entrada.mjs")],
    globalName: "SolversHub",
    jsx: "automatic",
    legalComments: "none",
    tsconfig: join(PANEL, "tsconfig.json"),
    plugins: [resolverDelPanel],
  });
  const js = r.outputFiles[0].text.replace("var SolversHub=", () => "window.SolversHub=");
  const cabecera = { format: 4, namespace: "SolversHub", components: ORDEN.map((name) => ({ name })) };
  return sinCierres("bundle.js", `/* @ds-bundle: ${JSON.stringify(cabecera)} */\n${js}`);
}

async function libreria(contenido, conReactGlobal) {
  const r = await esbuild.build({
    ...comun,
    stdin: { contents: contenido, resolveDir: PANEL, loader: "js" },
    legalComments: "eof",
    plugins: conReactGlobal
      ? [
          {
            name: "react-global",
            setup(b) {
              b.onResolve({ filter: /^react$/ }, () => ({ path: "react", namespace: "global" }));
              b.onLoad({ filter: /.*/, namespace: "global" }, () => ({ contents: "module.exports = window.React;", loader: "js" }));
            },
          },
        ]
      : [],
  });
  return r.outputFiles[0].text;
}

/** Lo que tokens.json no publica como variables: escala tipográfica (va como clases) y motion. */
function variablesExtra() {
  const css = readFileSync(join(PANEL, "app", "tokens.css"), "utf8");
  const inicio = css.indexOf(":root {");
  const raiz = css.slice(inicio, css.indexOf("}", inicio));
  const lineas = raiz
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^--sh-(type|motion|font)-/.test(l))
    .map((l) => {
      const familia = /^--sh-font-(display|body|mono):/.exec(l);
      if (familia) return `--sh-font-${familia[1]}: var(--font-${familia[1]});`;
      const tipo = /^(--sh-type-([a-z0-9]+)-font-family):/.exec(l);
      if (tipo) {
        const f = tipo[2] === "mono" ? "mono" : ["hero", "h1", "block"].includes(tipo[2]) ? "display" : "body";
        return `${tipo[1]}: var(--sh-font-${f});`;
      }
      return l;
    });
  return `/* Valores del panel que tokens.json no publica como variables (escala tipográfica y motion). Las familias apuntan a las de tokens.json. */
:root {
  ${lineas.join("\n  ")}
  --sh-gradient: var(--sh-gradient-brand);
}

/* El logo cambia de tinta con el tema (components/ui/marca.tsx). */
[data-theme="light"] .marca-tema-oscuro, [data-theme="dark"] .marca-tema-claro { display: none; }
`;
}

async function estilos() {
  const postcss = require("postcss");
  const tailwind = require("@tailwindcss/postcss");
  const globals = readFileSync(join(PANEL, "app", "globals.css"), "utf8");
  // El @theme, las utilidades y la base de globals.css, hasta el centro de notificaciones.
  // Los temas del sistema se llaman dark y light (el panel usa sh-dark y sh-light).
  const base = globals
    .slice(0, globals.indexOf("/* Centro de notificaciones"))
    .replace('@import "tailwindcss";', "")
    .replace('@import "./tokens.css";', "")
    .replaceAll('[data-theme="sh-dark"]', '[data-theme="dark"]')
    .replaceAll('[data-theme="sh-light"]', '[data-theme="light"]');
  const entrada = `@import "tailwindcss" source(none);
@source "${PANEL}/components/ui";
@source "${PANEL}/components/dataviz";
@source "${PANEL}/components/templates";
@source "${PANEL}/components/shell/navegacion-de-pagina.tsx";
@source "${PANEL}/components/shell/titulo-de-pagina.tsx";
@source "${PANEL}/app/(app)/_components/section-help-button.tsx";
@source "${PREVIEWS}";
${base}
${variablesExtra()}`;
  const r = await postcss([tailwind({ base: PANEL, optimize: { minify: true } })]).process(entrada, {
    from: join(PANEL, "__design-system.css"),
  });
  const css = `${FUENTES}\n/* SolversHub: el CSS que Tailwind v4 genera para el kit del panel, con el @theme de app/globals.css. Los valores vienen de tokens.json. */\n${r.css}`;
  if (/<\/style/i.test(css)) throw new Error("bundle.css contiene </style");
  return css;
}

function escribir(ruta, texto) {
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, texto);
  console.log(`✓ ${ruta} (${(Buffer.byteLength(texto) / 1024).toFixed(0)} KB)`);
}

const previews = readdirSync(PREVIEWS).filter((f) => f.endsWith(".html"));
const conBundle = previews.map((f) => basename(f, ".html")).filter((c) => c !== "AppShell");
const sobran = conBundle.filter((c) => !ORDEN.includes(c));
const faltan = ORDEN.filter((c) => !conBundle.includes(c));
if (sobran.length || faltan.length) {
  throw new Error(`ORDEN y previews/ no coinciden. Sin orden: ${sobran.join(", ") || "—"}. Sin vista previa: ${faltan.join(", ") || "—"}`);
}

escribir(join(SALIDA, "bundle.js"), await bundle());
escribir(join(SALIDA, "bundle.css"), await estilos());
escribir(
  join(SALIDA, "lib", "react.production.min.js"),
  sinCierres("react", await libreria('window.React = require("react");', false)),
);
escribir(
  join(SALIDA, "lib", "react-dom.production.min.js"),
  sinCierres(
    "react-dom",
    await libreria('window.ReactDOM = Object.assign({}, require("react-dom"), require("react-dom/client"));', true),
  ),
);
for (const f of previews) {
  const destino = join(SALIDA, basename(f, ".html"), "preview.html");
  mkdirSync(dirname(destino), { recursive: true });
  copyFileSync(join(PREVIEWS, f), destino);
}
console.log(`✓ ${previews.length} vistas previas · React ${require("react/package.json").version}`);
