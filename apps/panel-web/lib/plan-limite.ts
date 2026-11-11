import type { PlanResponse } from "@/lib/api/types";

/**
 * Planes por agentes (D-35, HU-BILL-05, ADR-0142 del backend). Lógica pura del panel: cómo
 * reconocer el 409 de tope del plan, el orden de los topes y el enlace para terminar un pago.
 * Lo que se muestra en Consumo y plan, en palabras, vive en `lib/consumo.ts`.
 */

/** Adónde lleva «Mejorar mi plan». */
export const RUTA_MEJORAR_PLAN = "/plan";
export const TEXTO_MEJORAR_PLAN = "Mejorar mi plan";

/** ¿Es el 409 de tope del plan (`plan_limit_agentes`, `plan_limit_colaboradores`, …)? */
export function esLimiteDePlan(code: string | null | undefined): boolean {
  return typeof code === "string" && code.startsWith("plan_limit_");
}

/** Las dimensiones que vende el plan (D-35), en este orden; el crédito va aparte. */
export const METRICAS_DEL_PLAN = ["agentes", "colaboradores"] as const;

/** Topes del catálogo con las dimensiones del plan primero. */
export function limitesOrdenados(limits: Record<string, number | null>): [string, number | null][] {
  const entradas = Object.entries(limits);
  const primero = (k: string) => {
    const i = (METRICAS_DEL_PLAN as readonly string[]).indexOf(k);
    return i === -1 ? METRICAS_DEL_PLAN.length : i;
  };
  return entradas.sort(([a], [b]) => primero(a) - primero(b));
}

type Pago = Pick<PlanResponse["payments"][number], "status" | "checkout_url">;

const PAGO_PENDIENTE = new Set(["pending", "pendiente"]);

/**
 * Enlace para terminar un pago del plan (HU-UX-12): solo si sigue pendiente y trae su
 * checkout. Se exige `https:` para no pintar como enlace una URL rara de la API.
 */
export function enlaceDePago(pago: Pago): string | null {
  if (!PAGO_PENDIENTE.has(pago.status) || !pago.checkout_url) return null;
  try {
    return new URL(pago.checkout_url).protocol === "https:" ? pago.checkout_url : null;
  } catch {
    return null;
  }
}

/** Nombre legible de cada concepto del desglose del crédito (`credit.by_concept`). */
export const CONCEPTOS_DE_CREDITO: Record<string, string> = {
  llm_turn: "Respuestas del asistente (IA)",
  stt: "Notas de voz",
  vision: "Imágenes",
  template_sent: "Plantillas enviadas",
};
