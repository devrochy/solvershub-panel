import type { AgentOverviewItem, AgentsOverview } from "@/lib/api/types";

/**
 * Qué módulos del negocio están habilitados (regla del dueño, 2026-11-12): un módulo se
 * habilita cuando tiene un **especialista publicado** y su pack está encendido. Sin
 * especialista, el módulo se ve en el menú con candado y su página explica cómo mejorar el
 * plan; no deja interactuar con los datos.
 *
 * La clave del agente es la de su plantilla (`core/presets/plantillas/*.json`); el pack es
 * el que esa plantilla habilita (ADR-0139).
 */
export const PACK_DEL_AGENTE: Readonly<Record<string, string>> = {
  ventas: "pack_commerce",
  agenda: "pack_calendar",
  cobranza: "pack_cobranza",
  suscripciones: "pack_subscriptions",
};

/** Los packs que el panel muestra como módulos de negocio (Agenda, Ventas, Suscripciones, Cobranza). */
export const PACKS_DE_MODULO = [
  "pack_commerce",
  "pack_calendar",
  "pack_subscriptions",
  "pack_cobranza",
] as const;

export type EstadoModulo = "habilitado" | "plan" | "pack";

export type PacksDelNegocio = Record<string, { enabled: boolean }>;

/**
 * ¿El agente es un especialista vivo que cubre un módulo? Cuenta el `specialist` y el
 * `backoffice` (los dos atienden trabajo del negocio); nunca el Coordinador (`core`).
 */
export function cuentaParaModulo(
  agente: Pick<AgentOverviewItem, "key" | "kind" | "published" | "virtual">,
): boolean {
  return agente.kind !== "core" && agente.published && !agente.virtual;
}

/** Packs que tienen al menos un especialista publicado. */
export function packsConAgente(agentes: Pick<AgentsOverview, "items"> | null): Set<string> {
  const packs = new Set<string>();
  for (const agente of agentes?.items ?? []) {
    if (!cuentaParaModulo(agente)) continue;
    const pack = PACK_DEL_AGENTE[agente.key];
    if (pack) packs.add(pack);
  }
  return packs;
}

/**
 * Estado de cada pack-módulo. `agentes === null` (sin permiso `agents` o consulta fallida)
 * conserva la regla anterior: manda el pack. Con datos de agentes, la regla es estricta.
 */
export function estadosDeModulos(
  packs: PacksDelNegocio,
  agentes: Pick<AgentsOverview, "items"> | null,
): Record<string, EstadoModulo> {
  const conAgente = packsConAgente(agentes);
  const estados: Record<string, EstadoModulo> = {};
  for (const pack of PACKS_DE_MODULO) {
    // Un pack que no vino en la consulta no se bloquea (la consulta pudo fallar).
    const encendido = packs[pack]?.enabled !== false;
    if (agentes === null) {
      estados[pack] = encendido ? "habilitado" : "pack";
    } else if (conAgente.has(pack)) {
      estados[pack] = encendido ? "habilitado" : "pack";
    } else {
      estados[pack] = "plan";
    }
  }
  return estados;
}

/** ¿La entrada del menú (con su pack) se puede usar? Las que no tienen pack, siempre. */
export function moduloHabilitado(
  estados: Record<string, EstadoModulo>,
  pack: string | undefined,
): boolean {
  return !pack || estados[pack] === "habilitado";
}
