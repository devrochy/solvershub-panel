import type { AgenteResumen, KpiResumen, ResumenPorAgente } from "@/lib/api/types";

import { valorDeKpi } from "./kpi";

/**
 * Qué cifras salen en el título de la tarjeta de un agente cuando está plegada: las dos que mejor
 * dicen cómo va su módulo. Un agente gestiona un solo módulo (ADR-0171); sin módulo, su actividad.
 */
const CIFRAS_DEL_MODULO: Record<string, readonly string[]> = {
  pack_commerce: ["ventas_pagadas", "pedidos"],
  pack_calendar: ["citas_hoy", "citas_agendadas"],
  pack_cobranza: ["recaudo", "cartera_en_mora"],
  pack_subscriptions: ["mrr", "mora"],
};
const CIFRAS_DE_ACTIVIDAD = ["turnos", "conversaciones"] as const;

export type CifraDelTitulo = { id: string; label: string; valor: string };

/** El Coordinador (`core`) no es tarjeta: sus turnos cuentan en el bloque del negocio. */
export function esTarjetaDeAgente(a: Pick<AgenteResumen, "key" | "kind">): boolean {
  return a.kind !== "core";
}

/** Solo los back-office llevan insignia de tipo: «especialista» es lo normal y no aporta. */
export function llevaInsignia(a: Pick<AgenteResumen, "kind">): boolean {
  return a.kind === "backoffice";
}

export function agentesConTarjeta(datos: ResumenPorAgente): AgenteResumen[] {
  return datos.agentes.filter(esTarjetaDeAgente);
}

/** Los módulos activos que ningún agente cubre: el backend los entrega en el bloque del negocio (ADR-0192). */
export function modulosSinAgente(datos: ResumenPorAgente) {
  return datos.general.modulos_sin_agente ?? [];
}

function aCifra(k: KpiResumen): CifraDelTitulo {
  return { id: k.id, label: k.label, valor: valorDeKpi(k) };
}

/** Dos cifras (a lo sumo) para el título plegado: las del módulo del agente o, sin módulo, su actividad. */
export function cifrasDelTitulo(a: AgenteResumen): CifraDelTitulo[] {
  const modulo = a.modulos.find((m) => !m.error && m.kpis.length > 0);
  const ids = modulo ? (CIFRAS_DEL_MODULO[modulo.id] ?? []) : CIFRAS_DE_ACTIVIDAD;
  const fuente = modulo ? modulo.kpis : a.kpis;
  const elegidas = ids.flatMap((id) => fuente.filter((k) => k.id === id));
  // Un módulo que el panel aún no conoce: sus dos primeras cifras.
  const final = elegidas.length > 0 ? elegidas : fuente.slice(0, 2);
  return final.slice(0, 2).map(aCifra);
}
