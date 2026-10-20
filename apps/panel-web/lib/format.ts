/** Formateo puro (es-CO). Responsabilidad única: convertir datos → texto. */

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

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "short" }).format(new Date(value));
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

/** Hora de un chat en la bandeja: la hora si es de hoy; si no, la fecha (HU-UX-15). */
export function formatHoraChat(
  value: string | Date | null | undefined,
  ahora: Date = new Date(),
): string {
  if (!value) return "";
  const fecha = new Date(value);
  const deHoy = fecha.toDateString() === ahora.toDateString();
  return new Intl.DateTimeFormat(
    "es-CO",
    deHoy ? { timeStyle: "short" } : { dateStyle: "short" },
  ).format(fecha);
}

export function formatLatency(ms: number): string {
  return `${numberFmt.format(ms)} ms`;
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
