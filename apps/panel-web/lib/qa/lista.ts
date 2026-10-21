/**
 * Lista lateral de pruebas (SPEC-30, HU-QA-03 y HU-QA-08): filtros y agrupación por entorno
 * (Panel, APK, WhatsApp, Web, API), dentro por sección (área) y dentro por subsección (catálogo
 * v7). Lógica pura: la página solo la usa.
 */
import type { QaItem } from "@/lib/api/types";
import { esTerminada } from "@/lib/qa/estados";

export type Filtros = {
  texto: string;
  estado: "todas" | "pendientes" | "terminadas" | "falla" | "bloqueada";
  entorno: string;
  area: string;
  subseccion: string;
  soloHumo: boolean;
};

export const FILTROS_INICIALES: Filtros = {
  texto: "",
  estado: "todas",
  entorno: "",
  area: "",
  subseccion: "",
  soloHumo: false,
};

export type Grupo = { id: string; titulo: string; items: QaItem[]; terminadas: number };
export type GrupoDeSubseccion = Grupo & { subseccion: string };
export type GrupoDeArea = Grupo & { area: string; subsecciones: GrupoDeSubseccion[] };
export type GrupoDeEntorno = Grupo & { entorno: string; areas: GrupoDeArea[] };

/** Entornos en el orden de la lista; las pruebas de un catálogo anterior a la v6 caen en «otros». */
export const ENTORNOS: Record<string, string> = {
  panel: "Panel",
  apk: "APK",
  whatsapp: "WhatsApp",
  web: "Web",
  api: "API",
  otros: "Sin clasificar",
};

export function entornoDe(item: QaItem): string {
  return item.entorno ?? "otros";
}

/** Sección de la prueba; sin `area` (catálogo anterior a la v6), su grupo. */
export function areaDe(item: QaItem): string {
  return item.area ?? item.grupo ?? "Sin sección";
}

