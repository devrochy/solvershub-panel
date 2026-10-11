import type { LucideIcon } from "lucide-react";

import { NAV_GROUPS, type NavGroupDef } from "@/components/shell/nav";
import type { SearchItem, SearchSection } from "@/lib/api/types";
import { gruposVisibles, type Permisos } from "@/lib/shell/navegacion";

/**
 * Índice de la paleta de comandos (HU-DS-05). Todo sale del menú (`nav.ts`) y de los
 * permisos de `/admin/me`: lo que el usuario no ve en el menú tampoco aparece aquí.
 */

/** Packs del negocio (ADR-0019): un pack apagado no aparece en la paleta. */
export type PacksDelNegocio = Record<string, { enabled: boolean }>;

export type EntradaSeccion = {
  id: string;
  /** "Cobranza › Promesas": el grupo da contexto cuando dos secciones se llaman igual. */
  label: string;
  nombre: string;
  grupo: string;
  href: string;
  icon: LucideIcon;
};

export function seccionesDePaleta(
  permisos: Permisos,
  packs: PacksDelNegocio = {},
  grupos: NavGroupDef[] = NAV_GROUPS,
): EntradaSeccion[] {
  const vistas = new Set<string>();
  const entradas: EntradaSeccion[] = [];
  for (const { group, visible } of gruposVisibles(permisos, grupos)) {
    if (group.pack && packs[group.pack]?.enabled === false) continue;
    for (const item of visible) {
      if (!item.ready || vistas.has(item.href)) continue;
      vistas.add(item.href);
      entradas.push({
        id: `seccion:${item.href}`,
        label: `${group.label} › ${item.label}`,
        nombre: item.label,
        grupo: group.label,
        href: item.href,
        icon: item.icon,
      });
    }
  }
  return entradas;
}

export type TipoAccion =
  | "pausar-asistente"
  | "reactivar-asistente"
  | "cambiar-tema"
  | "plegar-menu"
  | "ayuda-atajos"
  | "alternar-atajos";

export type EntradaAccion = { id: TipoAccion; label: string; palabras: string[] };

/**
 * Acciones rápidas. Pausar y reactivar el asistente solo con permiso de escritura en
 * Configuración (las mismas reglas que el formulario de Identidad).
 */
export function accionesDePaleta({
  puedeEditarAsistente,
  asistentePausado,
  atajosActivos,
}: {
  puedeEditarAsistente: boolean;
  asistentePausado: boolean;
  atajosActivos: boolean;
}): EntradaAccion[] {
  const acciones: EntradaAccion[] = [];
  if (puedeEditarAsistente) {
    acciones.push(
      asistentePausado
        ? { id: "reactivar-asistente", label: "Reactivar asistente", palabras: ["bot", "responder", "activar"] }
        : { id: "pausar-asistente", label: "Pausar asistente", palabras: ["bot", "detener", "apagar"] },
    );
  }
  acciones.push(
    { id: "cambiar-tema", label: "Cambiar entre tema claro y oscuro", palabras: ["modo", "oscuro", "claro"] },
    { id: "plegar-menu", label: "Plegar o expandir el menú", palabras: ["barra lateral", "sidebar"] },
    { id: "ayuda-atajos", label: "Ver atajos de teclado", palabras: ["ayuda", "teclas"] },
    {
      id: "alternar-atajos",
      label: atajosActivos ? "Apagar atajos de una tecla" : "Encender atajos de una tecla",
      palabras: ["accesibilidad", "teclado"],
    },
  );
  return acciones;
}

/** Minúsculas y sin tildes: "configuracion" encuentra "Configuración". */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/**
 * Puntaje de una entrada para la consulta. `textos` va de más a menos importante (el
 * nombre de la sección y después su grupo): 3 si una palabra del primero empieza con la
 * consulta, 2 si una de los demás, 1 si la contiene en otro lugar, 0 si no coincide. Así
 * "co" trae primero Conversaciones y Conexiones, y después todo Cobranza y Configuración.
 */
export function puntaje(textos: string[], consulta: string): number {
  const q = normalizar(consulta);
  if (!q) return 1;
  let mejor = 0;
  textos.forEach((texto, indice) => {
    const t = normalizar(texto);
    if (t.split(/[\s›/]+/).some((palabra) => palabra.startsWith(q))) mejor = Math.max(mejor, indice === 0 ? 3 : 2);
    else if (t.includes(q)) mejor = Math.max(mejor, 1);
  });
  return mejor;
}

/** Filtra y ordena por puntaje, conservando el orden del menú en los empates. */
export function filtrar<T>(entradas: T[], consulta: string, textos: (entrada: T) => string[]): T[] {
  return entradas
    .map((entrada, indice) => ({ entrada, indice, p: puntaje(textos(entrada), consulta) }))
    .filter(({ p }) => p > 0)
    .sort((a, b) => b.p - a.p || a.indice - b.indice)
    .map(({ entrada }) => entrada);
}

/** Resultado de `GET /api/v1/search` (ADR-0096), con los tipos del OpenAPI. */
export type ItemBusqueda = SearchItem;
export type SeccionBusqueda = SearchSection;

/**
 * A dónde lleva cada resultado. Con ficha propia va a la ficha; sin ficha, a la lista
 * de su sección (filtrada si la lista acepta `?q=`).
 */
export function rutaDeResultado(item: ItemBusqueda): string | null {
  const q = encodeURIComponent(item.titulo);
  switch (item.tipo) {
    case "conversacion":
      return `/conversaciones/${item.id}`;
    case "cliente":
      return `/leads?q=${q}`;
    case "cliente_cobranza":
      return `/cobranza/clientes/${item.id}`;
    case "promesa": {
      const cliente = item.extra?.clienteId;
      return typeof cliente === "string" ? `/cobranza/clientes/${cliente}` : "/cobranza/promesas";
    }
    case "producto":
      return "/comercio/productos";
    case "pedido":
      return "/comercio/pedidos";
    case "cita":
      return "/calendario/citas";
    default:
      return null;
  }
}

/**
 * Atajos de dos teclas `g` + letra (ADR-0003). Las letras son las del diseño, pensadas
 * para el menú v2 (Inicio, Atención, Conversaciones, Ventas y cobros; HU-UX-02). Mientras
 * ese menú no llegue, cada una lleva a la sección actual equivalente y la ayuda la nombra
 * como se ve en el menú. Si el usuario no puede ver ninguna, el atajo no hace nada.
 */
export const ATAJOS_IR: { tecla: string; label: string; hrefs: string[] }[] = [
  { tecla: "i", label: "Resumen", hrefs: ["/dashboard"] },
  { tecla: "a", label: "Escalaciones", hrefs: ["/escalaciones"] },
  { tecla: "c", label: "Conversaciones", hrefs: ["/conversaciones"] },
  { tecla: "v", label: "Cobranza o Comercio", hrefs: ["/cobranza", "/comercio"] },
];

export function destinoDeAtajo(tecla: string, secciones: EntradaSeccion[]): string | null {
  const atajo = ATAJOS_IR.find((a) => a.tecla === tecla.toLowerCase());
  if (!atajo) return null;
  const permitidas = new Set(secciones.map((s) => s.href));
  return atajo.hrefs.find((href) => permitidas.has(href)) ?? null;
}

/** Un campo donde se escribe: ahí los atajos de una tecla no se disparan. */
export function esCampoEditable(destino: EventTarget | null): boolean {
  const el = destino as HTMLElement | null;
  return Boolean(el?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el?.tagName ?? ""));
}
