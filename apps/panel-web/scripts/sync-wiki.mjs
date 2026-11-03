#!/usr/bin/env node
// Incorpora la Wiki de SolversHub (Markdown) al panel para la ruta /ayuda.
//
// Fuente única: solvershub/solvershub-wiki/docs/**/*.md (la orden y los títulos de sección salen de
// su mkdocs.yml). Aquí NO se copia Markdown: se renderiza a HTML saneado (lib/ayuda/render.ts) y se
// escribe UN módulo generado, lib/ayuda/contenido.generado.json, que el panel importa en el
// servidor. En runtime el panel no lee el disco de la wiki.
//
// El JSON generado SE VERSIONA (igual que app/tokens.css): el build de la imagen (Dockerfile,
// contexto apps/panel-web) no tiene el repositorio de la wiki a mano. Cuando cambie la wiki:
//
//   npm run wiki:sync                      (usa ../../../solvershub-wiki, o WIKI_DIR)
//   node scripts/sync-wiki.mjs <ruta-a-solvershub-wiki>
//   npm run wiki:sync -- --check           (falla si lo versionado no coincide con la wiki)
//
// `--check` necesita la wiki en disco, por eso no corre en el CI del panel (no la tiene): se corre
// a mano o desde el flujo de la wiki antes de abrir el PR.
//
// Falla (código 1) si una página no tiene `titulo` o `acceso` válido, si un enlace .md no existe, o
// si una página enlaza a otra de nivel superior (el lector no la vería).

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const comprobar = args.includes("--check");
const posicional = args.find((a) => !a.startsWith("--"));
const wiki = resolve(posicional ?? process.env.WIKI_DIR ?? join(ROOT, "..", "..", "..", "solvershub-wiki"));
const docs = join(wiki, "docs");
const destino = join(ROOT, "lib", "ayuda", "contenido.generado.json");

const { renderizarMarkdown, leerFrontmatter } = await import("../lib/ayuda/render.ts");

if (!existsSync(docs)) {
  console.error(`✗ No existe ${docs}. Pasa la ruta de solvershub-wiki o define WIKI_DIR.`);
  process.exit(1);
}

const NIVELES = { usuario: 0, administrador: 1, tecnico: 2 };
const TIPOS_DE_IMAGEN = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp" };
const MAX_IMAGEN = 400 * 1024;

function listarMarkdown(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listarMarkdown(join(dir, e.name)) : e.name.endsWith(".md") ? [join(dir, e.name)] : [],
  );
}

/** Sección y orden de cada página, según el nav de mkdocs.yml. */
function leerNav() {
  const ruta = join(wiki, "mkdocs.yml");
  const mapa = new Map();
  if (!existsSync(ruta)) return mapa;
  const lineas = readFileSync(ruta, "utf8").split("\n");
  const desde = lineas.findIndex((l) => l.startsWith("nav:"));
  let seccion = "";
  let orden = 0;
  for (const linea of lineas.slice(desde + 1)) {
    const grupo = /^ {2}- "([^"]+)":\s*$/.exec(linea);
    if (grupo) {
      seccion = grupo[1];
      continue;
    }
    const pagina = /^\s+- "([^"]+)":\s*(\S+\.md)\s*$/.exec(linea);
    if (!pagina) continue;
    const esPortada = pagina[2] === "index.md";
    mapa.set(pagina[2], { seccion: esPortada ? "" : seccion, orden: orden++ });
  }
  return mapa;
}

function imagen(rutaEnDocs, avisos) {
  const archivo = join(docs, rutaEnDocs);
  const tipo = TIPOS_DE_IMAGEN[extname(archivo).toLowerCase()];
  if (!tipo || !existsSync(archivo) || !statSync(archivo).isFile()) return null;
  const bytes = readFileSync(archivo);
  if (bytes.length > MAX_IMAGEN) avisos.push(`imagen pesada (${Math.round(bytes.length / 1024)} KB): ${rutaEnDocs}`);
  return `data:${tipo};base64,${bytes.toString("base64")}`;
}

const archivos = listarMarkdown(docs).sort();
const rutas = new Set(archivos.map((a) => relative(docs, a).split("\\").join("/")));
const nav = leerNav();
const errores = [];
const avisosGlobales = [];
const paginas = [];

for (const archivo of archivos) {
  const ruta = relative(docs, archivo).split("\\").join("/");
  const texto = readFileSync(archivo, "utf8");
  const fm = leerFrontmatter(texto);
  if (!fm.titulo) errores.push(`${ruta}: falta \`titulo\` en el frontmatter`);
  if (!(fm.acceso in NIVELES)) errores.push(`${ruta}: \`acceso\` inválido (${fm.acceso ?? "vacío"}); usuario | administrador | tecnico`);
  const avisos = [];
  const { html, enlaces, avisos: deRender } = await renderizarMarkdown(texto, {
    ruta,
    paginas: rutas,
    resolverImagen: (r) => imagen(r, avisos),
  });
  for (const a of [...deRender, ...avisos]) (a.startsWith("enlace") ? errores : avisosGlobales).push(`${ruta}: ${a}`);
  paginas.push({ ruta, fm, html, enlaces });
}

// Una página no puede enlazar a una de nivel superior: su lector no vería el destino.
const nivelDe = new Map(paginas.map((p) => [p.ruta, NIVELES[p.fm.acceso]]));
for (const p of paginas) {
  for (const destinoEnlace of p.enlaces) {
    if ((nivelDe.get(destinoEnlace) ?? 0) > (nivelDe.get(p.ruta) ?? 0)) {
      errores.push(`${p.ruta}: enlaza a ${destinoEnlace}, de un nivel de acceso superior`);
    }
  }
}

if (errores.length) {
  console.error(`✗ ${errores.length} problema(s) en la wiki:\n${errores.map((e) => `  - ${e}`).join("\n")}`);
  process.exit(1);
}
for (const a of avisosGlobales) console.warn(`! ${a}`);

const salida = paginas
  .map(({ ruta, fm, html }) => {
    const sinMd = ruta.replace(/\.md$/, "");
    const info = nav.get(ruta);
    return {
      ruta,
      slug: sinMd === "index" ? "" : sinMd,
      titulo: fm.titulo,
      proposito: fm.proposito ?? "",
      publico: fm.publico ?? "",
      acceso: fm.acceso,
      seccion: info?.seccion ?? "",
      orden: info?.orden ?? 10_000,
      html,
    };
  })
  .sort((a, b) => a.orden - b.orden || (a.ruta < b.ruta ? -1 : 1));

const json = `${JSON.stringify({ paginas: salida }, null, 1)}\n`;

if (comprobar) {
  const actual = existsSync(destino) ? readFileSync(destino, "utf8") : "";
  if (actual !== json) {
    console.error("✗ lib/ayuda/contenido.generado.json no coincide con la wiki. Corre: npm run wiki:sync");
    process.exit(1);
  }
  console.log(`✓ contenido.generado.json al día (${salida.length} páginas)`);
} else {
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, json);
  const porNivel = Object.fromEntries(Object.keys(NIVELES).map((n) => [n, salida.filter((p) => p.acceso === n).length]));
  console.log(`✓ ${destino} — ${salida.length} páginas ${JSON.stringify(porNivel)}, ${(json.length / 1024).toFixed(0)} KB`);
}
