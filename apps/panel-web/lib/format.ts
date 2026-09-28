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

export function formatCop(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
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
