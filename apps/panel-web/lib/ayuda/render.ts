/**
 * Render de la Wiki (Markdown → HTML saneado). Solo lo usa el script `scripts/sync-wiki.mjs`
 * (en el build no se carga: el panel lee el HTML ya generado) y sus pruebas, por eso las
 * librerías de Markdown son devDependencies.
 *
 * Orden: Markdown → HTML crudo → SANEADO → transformaciones propias. El saneado va antes de
 * los retoques para que lo que añade este módulo (enlaces reescritos, imágenes en data URI,
 * `tabindex`) no pase por la lista blanca, y para que nada que venga del texto sobreviva
 * si no está en ella (scripts, manejadores `on*`, `javascript:`).
 */
import { posix } from "node:path";

import type { Element, Parent, Root } from "hast";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema, type Options as Esquema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";

// Este archivo lo carga Node directamente desde `scripts/sync-wiki.mjs` (sin compilar): no importa
// otros módulos locales, que necesitarían la extensión `.ts` en la ruta.

const BLOQUE_FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Quita el encabezado `---` de una página. */
export function quitarFrontmatter(texto: string): string {
  return texto.replace(BLOQUE_FRONTMATTER, "");
}

/** Pares `clave: valor` planos del encabezado de una página (sin anidar). */
export function leerFrontmatter(texto: string): Record<string, string> {
  const m = BLOQUE_FRONTMATTER.exec(texto);
  if (!m) return {};
  const campos: Record<string, string> = {};
  for (const linea of m[1].split(/\r?\n/)) {
    const i = linea.indexOf(":");
    if (i <= 0) continue;
    campos[linea.slice(0, i).trim()] = linea.slice(i + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  return campos;
}

export const PREFIJO_AYUDA = "/ayuda";

const ETIQUETA_DE_MERMAID = "diagrama (mermaid)";

/** Tipos de admonición (`!!! tipo "Título"`) y cómo se anuncian en español. */
export const ADMONICIONES = {
  info: "Información",
  note: "Nota",
  tip: "Consejo",
  warning: "Advertencia",
  danger: "Peligro",
} as const;
type TipoAdmonicion = keyof typeof ADMONICIONES;

export type OpcionesRender = {
  /** Ruta de la página dentro de `docs/` (`02-guia/01-x.md`): base de los enlaces relativos. */
  ruta: string;
  /**
   * Imagen de `docs/` (ruta relativa a `docs/`) → data URI, o null si no existe. Sin imagen, el
   * marcador `![captura: …](…)` se degrada a un recuadro con el texto alternativo.
   */
  resolverImagen?: (rutaEnDocs: string) => string | null;
  /** Rutas (`x/y.md`) de las páginas que existen: un enlace a otra se anota en `avisos`. */
  paginas?: ReadonlySet<string>;
  /** Fuente de un bloque `mermaid` → su imagen. Sin imagen, el bloque se queda como código. */
  dibujarDiagrama?: (fuente: string) => Promise<DiagramaDibujado | null>;
};

/** Un diagrama ya dibujado. `huella` identifica lo dibujado: permite reutilizarlo sin volver a dibujarlo. */
export type DiagramaDibujado = { huella: string; src: string; ancho: number; alto: number };

export type ResultadoRender = {
  html: string;
  /** Páginas a las que enlaza (rutas de `docs/`). */
  enlaces: string[];
  /** Problemas del contenido (enlace roto, imagen fuera de `docs/`…); el script los muestra. */
  avisos: string[];
};

/** Lista blanca de HTML: lo que el Markdown puede producir y nada más. */
const ESQUEMA: Esquema = {
  ...defaultSchema,
  // Los `id` de los títulos los pone `rehype-slug` después; los del texto se descartan.
  protocols: { ...defaultSchema.protocols, href: ["http", "https", "mailto"], src: [] },
  attributes: {
    ...defaultSchema.attributes,
    // Sin `id` ni `name` del texto (anclas que pisarían variables globales del navegador).
    "*": (defaultSchema.attributes?.["*"] ?? []).filter((a) => a !== "id" && a !== "name"),
    div: [["className", "admonition", ...Object.keys(ADMONICIONES)], ["role", "note"]],
    p: [["className", "admonition-title"]],
    code: [["className", /^language-[\w+#.-]+$/]],
    // Solo `src` y `alt`: `imagenes()` las sustituye enseguida por un data URI propio o un recuadro.
    img: ["src", "alt"],
  },
};

function esAbsoluto(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//");
}

function enHijos(nodo: Parent, i: number, reemplazo: Element[]): void {
  nodo.children.splice(i, 1, ...reemplazo);
}

/** Convierte los bloques `!!! tipo "Título"` (sangría de 4) en HTML, antes de leer el Markdown. */
export function expandirAdmoniciones(texto: string): string {
  const lineas = texto.split("\n");
  const salida: string[] = [];
  let valla: string | null = null;
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const vallaAqui = /^\s*(`{3,}|~{3,})/.exec(linea);
    if (vallaAqui) {
      const marca = vallaAqui[1];
      if (valla === null) valla = marca;
      else if (marca[0] === valla[0] && marca.length >= valla.length && /^\s*[`~]+\s*$/.test(linea)) valla = null;
    }
    const m = valla === null ? /^!!!\s+(\w+)(?:\s+"([^"]*)")?\s*$/.exec(linea) : null;
    if (!m || !(m[1] in ADMONICIONES)) {
      salida.push(linea);
      continue;
    }
    const tipo = m[1] as TipoAdmonicion;
    const cuerpo: string[] = [];
    let j = i + 1;
    while (j < lineas.length && (lineas[j].trim() === "" || /^( {4}|\t)/.test(lineas[j]))) {
      cuerpo.push(lineas[j].replace(/^( {4}|\t)/, ""));
      j++;
    }
    while (cuerpo.length && cuerpo[cuerpo.length - 1].trim() === "") cuerpo.pop();
    const titulo = m[2] ? ` ${escaparHtml(m[2])}` : "";
    salida.push(
      "",
      `<div class="admonition ${tipo}" role="note">`,
      "",
      `<p class="admonition-title"><strong>${ADMONICIONES[tipo]}:</strong>${titulo}</p>`,
      "",
      ...cuerpo,
      "",
      "</div>",
      "",
    );
    i = j - 1;
  }
  return salida.join("\n");
}

function escaparHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Reescribe los `.md` relativos a `/ayuda/...`, resuelve imágenes y da a tablas y código su rol accesible. */
function retoques(opciones: OpcionesRender, salida: { enlaces: Set<string>; avisos: string[] }) {
  const base = posix.dirname(opciones.ruta);
  return () => (arbol: Root) => {
    visit(arbol, "element", (nodo: Element, indice, padre) => {
      if (nodo.tagName === "a" && typeof nodo.properties.href === "string") {
        const href = nodo.properties.href;
        if (esAbsoluto(href)) {
          nodo.properties.rel = ["noopener", "noreferrer"];
          return;
        }
        const almohadilla = href.indexOf("#");
        const ruta = almohadilla < 0 ? href : href.slice(0, almohadilla);
        const fragmento = almohadilla < 0 ? "" : href.slice(almohadilla + 1);
        if (!ruta) return; // ancla dentro de la misma página
        if (!ruta.endsWith(".md")) return;
        const destino = posix.normalize(posix.join(base, ruta));
        if (destino.startsWith("..")) {
          salida.avisos.push(`enlace fuera de docs/: ${href}`);
          return;
        }
        if (opciones.paginas && !opciones.paginas.has(destino)) salida.avisos.push(`enlace roto: ${href} → ${destino}`);
        salida.enlaces.add(destino);
        nodo.properties.href = rutaDePagina(destino) + (fragmento ? `#${fragmento}` : "");
        return;
      }

      if (nodo.tagName === "table" && padre && typeof indice === "number") {
        visit(nodo, "element", (hijo: Element) => {
          if (hijo.tagName === "th") hijo.properties.scope = hijo.properties.scope ?? "col";
        });
        const envoltura: Element = {
          type: "element",
          tagName: "div",
          properties: { className: ["ayuda-tabla"], tabIndex: 0, role: "region", ariaLabel: "Tabla desplazable" },
          children: [nodo],
        };
        // Sin "skip": los enlaces dentro de las celdas también se reescriben.
        enHijos(padre as Parent, indice, [envoltura]);
        return;
      }

      if (nodo.tagName === "pre") {
        const code = nodo.children.find((h): h is Element => h.type === "element" && h.tagName === "code");
        const clase = code && Array.isArray(code.properties.className) ? String(code.properties.className[0] ?? "") : "";
        const lenguaje = clase.replace(/^language-/, "");
        nodo.properties.tabIndex = 0;
        if (lenguaje) nodo.properties.dataLang = lenguaje === "mermaid" ? ETIQUETA_DE_MERMAID : lenguaje;
        return "skip";
      }
    });
  };
}

/** `a/b/c.md` → `/ayuda/a/b/c`; `index.md` → `/ayuda`. */
export function rutaDePagina(ruta: string): string {
  const sinMd = ruta.replace(/\.md$/, "");
  return sinMd === "index" ? PREFIJO_AYUDA : `${PREFIJO_AYUDA}/${sinMd}`;
}

/**
 * Imágenes: la del texto nunca se carga tal cual. Si existe en `docs/assets/` se incrusta como
 * data URI (así la página sigue protegida por la sesión, a diferencia de `public/`); si no, o si
 * es remota, se degrada a un recuadro con el texto alternativo.
 */
function imagenes(opciones: OpcionesRender, salida: { avisos: string[] }) {
  const base = posix.dirname(opciones.ruta);
  return () => (arbol: Root) => {
    visit(arbol, "element", (nodo: Element, indice, padre) => {
      if (nodo.tagName !== "img" || !padre || typeof indice !== "number") return;
      const alt = String(nodo.properties.alt ?? "").trim();
      const src = String(nodo.properties.src ?? "");
      let dataUri: string | null = null;
      if (src && !esAbsoluto(src)) {
        const enDocs = posix.normalize(posix.join(base, src));
        if (enDocs.startsWith("..")) salida.avisos.push(`imagen fuera de docs/: ${src}`);
        else dataUri = opciones.resolverImagen?.(enDocs) ?? null;
      } else if (src) {
        salida.avisos.push(`imagen remota (no se carga): ${src}`);
      }
      const reemplazo: Element = dataUri
        ? {
            type: "element",
            tagName: "img",
            properties: { src: dataUri, alt, loading: "lazy", className: ["ayuda-imagen"] },
            children: [],
          }
        : {
            type: "element",
            tagName: "figure",
            properties: { className: ["ayuda-captura-pendiente"] },
            children: [
              { type: "element", tagName: "strong", properties: {}, children: [{ type: "text", value: "Captura pendiente" }] },
              { type: "element", tagName: "figcaption", properties: {}, children: [{ type: "text", value: alt || "Sin descripción" }] },
            ],
          };
      enHijos(padre as Parent, indice, [reemplazo]);
    });
  };
}

function textoDe(nodo: Element | Element["children"][number]): string {
  if (nodo.type === "text") return nodo.value;
  return nodo.type === "element" ? nodo.children.map(textoDe).join("") : "";
}

/**
 * Sustituye cada bloque `mermaid` por su imagen, en una zona desplazable porque estos diagramas
 * son más anchos que la columna. El código sigue debajo, plegado: es el equivalente en texto.
 */
function diagramas(opciones: OpcionesRender) {
  return () => async (arbol: Root) => {
    if (!opciones.dibujarDiagrama) return;
    const bloques: { pre: Element; padre: Parent; titulo: string }[] = [];
    let titulo = "";
    visit(arbol, "element", (nodo: Element, _indice, padre) => {
      if (/^h[1-6]$/.test(nodo.tagName)) titulo = textoDe(nodo);
      if (nodo.tagName === "pre" && nodo.properties.dataLang === ETIQUETA_DE_MERMAID && padre) {
        bloques.push({ pre: nodo, padre: padre as Parent, titulo });
        return "skip";
      }
    });
    for (const { pre, padre, titulo } of bloques) {
      const imagen = await opciones.dibujarDiagrama(textoDe(pre).trimEnd());
      if (!imagen) continue;
      const lienzo: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["ayuda-diagrama-lienzo"], tabIndex: 0, role: "region", ariaLabel: "Diagrama desplazable" },
        children: [
          {
            type: "element",
            tagName: "img",
            properties: {
              dataDiagrama: imagen.huella,
              src: imagen.src,
              alt: titulo ? `Diagrama de la sección ${titulo}` : "Diagrama",
              width: imagen.ancho,
              height: imagen.alto,
              loading: "lazy",
            },
            children: [],
          },
        ],
      };
      const codigo: Element = {
        type: "element",
        tagName: "details",
        properties: {},
        children: [{ type: "element", tagName: "summary", properties: {}, children: [{ type: "text", value: "Ver el código del diagrama" }] }, pre],
      };
      enHijos(padre, padre.children.indexOf(pre), [
        { type: "element", tagName: "figure", properties: { className: ["ayuda-diagrama"] }, children: [lienzo, codigo] },
      ]);
    }
  };
}

export async function renderizarMarkdown(markdown: string, opciones: OpcionesRender): Promise<ResultadoRender> {
  const salida = { enlaces: new Set<string>(), avisos: [] as string[] };
  const texto = expandirAdmoniciones(quitarFrontmatter(markdown));

  const archivo = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, ESQUEMA)
    .use(imagenes(opciones, salida))
    .use(retoques(opciones, salida))
    .use(diagramas(opciones))
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(texto);

  return { html: String(archivo), enlaces: [...salida.enlaces], avisos: salida.avisos };
}
