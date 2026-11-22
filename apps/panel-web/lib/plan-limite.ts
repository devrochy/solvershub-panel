import type { AgentsOverview, MePlanSummary, PlanResponse } from "@/lib/api/types";

/**
 * Planes por agentes (D-35, HU-BILL-05, ADR-0142 del backend) y por créditos (D-79, HU-BILL-27).
 * Lógica pura del panel: cómo reconocer el 409 de tope o de alcance del plan, el orden de los topes y el enlace para terminar un pago.
 * Lo que se muestra en Consumo y plan, en palabras, vive en `lib/consumo.ts`.
 */

/** Adónde lleva «Mejorar mi plan». */
export const RUTA_MEJORAR_PLAN = "/plan";
export const TEXTO_MEJORAR_PLAN = "Mejorar mi plan";

/**
 * Los 409 de alcance del plan v3 (HU-BILL-19, ADR-0208): lo pedido no viene en el plan actual (un canal,
 * una habilidad o una función). Se muestran como los topes: el mensaje de la API y «Mejorar mi plan».
 */
export const FUERA_DEL_PLAN = [
  "plan_channel_not_included",
  "plan_plugin_not_included",
  "plan_feature_not_included",
  // HU-BILL-24: el nivel de IA Avanzado no viene en el plan (`details = {nivel_ia, plan}`).
  "plan_nivel_ia_not_included",
] as const;

/**
 * ¿Es un 409 del plan que se resuelve mejorándolo? Los topes (`plan_limit_agentes`,
 * `plan_limit_conexiones`, `plan_limit_correos`, …) y lo que el plan no incluye (`FUERA_DEL_PLAN`).
 */
export function esLimiteDePlan(code: string | null | undefined): boolean {
  if (typeof code !== "string") return false;
  return code.startsWith("plan_limit_") || (FUERA_DEL_PLAN as readonly string[]).includes(code);
}

/**
 * El mensaje que se muestra con «Mejorar mi plan» si la respuesta de error del BFF es del plan; `null` si no.
 * La API ya explica el caso («Tu plan Basic no incluye Instagram…»); `respaldo` cubre un error sin texto.
 */
export function mensajeDeLimiteDePlan(
  error: { code?: string | null; error?: string | null } | null | undefined,
  respaldo = "Tu plan no incluye esto.",
): string | null {
  if (!error || !esLimiteDePlan(error.code)) return null;
  return error.error || respaldo;
}

type CuotaDeAgentes = AgentsOverview["cuota_agentes"];

/**
 * Aviso para no abrir el asistente de creación cuando el plan ya tiene todos sus agentes
 * publicados. `null` si hay cupo, si el plan no limita o si el billing no respondió.
 */
export function avisoDeTopeDeAgentes(cuota: CuotaDeAgentes): string | null {
  if (!cuota || cuota.allowed || cuota.limit === null) return null;
  const permitidos = cuota.limit === 1 ? "1 agente publicado" : `${cuota.limit} agentes publicados`;
  return `Tu plan permite ${permitidos} y ya tienes ${cuota.used}. Mejora tu plan para crear otro agente.`;
}

/**
 * Los topes estructurales del plan v3 (D-79, SPEC-51), en este orden: solo bloquean un alta. El consumo
 * (conversaciones, notas de voz, imágenes, mensajes) sale del crédito y ya no tiene tope propio.
 */
export const METRICAS_DEL_PLAN = ["agentes", "colaboradores", "clientes", "conexiones", "correos"] as const;

/** Lo que se lista de un plan del catálogo: los topes estructurales y los del pack de conocimiento (ADR-0145). */
const TOPES_DEL_CATALOGO: readonly string[] = [...METRICAS_DEL_PLAN, "documentos", "conocimiento_mb"];

/** Topes del catálogo en el orden de arriba, sin las claves que el plan v3 ya no vende (conversaciones, mensajes…). */
export function limitesOrdenados(limits: Record<string, number | null>): [string, number | null][] {
  return Object.entries(limits)
    .filter(([clave]) => TOPES_DEL_CATALOGO.includes(clave))
    .sort(([a], [b]) => TOPES_DEL_CATALOGO.indexOf(a) - TOPES_DEL_CATALOGO.indexOf(b));
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

/** ¿El negocio está en Free (o sin suscripción) y por tanto se le ofrece mejorar? */
export function esPlanFree(plan: MePlanSummary | null | undefined): boolean {
  return !!plan && (!plan.has_plan || plan.plan_id === "free");
}

export type AvisoDePlanFree = {
  tono: "warning" | "danger";
  titulo: string;
  texto: string;
  cta: string;
};

/**
 * Texto del recordatorio de plan Free (HU-BILL-15). Informativo: nunca bloquea una acción;
 * solo cambia el tono cuando la prueba ya venció.
 */
export function avisoDePlanFree(plan: MePlanSummary | null | undefined): AvisoDePlanFree | null {
  if (!esPlanFree(plan)) return null;
  const vencido =
    !plan?.has_plan ||
    plan?.status === "expired" ||
    plan?.status === "canceled" ||
    plan?.status === "past_due";
  if (vencido) {
    return {
      tono: "danger",
      titulo: "Tu plan Free terminó",
      texto: "Tu asistente dejó de atender clientes nuevos. Reactívalo con un plan pago y sigue operando.",
      cta: TEXTO_MEJORAR_PLAN,
    };
  }
  const dias = plan?.days_left;
  const restante =
    dias === 1
      ? "Te queda 1 día de prueba."
      : dias != null && dias > 0
        ? `Te quedan ${dias} días de prueba.`
        : "Tu prueba está por terminar.";
  return {
    tono: "warning",
    titulo: "Estás en el plan Free",
    texto: `${restante} Con un plan pago tienes más agentes, canales y crédito mensual.`,
    cta: TEXTO_MEJORAR_PLAN,
  };
}

/** Las funciones (`features`) del plan actual, o `null` si el plan no se pudo leer. */
export function funcionesDelPlanActual(plan: PlanResponse | null | undefined): Record<string, unknown> | null {
  const actual = plan?.plans.find((p) => p.current);
  return actual ? actual.features : null;
}

/** ¿El plan actual exporta conversaciones (`features.exportar`, HU-BILL-25)? `null` si no se sabe. */
export function incluyeExportar(funciones: Record<string, unknown> | null): boolean | null {
  if (!funciones) return null;
  return funciones.exportar === true;
}

/** El aviso de una conversación fuera del historial del plan (409 `plan_feature_not_included`, `feature = historial`). */
export type AvisoDeHistorial = { titulo: string; descripcion: string };

/**
 * Si el error de la API es el 409 de historial (HU-BILL-25), el aviso en palabras; si no, `null`.
 * `historial_dias` sale de `error.details`; sin él, el aviso no cita los días.
 */
export function avisoDeHistorial(
  error: { status?: number; code?: string | null; details?: Record<string, unknown> | null } | null | undefined,
): AvisoDeHistorial | null {
  if (!error || error.code !== "plan_feature_not_included" || error.details?.feature !== "historial") return null;
  const dias = error.details?.historial_dias;
  if (typeof dias === "number" && dias > 0) {
    const n = dias === 1 ? "1 día" : `${dias} días`;
    return {
      titulo: `Esta conversación es de hace más de ${n}`,
      descripcion: `Tu plan muestra ${n} de historial. No se borró nada: al mejorar tu plan la vuelves a ver.`,
    };
  }
  return {
    titulo: "Esta conversación es más antigua que el historial de tu plan",
    descripcion: "No se borró nada: al mejorar tu plan la vuelves a ver.",
  };
}
