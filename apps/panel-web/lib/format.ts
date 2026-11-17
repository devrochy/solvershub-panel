/** Formateo puro (es-CO). Responsabilidad única: convertir datos → texto. */

import {
  ZONA_POR_DEFECTO,
  formatFecha as formatFechaZona,
  formatFechaHora,
  formatFechaLarga as formatFechaLargaZona,
} from "@/lib/fechas";

const numberFmt = new Intl.NumberFormat("es-CO");

export function formatNumber(value: number): string {
  return numberFmt.format(value);
}

export function formatUsd(value: number, maximumFractionDigits = 4): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(value);
}

/**
 * Monto en la moneda del negocio (HU-UI-01). `COP` no muestra decimales;
 * otras monedas usan su formato estándar.
 */
export function formatMoney(value: number, currency = "COP"): string {
  const code = (currency || "COP").toUpperCase();
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: code,
    maximumFractionDigits: code === "COP" ? 0 : 2,
  }).format(value);
}

export function formatCop(value: number): string {
  return formatMoney(value, "COP");
}

/** `dd/MM/yyyy`. Una fecha-solo no se desplaza; un instante se pinta en `timeZone`. */
export function formatDate(
  value: string | Date | null | undefined,
  timeZone: string = ZONA_POR_DEFECTO,
): string {
  if (!value) return "—";
  return formatFechaZona(value, timeZone);
}

/** «10 de enero de 2026». */
export function formatFechaLarga(
  value: string | Date | null | undefined,
  timeZone: string = ZONA_POR_DEFECTO,
): string {
  if (!value) return "—";
  return formatFechaLargaZona(value, timeZone);
}

/** `dd/MM/yyyy HH:mm` (24 h) en la zona del negocio (ADR-0201). */
export function formatDateTime(
  value: string | Date | null | undefined,
  timeZone: string = ZONA_POR_DEFECTO,
): string {
  if (!value) return "—";
  return formatFechaHora(value, timeZone);
}

/** Hora de un chat en la bandeja: la hora si es de hoy; si no, la fecha (HU-UX-15). */
export function formatHoraChat(
  value: string | Date | null | undefined,
  ahora: Date = new Date(),
  timeZone: string = ZONA_POR_DEFECTO,
): string {
  if (!value) return "";
  const formatoDia = new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeZone });
  const deHoy = formatoDia.format(new Date(value)) === formatoDia.format(ahora);
  return deHoy ? formatFechaHora(value, timeZone).split(" ")[1] ?? "" : formatDate(value, timeZone);
}

export function formatLatency(ms: number): string {
  return `${numberFmt.format(ms)} ms`;
}

/** Número de la píldora de pendientes: tope `99+` como en las apps de chat. */
export function contadorPendientes(n: number): string {
  return n > 99 ? "99+" : String(Math.max(0, n));
}

/** Texto accesible de los mensajes que esperan respuesta. */
export function textoPendientes(n: number): string {
  if (n > 99) return "Más de 99 mensajes sin responder";
  if (n === 1) return "1 mensaje sin responder";
  return `${n} mensajes sin responder`;
}

export function formatList(value: string[]): string {
  return value.join(", ");
}

export function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Valor arbitrario de un pack → texto legible (nunca "undefined"/"[object Object]"). */
export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (Array.isArray(value)) return value.map((v) => formatCellValue(v)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
