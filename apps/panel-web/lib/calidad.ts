/**
 * Calidad del asistente (HU-AOS-29): lógica pura del tablero de fiabilidad. Filtros (período y
 * conexión), porcentajes legibles y nombres de lo que devuelve `/admin/reliability`, `/admin/usage`
 * y `/admin/evals/runs`.
 */

import { diasValidos, puedeEscribirConocimiento } from "@/lib/agentes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type FiltrosDeCalidad = { dias: number; conexion: string | null };

export function filtrosDeCalidad(sp: Record<string, string | undefined>): FiltrosDeCalidad {
  return { dias: diasValidos(sp.dias), conexion: sp.conexion && UUID.test(sp.conexion) ? sp.conexion : null };
}

/** Query de la API: ventana (`desde`) y conexión. */
export function queryDeCalidad(f: FiltrosDeCalidad, ahora: Date = new Date()): string {
  const qs = new URLSearchParams();
  qs.set("desde", new Date(ahora.getTime() - f.dias * 86_400_000).toISOString());
  if (f.conexion) qs.set("connection_id", f.conexion);
  return qs.toString();
}

/** Fracción de 0 a 1 en porcentaje con un decimal; `null` («sin datos suficientes») es «—». */
export function porcentaje(fraccion: number | null | undefined): string {
  if (fraccion === null || fraccion === undefined) return "—";
  return `${(Math.round(fraccion * 1000) / 10).toLocaleString("es-CO")} %`;
}

/** «1 turno» / «3 turnos»: el número con su palabra en singular o plural. */
export function cuenta(n: number, uno: string, varios: string): string {
  return `${n.toLocaleString("es-CO")} ${n === 1 ? uno : varios}`;
}

/** Latencia en segundos legibles. */
export function segundos(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  return ms < 1000 ? `${ms} ms` : `${(Math.round(ms / 100) / 10).toLocaleString("es-CO")} s`;
}

const RECHAZOS: Record<string, string> = {
  links_sin_respaldo: "Enlaces sin respaldo",
  monto_sin_evidencia: "Montos sin respaldo",
  status_sin_evidencia: "Estados sin respaldo",
  referencia_sin_evidencia: "Referencias sin respaldo",
  verificador: "El verificador falló",
};

/** Nombre legible de un tipo de rechazo del verificador; los desconocidos, con su clave. */
export function tipoDeRechazo(kind: string): string {
  return RECHAZOS[kind] ?? kind.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
}

const MODOS: Record<string, string> = {
  query: "Consulta",
  delegate: "Encargo",
  handoff: "Pase de conversación",
  broadcast: "Difusión",
  collaborate: "Colaboración",
};

export function modoA2A(modo: string | null | undefined): string {
  return modo ? (MODOS[modo] ?? modo) : "—";
}

const ORIGENES: Record<string, string> = { gate: "Antes de publicar", manual: "Manual", nightly: "Nocturna" };

export function origenDeCorrida(origen: string): string {
  return ORIGENES[origen] ?? origen;
}

/** ¿Puede marcar falsos positivos? Escritura en `agents` (o master), igual que el conocimiento. */
export const puedeMarcar = puedeEscribirConocimiento;
