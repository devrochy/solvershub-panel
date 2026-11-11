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

const MESES = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."];

/**
 * Una fecha en palabras (PRU-04): «13 de oct.». Una fecha sin hora (`2026-10-13`, la del
 * catálogo) se lee tal cual: como medianoche UTC, en Colombia caería el día anterior.
 */
export function fechaEnPalabras(valor: string | null | undefined): string {
  if (!valor) return "—";
  const soloDia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (soloDia) return `${Number(soloDia[3])} de ${MESES[Number(soloDia[2]) - 1]}`;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

/** «del 12 de oct. al 3 de nov.»; sin fin, «desde el 12 de oct.». */
export function rangoEnPalabras(desde: string | null | undefined, hasta: string | null | undefined): string {
  return hasta ? `del ${fechaEnPalabras(desde)} al ${fechaEnPalabras(hasta)}` : `desde el ${fechaEnPalabras(desde)}`;
}

/** La prioridad que importa decir (PRU-03): las de humo (P0) son imprescindibles; las demás no llevan marca. */
export function prioridadEnPalabras(prioridad: string | null | undefined): string | null {
  return prioridad === "P0" ? "Imprescindible" : null;
}

const EN_EL_CICLO: Record<string, [string, string]> = {
  ok: ["la aprobó", "la aprobaron"],
  falla: ["con falla", "con falla"],
  bloqueada: ["bloqueada", "bloqueadas"],
  omitida: ["la omitió", "la omitieron"],
  en_curso: ["la está corriendo", "la están corriendo"],
};

/** Lo que pasó con la prueba en el ciclo, en una frase: «En este ciclo: 2 la aprobaron · 1 con falla». */
export function resumenDelCiclo(ejecuciones: Record<string, number> | null | undefined): string | null {
  const partes = Object.entries(ejecuciones ?? {})
    .filter(([, n]) => n > 0)
    .map(([estado, n]) => {
      const texto = EN_EL_CICLO[estado];
      return texto ? `${n} ${n === 1 ? texto[0] : texto[1]}` : `${n} ${estado.replaceAll("_", " ")}`;
    });
  return partes.length > 0 ? `En este ciclo: ${partes.join(" · ")}` : null;
}

/** Fecha del catálogo (`2026-10-13`, sin hora) en palabras. */
export function fechaDeCatalogo(fecha: string | null | undefined): string {
  return fechaEnPalabras(fecha);
}

/** «14 aprobadas · 3 con falla · 12 sin correr», sin los ceros. */
export function resumenDeAvance(p: QaProgreso): string {
  const partes: [number, string, string][] = [
    [p.ok, "aprobada", "aprobadas"],
    [p.falla, "con falla", "con falla"],
    [p.bloqueada, "bloqueada", "bloqueadas"],
    [p.omitida, "omitida", "omitidas"],
    [p.en_curso, "en curso", "en curso"],
    [p.sin_correr, "sin correr", "sin correr"],
  ];
  const texto = partes.filter(([n]) => n > 0).map(([n, uno, varios]) => `${n} ${n === 1 ? uno : varios}`);
  return texto.length > 0 ? texto.join(" · ") : "Sin pruebas";
}
