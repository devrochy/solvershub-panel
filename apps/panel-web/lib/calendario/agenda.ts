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

/**
 * Evento para FullCalendar (AGE-03/04): el color es siempre el de la agenda (con quién es), y el
 * tipo va en palabras en `tipoNombre`, no como sigla delante del nombre. Sin agenda, la cita usa
 * el color de su tipo. Las citas llevan `evt-cat-N` (sin color `evt-sin-tipo`); las canceladas,
 * `evt-cancelada`. Los bloqueos son eventos normales (los de `display: "background"` no se pueden
 * arrastrar) con la clase `evt-bloqueo`, que los pinta como franja rayada.
 */
export function aEventoDeGrilla(e: EventoAgenda, tiposPorId: Record<string, string> = {}): EventInput {
  if (e.kind === "block") {
    return { id: e.id, start: e.start, end: e.end, extendedProps: e, title: e.title || "Bloqueo", classNames: ["evt-bloqueo"], display: "block" };
  }
  const serie = serieDeColor(e.calendar_color || e.tipo_color);
  const clases = [serie ? `evt-cat-${serie}` : "evt-sin-tipo"];
  if (e.status === "cancelled") clases.push("evt-cancelada");
  const tipoNombre = tiposPorId[e.appointment_type_id] ?? "";
  return {
    id: e.id,
    start: e.start,
    end: e.end,
    extendedProps: { ...e, tipoNombre },
    title: e.title || "Cita",
    classNames: clases,
    // Una cita cancelada ya no se mueve.
    editable: e.status !== "cancelled",
  };
}

const DIAS_FC: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

/** Lo que la grilla necesita del horario: qué se sombrea como cerrado y qué horas se muestran. */
export type HorarioDeGrilla = {
  businessHours: { daysOfWeek: number[]; startTime: string; endTime: string }[] | false;
  slotMinTime: string;
  slotMaxTime: string;
  scrollTime: string;
};

const aMinutos = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const aHora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}:00`;

/**
 * Horario (`{"mon":"08:00-18:00",…}`, "" = cerrado) → grilla (AGE-01): de una hora antes de abrir a
 * una después de cerrar, con lo cerrado sombreado. Sin horario que se entienda, de 6 a 22 sin sombra.
 */
export function horarioAGrilla(horas: Record<string, string>): HorarioDeGrilla {
  const franjas: HorarioDeGrilla["businessHours"] = [];
  let abre = Infinity;
  let cierra = -Infinity;
  for (const [dia, rango] of Object.entries(horas)) {
    const n = DIAS_FC[dia];
    const [inicio = "", fin = ""] = (rango || "").split("-");
    const a = aMinutos(inicio);
    const c = aMinutos(fin);
    if (n === undefined || a === null || c === null || c <= a) continue;
    franjas.push({ daysOfWeek: [n], startTime: aHora(a).slice(0, 5), endTime: aHora(c).slice(0, 5) });
    abre = Math.min(abre, a);
    cierra = Math.max(cierra, c);
  }
  if (!franjas.length) return { businessHours: false, slotMinTime: "06:00:00", slotMaxTime: "22:00:00", scrollTime: "08:00:00" };
  const desde = Math.max(0, Math.floor(abre / 60) * 60 - 60);
  const hasta = Math.min(24 * 60, Math.ceil(cierra / 60) * 60 + 60);
  return { businessHours: franjas, slotMinTime: aHora(desde), slotMaxTime: aHora(hasta), scrollTime: aHora(abre) };
}

/** Fecha de hoy en `zona` como «AAAA-MM-DD» (para pedir las citas del día). */
export function hoyEn(zona: string, ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
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
