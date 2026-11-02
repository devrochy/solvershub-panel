/**
 * Seguimiento del lead (HU-CRM-21): la próxima acción de un lead y cuándo. El servidor guarda la fecha
 * en UTC, decide en qué opción cae (`seguimiento_estado`, con la zona del negocio) y devuelve la fecha
 * de la ficha en hora del negocio, sin zona, lista para `datetime-local`. Aquí solo se muestra.
 */

export const ZONA_POR_DEFECTO = "America/Bogota";

export type EstadoDeSeguimiento = "vencidos" | "hoy" | "proximos_7_dias" | "mas_adelante";

export type Seguimiento = {
  /** Instante programado (ISO 8601, UTC). */
  en: string;
  nota: string | null;
  estado: EstadoDeSeguimiento | null;
};

type TonoDeSeguimiento = "danger" | "accent" | "info" | "neutral";

/** Texto y tono de cada opción. El texto siempre acompaña al color. */
export const ESTADO_DE_SEGUIMIENTO: Record<EstadoDeSeguimiento, { texto: string; tono: TonoDeSeguimiento }> = {
  vencidos: { texto: "Vencido", tono: "danger" },
  hoy: { texto: "Hoy", tono: "accent" },
  proximos_7_dias: { texto: "Próximo", tono: "info" },
  mas_adelante: { texto: "Programado", tono: "neutral" },
};

const ESTADOS = Object.keys(ESTADO_DE_SEGUIMIENTO);

/** El seguimiento que trae una fila de la lista o la ficha (`extras`), o null si el lead no tiene. */
export function seguimientoDeExtras(extras: Record<string, unknown> | null | undefined): Seguimiento | null {
  const en = extras?.seguimiento_en;
  if (typeof en !== "string" || !en) return null;
  const nota = extras?.seguimiento_nota;
  const estado = extras?.seguimiento_estado;
  return {
    en,
    nota: typeof nota === "string" && nota.trim() ? nota : null,
    estado: typeof estado === "string" && ESTADOS.includes(estado) ? (estado as EstadoDeSeguimiento) : null,
  };
}

/** «mar 3 nov, 9:00 a. m.» en la zona del negocio (no en la del navegador). */
export function textoDeSeguimiento(en: string, zona: string = ZONA_POR_DEFECTO): string {
  const fecha = new Date(en);
  if (Number.isNaN(fecha.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: zona,
    }).format(fecha);
  } catch {
    return textoDeSeguimiento(en, ZONA_POR_DEFECTO);
  }
}

/** Orden de la lista: si no se eligió otro y hay un filtro de seguimiento, los más atrasados primero. */
export function ordenPorDefectoDeSeguimiento(orden: string | null, filtros: string[], clave = "seguimiento"): string | null {
  if (orden) return orden;
  return filtros.some((f) => f.startsWith(`${clave}:`) && f !== `${clave}:sin_seguimiento`) ? "seguimiento" : null;
}

/** Cuerpo del PATCH de la ficha al programar o mover; `""` en la fecha quita el seguimiento. */
export function cuerpoDeSeguimiento(nota: string, fecha: string): Record<string, string> {
  return fecha.trim() ? { seguimiento_nota: nota.trim(), seguimiento_en: fecha.trim() } : { seguimiento_en: "" };
}

/**
 * «mar 3 nov, 9:00 a. m.» de una hora de pared del negocio sin zona (`2026-11-03T09:00`, lo que devuelve la
 * ficha y lo que entiende un `datetime-local`). No convierte nada: se muestra tal cual la escribió el negocio.
 */
export function textoDeHoraDelNegocio(local: string): string {
  if (!esHoraDelNegocio(local)) return "—";
  const pared = new Date(`${local}:00Z`);
  if (Number.isNaN(pared.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(pared);
}

/** ¿La hora de pared (`datetime-local`) tiene el formato que acepta la API? */
export function esHoraDelNegocio(valor: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor);
}
