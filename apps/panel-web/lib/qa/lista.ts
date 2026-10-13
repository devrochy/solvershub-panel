/**
 * Lista lateral de pruebas (SPEC-30, HU-QA-03): filtros y agrupación por módulo y grupo.
 * Lógica pura: la página solo la usa.
 */
import type { QaItem } from "@/lib/api/types";
import { esTerminada } from "@/lib/qa/estados";

export type Filtros = {
  texto: string;
  estado: "todas" | "pendientes" | "terminadas" | "falla" | "bloqueada";
  modulo: string;
  soloHumo: boolean;
};

export const FILTROS_INICIALES: Filtros = { texto: "", estado: "todas", modulo: "", soloHumo: false };

export type Grupo = { id: string; titulo: string; items: QaItem[]; terminadas: number };

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
    if (filtros.modulo && (item.modulo ?? "Sin módulo") !== filtros.modulo) return false;
    if (filtros.soloHumo && item.prioridad !== "P0") return false;
    if (texto) {
      const pajar = normalizar([item.titulo, item.grupo, item.resumen ?? "", ...(item.hu ?? []), item.slug].join(" "));
      if (!pajar.includes(texto)) return false;
    }
    return true;
  });
}

/** Grupos en el orden del catálogo (`modulo · grupo`), con cuántas terminé de cada uno. */
export function agrupar(items: QaItem[], estadoDe: (slug: string) => string): Grupo[] {
  const grupos = new Map<string, Grupo>();
  for (const item of items) {
    const titulo = item.modulo ? `${item.modulo} · ${item.grupo}` : item.grupo || "Sin grupo";
    let grupo = grupos.get(titulo);
    if (!grupo) {
      grupo = { id: titulo, titulo, items: [], terminadas: 0 };
      grupos.set(titulo, grupo);
    }
    grupo.items.push(item);
    if (esTerminada(estadoDe(item.slug))) grupo.terminadas += 1;
  }
  return [...grupos.values()];
}

export function modulos(items: QaItem[]): string[] {
  return [...new Set(items.map((i) => i.modulo ?? "Sin módulo"))].sort((a, b) => a.localeCompare(b, "es"));
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
