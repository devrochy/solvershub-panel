import type { PlanResponse } from "@/lib/api/types";

/**
 * Planes por agentes (D-35, HU-BILL-05, ADR-0142 del backend). Lógica pura del panel:
 * qué mostrar primero en Plan y consumo y cómo reconocer el 409 de tope del plan.
 */

/** Adónde lleva «Mejorar mi plan». */
export const RUTA_MEJORAR_PLAN = "/plan";
export const TEXTO_MEJORAR_PLAN = "Mejorar mi plan";

/** ¿Es el 409 de tope del plan (`plan_limit_agentes`, `plan_limit_colaboradores`, …)? */
export function esLimiteDePlan(code: string | null | undefined): boolean {
  return typeof code === "string" && code.startsWith("plan_limit_");
}

type Uso = PlanResponse["usage"][number];

/** Las dimensiones que vende el plan (D-35), en este orden; el crédito va aparte. */
export const METRICAS_DEL_PLAN = ["agentes", "colaboradores"] as const;

/** Separa el consumo en lo que vende el plan (agentes, colaboradores) y el resto de topes. */
export function separarConsumo(usage: Uso[]): { delPlan: Uso[]; resto: Uso[] } {
  const delPlan = METRICAS_DEL_PLAN.flatMap((key) => usage.filter((u) => u.key === key));
  const resto = usage.filter((u) => !(METRICAS_DEL_PLAN as readonly string[]).includes(u.key));
  return { delPlan, resto };
}

/** Nombre legible de un tope del catálogo de planes (la API manda la clave de la métrica). */
const ETIQUETAS: Record<string, string> = {
  agentes: "Agentes publicados",
  colaboradores: "Colaboradores",
  clientes: "Clientes",
  conversaciones: "Conversaciones",
  conversaciones_audio: "Audios",
  conversaciones_ocr: "Imágenes (OCR)",
  mensajes: "Mensajes",
  costo_llm_usd: "Costo LLM (USD)",
};

export function etiquetaDeLimite(key: string): string {
  return ETIQUETAS[key] ?? key;
}

/** Topes del catálogo con las dimensiones del plan primero. */
export function limitesOrdenados(limits: Record<string, number | null>): [string, number | null][] {
  const entradas = Object.entries(limits);
  const primero = (k: string) => {
    const i = (METRICAS_DEL_PLAN as readonly string[]).indexOf(k);
    return i === -1 ? METRICAS_DEL_PLAN.length : i;
  };
  return entradas.sort(([a], [b]) => primero(a) - primero(b));
}

/** Texto bajo la barra del crédito mientras el core no mide el consumo en créditos. */
export const CREDITO_SIN_MEDICION = "1 crédito = COP 10. La medición del consumo en créditos llega pronto.";

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
