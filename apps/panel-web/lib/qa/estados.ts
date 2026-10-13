/**
 * Estados del centro de pruebas (SPEC-30) en lenguaje claro, con su tono e ícono: el color
 * nunca va solo (DESIGN.md · Accesibilidad). Mismas reglas que `core/qa/estados.py`.
 */
import type { QaProgreso } from "@/lib/api/types";

export type EstadoPaso = "ok" | "falla" | "bloqueado" | "omitido";
export type EstadoPrueba = "sin_correr" | "en_curso" | "omitida" | "ok" | "bloqueada" | "falla";
export type EstadoConfig = "pendiente" | "en_curso" | "listo" | "no_aplica";
export type Tono = "neutral" | "info" | "success" | "warning" | "danger";

export const ESTADO_PRUEBA: Record<EstadoPrueba, { label: string; tono: Tono }> = {
  sin_correr: { label: "Sin correr", tono: "neutral" },
  en_curso: { label: "En curso", tono: "info" },
  omitida: { label: "Omitida", tono: "neutral" },
  ok: { label: "OK", tono: "success" },
  bloqueada: { label: "Bloqueada", tono: "warning" },
  falla: { label: "Falla", tono: "danger" },
};

export const ESTADO_PASO: Record<EstadoPaso, { label: string; accion: string; tono: Tono; tecla: string }> = {
  ok: { label: "Aprobado", accion: "Aprobar", tono: "success", tecla: "A" },
  falla: { label: "Falla", accion: "Falla", tono: "danger", tecla: "F" },
  bloqueado: { label: "Bloqueado", accion: "Bloqueado", tono: "warning", tecla: "B" },
  omitido: { label: "Omitido", accion: "Omitir", tono: "neutral", tecla: "O" },
};

export const ESTADO_CONFIG: Record<EstadoConfig, { label: string; tono: Tono }> = {
  pendiente: { label: "Pendiente", tono: "neutral" },
  en_curso: { label: "En curso", tono: "info" },
  listo: { label: "Listo", tono: "success" },
  no_aplica: { label: "No aplica", tono: "neutral" },
};

const TERMINADOS: ReadonlySet<string> = new Set(["ok", "falla", "bloqueada", "omitida"]);

export function esTerminada(estado: string | undefined | null): boolean {
  return !!estado && TERMINADOS.has(estado);
}

export function etiquetaPrueba(estado: string | undefined | null): string {
  return ESTADO_PRUEBA[(estado ?? "sin_correr") as EstadoPrueba]?.label ?? "Sin correr";
}

export function tonoPrueba(estado: string | undefined | null): Tono {
  return ESTADO_PRUEBA[(estado ?? "sin_correr") as EstadoPrueba]?.tono ?? "neutral";
}

/** Estado de una prueba a partir de sus pasos marcados (`{"1": estado}`), como el backend. */
export function estadoDePrueba(totalPasos: number, pasos: Record<string, string | null | undefined>): EstadoPrueba {
  const marcados = Object.entries(pasos)
    .filter(([n, e]) => !!e && Number(n) >= 1 && Number(n) <= totalPasos)
    .map(([, e]) => e as string);
  if (marcados.length === 0) return "sin_correr";
  if (marcados.includes("falla")) return "falla";
  if (marcados.includes("bloqueado")) return "bloqueada";
  if (marcados.length < totalPasos) return "en_curso";
  return marcados.includes("ok") ? "ok" : "omitida";
}

export type Segmento = { clave: EstadoPrueba; valor: number; label: string; tono: Tono };

/** Segmentos de la barra de avance, en orden de lectura (lo bueno primero). */
export function segmentosDeProgreso(p: QaProgreso): Segmento[] {
  const orden: EstadoPrueba[] = ["ok", "falla", "bloqueada", "omitida", "en_curso"];
  return orden
    .map((clave) => ({ clave, valor: p[clave], label: ESTADO_PRUEBA[clave].label, tono: ESTADO_PRUEBA[clave].tono }))
    .filter((s) => s.valor > 0);
}

export function porcentaje(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((parte / total) * 100);
}

/**
 * Fecha del catálogo (`2026-10-13`, sin hora) en el formato corto del panel. `formatDate` la
 * leería como medianoche UTC y en Colombia mostraría el día anterior.
 */
export function fechaDeCatalogo(fecha: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : (fecha ?? "—");
}
