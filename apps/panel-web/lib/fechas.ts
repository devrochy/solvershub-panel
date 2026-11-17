/**
 * Fechas y horas del panel (ADR-0199).
 *
 * Regla: el backend viaja en UTC (ISO 8601 con offset) y las fechas de calendario viajan como
 * `YYYY-MM-DD`. Aquí se convierten a la zona del negocio (`app_settings.timezone`) al pintar.
 * Nunca se usa la zona del servidor (SSR) ni la del navegador: por eso todas las funciones de
 * instantes exigen `timeZone`.
 *
 * Formatos estándar:
 * - tablas y listas: `dd/MM/yyyy HH:mm` (24 h)
 * - fichas y detalle: `16 de noviembre de 2026, 08:23`
 * - solo fecha: `dd/MM/yyyy`
 * - pantallas técnicas: `dd/MM/yyyy HH:mm (HH:mm UTC)`
 */

export const ZONA_POR_DEFECTO = "America/Bogota";

const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

export function esFechaSolo(value: string): boolean {
  return SOLO_FECHA.test(value);
}

function fechaDeSoloFecha(value: string): Date | null {
  const m = SOLO_FECHA.exec(value);
  if (!m) return null;
  // Se arma en UTC y se formatea en UTC: un día de calendario no se desplaza.
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function instante(value: string | Date): Date | null {
  const fecha = value instanceof Date ? value : new Date(value);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function partes(fecha: Date, timeZone: string, opciones: Intl.DateTimeFormatOptions): Record<string, string> {
  const formato = new Intl.DateTimeFormat("es-CO", { ...opciones, timeZone });
  const salida: Record<string, string> = {};
  for (const p of formato.formatToParts(fecha)) {
    if (p.type !== "literal") salida[p.type] = p.value;
  }
  return salida;
}

function zonaValida(timeZone: string | null | undefined): string {
  const zona = (timeZone || "").trim() || ZONA_POR_DEFECTO;
  try {
    new Intl.DateTimeFormat("es-CO", { timeZone: zona });
    return zona;
  } catch {
    return ZONA_POR_DEFECTO;
  }
}

/** `dd/MM/yyyy`. Una fecha-solo no se convierte; un instante se pinta en `timeZone`. */
export function formatFecha(
  value: string | Date | null | undefined,
  timeZone: string = ZONA_POR_DEFECTO,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" && esFechaSolo(value)) {
    const fecha = fechaDeSoloFecha(value);
    if (!fecha) return "—";
    const p = partes(fecha, "UTC", { day: "2-digit", month: "2-digit", year: "numeric" });
    return `${p.day}/${p.month}/${p.year}`;
  }
  const fecha = instante(value);
  if (!fecha) return "—";
  const p = partes(fecha, zonaValida(timeZone), { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${p.day}/${p.month}/${p.year}`;
}

/** `dd/MM/yyyy HH:mm` (24 h) en la zona del negocio. Una fecha-solo se muestra como fecha. */
export function formatFechaHora(
  value: string | Date | null | undefined,
  timeZone: string = ZONA_POR_DEFECTO,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" && esFechaSolo(value)) return formatFecha(value, timeZone);
  const fecha = instante(value);
  if (!fecha) return "—";
  const p = partes(fecha, zonaValida(timeZone), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/** `16 de noviembre de 2026, 08:23` en la zona del negocio. */
export function formatFechaLarga(
  value: string | Date | null | undefined,
  timeZone: string = ZONA_POR_DEFECTO,
  conHora = false,
): string {
  if (value === null || value === undefined || value === "") return "—";
  const soloFecha = typeof value === "string" && esFechaSolo(value);
  const fecha = soloFecha ? fechaDeSoloFecha(value) : instante(value);
  if (!fecha) return "—";
  const zona = soloFecha ? "UTC" : zonaValida(timeZone);
  const p = partes(fecha, zona, {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(conHora ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : {}),
  });
  const texto = `${p.day} de ${p.month} de ${p.year}`;
  return conHora ? `${texto}, ${p.hour}:${p.minute}` : texto;
}

/** `HH:mm` en la zona del negocio. */
export function formatHora(
  value: string | Date | null | undefined,
  timeZone: string = ZONA_POR_DEFECTO,
): string {
  if (value === null || value === undefined || value === "") return "—";
  const fecha = instante(value);
  if (!fecha) return "—";
  const p = partes(fecha, zonaValida(timeZone), {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${p.hour}:${p.minute}`;
}

/** Pantallas técnicas: hora local del negocio y UTC entre paréntesis. */
export function formatFechaHoraTecnica(
  value: string | Date | null | undefined,
  timeZone: string = ZONA_POR_DEFECTO,
): string {
  const local = formatFechaHora(value, timeZone);
  if (local === "—") return local;
  const utc = formatHora(value, "UTC");
  return `${local} (${utc} UTC)`;
}

/** «hace 5 minutos», «en 2 horas», «ayer». Una duración no depende de la zona. */
export function formatRelativo(
  value: string | Date | null | undefined,
  ahora: Date = new Date(),
): string {
  if (value === null || value === undefined || value === "") return "—";
  const fecha = instante(value);
  if (!fecha) return "—";
  const segundos = Math.round((fecha.getTime() - ahora.getTime()) / 1000);
  const abs = Math.abs(segundos);
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  if (abs < 60) return rtf.format(segundos, "second");
  if (abs < 3600) return rtf.format(Math.round(segundos / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(segundos / 3600), "hour");
  if (abs < 604800) return rtf.format(Math.round(segundos / 86400), "day");
  return rtf.format(Math.round(segundos / 604800), "week");
}
