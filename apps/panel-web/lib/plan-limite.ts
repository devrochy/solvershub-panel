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

/** Texto bajo la barra del crédito cuando el core no pudo medir el consumo en créditos. */
export const CREDITO_SIN_MEDICION = "1 crédito = COP 10. La medición del consumo en créditos llega pronto.";

type Credito = NonNullable<PlanResponse["credit"]>;

/** Umbrales de aviso del crédito mensual (SPEC-03): 80 % y 100 %. */
export const AVISO_CREDITO_ALTO = 80;
export const AVISO_CREDITO_AGOTADO = 100;

export type AvisoDeCredito = { nivel: "alto" | "agotado"; titulo: string; texto: string };

/**
 * Aviso del crédito mensual (HU-BILL-04/06, ADR-0144 del backend). Solo avisa: al tope el asistente
 * sigue respondiendo (el bloqueo llega con HU-BILL-06) y los topes de volumen actuales siguen activos.
 */
export function avisoDeCredito(credit: Credito | null | undefined, reinicio?: string): AvisoDeCredito | null {
  if (!credit || credit.percent === null || credit.percent === undefined) return null;
  const cuando = reinicio ? ` El crédito se renueva el ${reinicio}.` : "";
  if (credit.percent >= AVISO_CREDITO_AGOTADO) {
    return {
      nivel: "agotado",
      titulo: "Usaste todo el crédito del mes",
      texto: `Por ahora tu asistente sigue respondiendo. Mejora tu plan para tener más crédito cada mes.${cuando}`,
    };
  }
  if (credit.percent >= AVISO_CREDITO_ALTO) {
    return {
      nivel: "alto",
      titulo: `Llevas el ${Math.floor(credit.percent)} % del crédito del mes`,
      texto: `Cuando llegues al 100 % te lo avisaremos aquí. Si crees que no te alcanza, mejora tu plan.${cuando}`,
    };
  }
  return null;
}

/** Nombre legible de cada concepto del desglose del crédito (`credit.by_concept`). */
export const CONCEPTOS_DE_CREDITO: Record<string, string> = {
  llm_turn: "Respuestas del asistente (IA)",
  stt: "Notas de voz",
  vision: "Imágenes",
  template_sent: "Plantillas enviadas",
};

/** Desglose por concepto con nombre legible, de mayor a menor, sin los que están en cero. */
export function desgloseDeCredito(credit: Credito | null | undefined): { concepto: string; usado: number }[] {
  return Object.entries(credit?.by_concept ?? {})
    .filter(([, usado]) => usado > 0)
    .map(([clave, usado]) => ({ concepto: CONCEPTOS_DE_CREDITO[clave] ?? clave, usado }))
    .sort((a, b) => b.usado - a.usado);
}

/** Créditos para mostrar: con un decimal solo si hace falta (0,5 · 12 · 1.234,5). */
export function formatoCreditos(valor: number): string {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(valor);
}
