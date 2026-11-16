import type { AgentTemplate } from "@/lib/api/types";

/**
 * Lógica pura del paso «Identidad» de Nuevo agente (HU-AOS-77, antes el asistente de HU-AOS-54). El guion
 * lo sirve la API (`questions` de cada plantilla); aquí se marcan los valores sugeridos y se arma el cuerpo
 * de `POST /admin/agents/from-script`. Las reglas de fondo siguen en la API.
 */

export const NOMBRE_MAX = 120;

export type EstadoDelAsistente = {
  /** Key de la plantilla elegida. */
  plantilla: string | null;
  /** `id de la pregunta` → id de la opción. */
  respuestas: Record<string, string>;
  nombre: string;
};

export const ESTADO_INICIAL: EstadoDelAsistente = { plantilla: null, respuestas: {}, nombre: "" };

/** Respuestas con el valor por defecto de cada pregunta de opción (lo que ya viene marcado como sugerido). */
export function respuestasPorDefecto(plantilla: AgentTemplate): Record<string, string> {
  return Object.fromEntries(
    plantilla.questions.flatMap((q) => (q.type === "option" && q.default ? [[q.id, q.default]] : [])),
  );
}

/** Estado al elegir un tipo de agente: sus respuestas por defecto y el nombre vacío. */
export function elegirTipo(plantilla: AgentTemplate): EstadoDelAsistente {
  return { plantilla: plantilla.key, respuestas: respuestasPorDefecto(plantilla), nombre: "" };
}

/** Cuerpo de `POST /admin/agents/from-script`. Solo viajan respuestas de preguntas que el guion tiene. */
export function cuerpoDeCreacion(
  estado: EstadoDelAsistente,
  plantilla: AgentTemplate,
): { template_key: string; answers: Record<string, string>; name?: string } {
  const conocidas = new Set(plantilla.questions.map((q) => q.id));
  const answers = Object.fromEntries(Object.entries(estado.respuestas).filter(([id]) => conocidas.has(id)));
  const name = estado.nombre.trim();
  return { template_key: plantilla.key, answers, ...(name ? { name } : {}) };
}

/** Texto de «Paso X de N» para el indicador visible y el lector de pantalla. */
export function textoDeAvance(indice: number, total: number): string {
  return `Paso ${indice + 1} de ${total}`;
}