/** Subsección de la prueba (catálogo v15); sin `subseccion`, la sección vacía de su área. */
export function subseccionDe(item: QaItem): string {
  return item.subseccion ?? "";
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** `estadoDe(slug)`: estado de la prueba en MI ejecución (o `sin_correr`). */
export function filtrar(items: QaItem[], filtros: Filtros, estadoDe: (slug: string) => string): QaItem[] {
  const texto = normalizar(filtros.texto.trim());
  return items.filter((item) => {
    const estado = estadoDe(item.slug);
    if (filtros.estado === "pendientes" && esTerminada(estado)) return false;
    if (filtros.estado === "terminadas" && !esTerminada(estado)) return false;
    if (filtros.estado === "falla" && estado !== "falla") return false;
    if (filtros.estado === "bloqueada" && estado !== "bloqueada") return false;
    if (filtros.entorno && entornoDe(item) !== filtros.entorno) return false;
    if (filtros.area && areaDe(item) !== filtros.area) return false;
    if (filtros.subseccion && subseccionDe(item) !== filtros.subseccion) return false;
    if (filtros.soloHumo && item.prioridad !== "P0") return false;
    if (texto) {
      const pajar = normalizar(
        [item.titulo, item.grupo, item.area ?? "", item.subseccion ?? "", item.resumen ?? "", ...(item.hu ?? []), item.slug].join(" "),
      );
      if (!pajar.includes(texto)) return false;
    }
    return true;
  });
}

/**
 * Entornos en el orden fijo de `ENTORNOS` y, dentro de cada uno, sus secciones en el orden del
 * catálogo (que las ordena como el menú del panel y las pantallas de la APK) y dentro de cada
 * sección sus subsecciones, con cuántas terminé de cada nivel.
 */
export function agrupar(items: QaItem[], estadoDe: (slug: string) => string): GrupoDeEntorno[] {
  const entornos = new Map<string, GrupoDeEntorno>();
  for (const item of items) {
    const entorno = entornoDe(item);
    let grupo = entornos.get(entorno);
    if (!grupo) {
      grupo = { id: entorno, entorno, titulo: ENTORNOS[entorno] ?? entorno, items: [], terminadas: 0, areas: [] };
      entornos.set(entorno, grupo);
    }
    const area = areaDe(item);
    let sub = grupo.areas.find((a) => a.titulo === area);
    if (!sub) {
      sub = { id: `${entorno}:${area}`, area, titulo: area, items: [], terminadas: 0, subsecciones: [] };
      grupo.areas.push(sub);
    }
    const subseccion = subseccionDe(item);
    let tercer = sub.subsecciones.find((s) => s.subseccion === subseccion);
    if (!tercer) {
      tercer = {
        id: `${entorno}:${area}:${subseccion}`,
        subseccion,
        titulo: subseccion || "Sin subsección",
        items: [],
        terminadas: 0,
      };
      sub.subsecciones.push(tercer);
    }
    const terminada = esTerminada(estadoDe(item.slug));
    grupo.items.push(item);
    sub.items.push(item);
    tercer.items.push(item);
    if (terminada) {
      grupo.terminadas += 1;
      sub.terminadas += 1;
      tercer.terminadas += 1;
    }
  }
  const orden = Object.keys(ENTORNOS);
  return [...entornos.values()].sort((a, b) => orden.indexOf(a.entorno) - orden.indexOf(b.entorno));
}

/** Entornos presentes, en orden, para el filtro. */
export function entornos(items: QaItem[]): { id: string; titulo: string }[] {
  const presentes = new Set(items.map(entornoDe));
  return Object.entries(ENTORNOS)
    .filter(([id]) => presentes.has(id))
    .map(([id, titulo]) => ({ id, titulo }));
}

/** Secciones de un entorno (o de todos), en el orden del catálogo. */
export function areas(items: QaItem[], entorno: string): string[] {
  return [...new Set(items.filter((i) => !entorno || entornoDe(i) === entorno).map(areaDe))];
}

/** Subsecciones de un área (o de todas), en el orden del catálogo. */
export function subsecciones(items: QaItem[], entorno: string, area: string): string[] {
  return [
    ...new Set(
      items
        .filter((i) => (!entorno || entornoDe(i) === entorno) && (!area || areaDe(i) === area))
        .map(subseccionDe),
    ),
  ];
}

/** El orden en que la lista muestra las pruebas (entornos, secciones y subsecciones), para J/K y «siguiente». */
export function enOrdenDeLista(items: QaItem[]): QaItem[] {
  return agrupar(items, () => "sin_correr").flatMap((e) => e.areas.flatMap((a) => a.subsecciones.flatMap((s) => s.items)));
}

/** La siguiente prueba sin terminar después de `actual` (dando la vuelta); `null` si no queda. */
export function siguientePendiente(
  items: QaItem[],
  actual: string | null,
  estadoDe: (slug: string) => string,
): string | null {
  if (items.length === 0) return null;
  const inicio = actual ? items.findIndex((i) => i.slug === actual) : -1;
  for (let k = 1; k <= items.length; k++) {
    const item = items[(inicio + k + items.length) % items.length];
    if (item.slug !== actual && !esTerminada(estadoDe(item.slug))) return item.slug;
  }
  return null;
}

/** La prueba anterior o siguiente en la lista visible (J/K). */
export function vecina(items: QaItem[], actual: string | null, paso: 1 | -1): string | null {
  if (items.length === 0) return null;
  const i = actual ? items.findIndex((x) => x.slug === actual) : -1;
  if (i < 0) return items[0].slug;
  const j = i + paso;
  return j >= 0 && j < items.length ? items[j].slug : null;
}

/** Primer paso sin marcar (desde 1); si están todos, `null`. */
export function primerPasoPendiente(totalPasos: number, pasos: Record<string, { estado?: string | null }>): number | null {
  for (let n = 1; n <= totalPasos; n++) {
    if (!pasos[String(n)]?.estado) return n;
  }
  return null;
}
