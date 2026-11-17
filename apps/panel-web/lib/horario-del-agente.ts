import type { components } from "@/lib/api/schema";
import { horarioEnPalabras } from "@/lib/configuracion-resumen";
import type { Franja } from "@/lib/horario-atencion";

/** Horario propio del agente (SPEC-47, HU-AOS-82, D-SPEC-47-5): heredado del negocio o solo suyo. */

export type HorarioDelAgente = components["schemas"]["AgentScheduleOut"];

export function franjasDe(horario: Record<string, unknown> | null | undefined): Franja[] {
  const ranges = horario && Array.isArray(horario.ranges) ? horario.ranges : [];
  return ranges
    .filter((r): r is Franja => typeof r === "object" && r !== null && typeof (r as Franja).day === "number")
    .map((r) => ({ day: r.day, from: String(r.from), to: String(r.to) }));
}

export function zonaDe(horario: Record<string, unknown> | null | undefined, porDefecto: string): string {
  return typeof horario?.tz === "string" && horario.tz ? horario.tz : porDefecto;
}

export function enPalabras(horario: Record<string, unknown> | null | undefined): string {
  const franjas = franjasDe(horario);
  return franjas.length ? horarioEnPalabras(franjas) : "Sin horario definido";
}

/** Qué impide guardar el horario propio, o `null`. */
export function problemaDelHorario(franjas: readonly Franja[]): string | null {
  if (franjas.length === 0) return "Elige al menos un día con horas, o vuelve al horario del negocio.";
  const mal = franjas.findIndex((f) => !(f.from < f.to));
  return mal >= 0 ? "Cada franja necesita una hora de inicio anterior a la de fin." : null;
}
