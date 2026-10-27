import type { EventInput } from "@fullcalendar/core";

/**
 * Agenda unificada (HU-UX-08, SPEC-12): color y código por tipo de cita y cómo se pintan
 * citas y bloqueos en la grilla de FullCalendar. Lógica pura: los componentes de
 * `calendario/citas` la usan y aquí se prueba.
 */

/** Paleta categórica del sistema de diseño (SPEC-29, `--color-data-1…4`), en orden fijo. */
export const COLORES_TIPO = [
  { valor: "cat-1", nombre: "Azul" },
  { valor: "cat-2", nombre: "Dorado" },
  { valor: "cat-3", nombre: "Turquesa" },
  { valor: "cat-4", nombre: "Violeta" },
] as const;

export type ColorTipo = (typeof COLORES_TIPO)[number]["valor"];

export const CODIGO_MAX = 6;

export function esColorTipo(valor: unknown): valor is ColorTipo {
  return COLORES_TIPO.some((c) => c.valor === valor);
}

/** Número de la serie (`1…4`) del color, para las clases `bg-data-N`/`evt-cat-N`. */
export function serieDeColor(color: string | null | undefined): number | null {
  return esColorTipo(color) ? Number(color.slice(4)) : null;
}

/** Clase Tailwind del fondo del color (literal, para que Tailwind la genere). */
export const FONDO_DE_COLOR: Record<ColorTipo, string> = {
  "cat-1": "bg-data-1",
  "cat-2": "bg-data-2",
  "cat-3": "bg-data-3",
  "cat-4": "bg-data-4",
};

/** Las 3 primeras letras o cifras del nombre en mayúsculas, como en el backend. */
export function codigoPorDefecto(nombre: string): string {
  return Array.from(nombre)
    .filter((c) => /[\p{L}\p{N}]/u.test(c))
    .slice(0, 3)
    .join("")
    .toUpperCase();
}

/** Código como lo guarda el backend: sin espacios a los lados, en mayúsculas y hasta 6. */
export function normalizarCodigo(valor: string): string {
  return valor.trim().toUpperCase().slice(0, CODIGO_MAX);
}

export type TipoLeyenda = { id: string; name: string; color: string; codigo: string };

/** Evento de `/pack/calendar/events`. */
export type EventoAgenda = {
  id: string;
  title: string;
  start: string;
  end: string;
  kind: "appointment" | "block";
  status: string;
  source: "local" | "google";
  color: string;
  can_cancel: boolean;
  attendee_email: string;
  notes: string;
  appointment_type_id: string;
  tipo_color?: string;
  tipo_codigo?: string;
  /** Agenda de la cita (HU-CAL-08); vacío en negocios sin agendas. */
  calendar_id?: string;
  calendar_color?: string;
};

/** Agenda tal como llega en la leyenda de `/events` (HU-CAL-08). */
export type LeyendaAgenda = {
  id: string;
  name: string;
  color: string;
  is_default?: boolean;
  active?: boolean;
  disponible?: boolean;
};

/** Con 4 colores, desde la 5.ª agenda se repiten: la inicial del nombre las distingue. */
export function inicialDeAgenda(nombre: string): string {
  return Array.from(nombre.trim().normalize("NFD").replace(/\p{M}/gu, "")).find((c) => /[\p{L}\p{N}]/u.test(c))?.toUpperCase() ?? "?";
}

/**
 * Agendas visibles: las guardadas por el usuario que todavía existen; sin guardado (o si ya
 * no queda ninguna) se ven todas. Una agenda nueva que el usuario no conocía se muestra.
 */
export function agendasVisibles(guardadas: string[] | null, todas: string[]): string[] {
  if (!guardadas) return todas;
  const conocidas = guardadas.filter((id) => todas.includes(id));
  return conocidas.length ? conocidas : todas;
}

/** Cómo se colorea la grilla: por agenda si se ven varias, por tipo de cita si se ve una. */
export type ColorPor = "tipo" | "agenda";

/**
 * Evento para FullCalendar. Las citas llevan la clase de su tipo (`evt-cat-N`, sin tipo
 * `evt-sin-tipo`) y su código delante del título; las canceladas, `evt-cancelada`. Los
 * bloqueos son eventos normales (los de `display: "background"` no se pueden arrastrar)
 * con la clase `evt-bloqueo`, que los pinta como fondo rayado de toda la columna.
 */
export function aEventoDeGrilla(e: EventoAgenda, colorPor: ColorPor = "tipo"): EventInput {
  const base = { id: e.id, start: e.start, end: e.end, extendedProps: e };
  if (e.kind === "block") {
    return { ...base, title: e.title || "Bloqueo", classNames: ["evt-bloqueo"], display: "block" };
  }
  const serie = serieDeColor(colorPor === "agenda" ? e.calendar_color : e.tipo_color);
  const clases = [serie ? `evt-cat-${serie}` : "evt-sin-tipo"];
  if (e.status === "cancelled") clases.push("evt-cancelada");
  const titulo = e.title || "Cita";
  return {
    ...base,
    title: e.tipo_codigo ? `${e.tipo_codigo} · ${titulo}` : titulo,
    classNames: clases,
    // Una cita cancelada ya no se mueve.
    editable: e.status !== "cancelled",
  };
}

export type Borrador = { start: string; end: string };

/**
 * Hueco elegido en la grilla → borrador de cita o bloqueo. En la vista de mes la selección
 * es de días completos: se propone de 9:00 a 10:00 del primer día en vez de la medianoche.
 */
export function borradorDeSeleccion(sel: { startStr: string; endStr: string; allDay: boolean }): Borrador {
  if (!sel.allDay) return { start: sel.startStr, end: sel.endStr };
  const dia = sel.startStr.slice(0, 10);
  return { start: `${dia}T09:00:00`, end: `${dia}T10:00:00` };
}

/** Qué se crea desde un hueco del calendario. */
export type QueCrear = "cita" | "bloqueo";

/** «a, b ,, c» → ["a","b","c"] (sin repetidos, como los guarda el backend). */
export function aliasesDeTexto(texto: string): string[] {
  const vistos = new Set<string>();
  for (const parte of texto.split(",")) {
    const alias = parte.trim();
    if (alias) vistos.add(alias);
  }
  return Array.from(vistos);
}
