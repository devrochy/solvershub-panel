import type { AgentTemplate, Question } from "@/lib/api/types";

/**
 * Lógica pura del asistente de creación de agentes (HU-AOS-54, SPEC-39). El guion lo sirve la API
 * (`questions` de cada plantilla); aquí solo se ordenan los pasos, se validan las respuestas y se
 * arma el cuerpo de `POST /admin/agents/from-script`. Las reglas de fondo siguen en la API.
 */

/** Máximo de pasos del asistente, contando el de elegir el tipo y el de revisar (ADR-0171). */
export const MAX_PASOS = 10;
export const NOMBRE_MAX = 120;

export type PasoAsistente =
  | { id: "tipo"; titulo: string }
  | { id: string; titulo: string; pregunta: Question }
  | { id: "nombre"; titulo: string }
  | { id: "contenido"; titulo: string }
  | { id: "revisar"; titulo: string };

export type EstadoDelAsistente = {
  /** Key de la plantilla elegida (paso 1). */
  plantilla: string | null;
  /** `id de la pregunta` → id de la opción (o el texto, en la de nombre). */
  respuestas: Record<string, string>;
  nombre: string;
};

export const ESTADO_INICIAL: EstadoDelAsistente = { plantilla: null, respuestas: {}, nombre: "" };

const PASO_TIPO: PasoAsistente = { id: "tipo", titulo: "¿Qué quieres que haga?" };
const PASOS_FINALES: PasoAsistente[] = [
  { id: "nombre", titulo: "¿Cómo se llama?" },
  { id: "contenido", titulo: "Lo que ya tienes cargado" },
  { id: "revisar", titulo: "Revisar y crear" },
];

/** Ids de pasos reservados: una pregunta de la API con uno de estos no puede pisarlos. */
const RESERVADOS = new Set(["tipo", "nombre", "contenido", "revisar"]);

/**
 * Pasos para la plantilla elegida: tipo → una por pregunta del guion → nombre → contenido → revisar.
 * Sin plantilla, solo el primero. Nunca más de `MAX_PASOS`: si el guion trae de más, sobran las últimas
 * preguntas (la API las rellena con su valor por defecto).
 */
export function pasosDelAsistente(plantilla: AgentTemplate | null | undefined): PasoAsistente[] {
  if (!plantilla) return [PASO_TIPO];
  const preguntas = plantilla.questions
    .filter((q) => q.type === "option" && !RESERVADOS.has(q.id))
    .slice(0, MAX_PASOS - 1 - PASOS_FINALES.length)
    .map<PasoAsistente>((q) => ({ id: q.id, titulo: q.text, pregunta: q }));
  return [PASO_TIPO, ...preguntas, ...PASOS_FINALES];
}

/** Respuestas con el valor por defecto de cada pregunta de opción (lo que ya viene marcado). */
export function respuestasPorDefecto(plantilla: AgentTemplate): Record<string, string> {
  return Object.fromEntries(
    plantilla.questions.flatMap((q) => (q.type === "option" && q.default ? [[q.id, q.default]] : [])),
  );
}

/** Estado al elegir un tipo de agente: sus respuestas por defecto y el nombre vacío. */
export function elegirTipo(plantilla: AgentTemplate): EstadoDelAsistente {
  return { plantilla: plantilla.key, respuestas: respuestasPorDefecto(plantilla), nombre: "" };
}

/** Mensaje de error del paso, o `undefined` si se puede avanzar. */
export function errorDelPaso(
  paso: PasoAsistente,
  estado: EstadoDelAsistente,
  plantilla: AgentTemplate | null | undefined,
): string | undefined {
  if (paso.id === "tipo") {
    if (!plantilla) return "Elige qué quieres que haga tu agente.";
    if (!plantilla.available) return "Para este tipo de agente falta activar una habilidad.";
    return undefined;
  }
  if (paso.id === "nombre") {
    return estado.nombre.trim().length > NOMBRE_MAX ? `Máximo ${NOMBRE_MAX} caracteres.` : undefined;
  }
  if ("pregunta" in paso) {
    const valor = estado.respuestas[paso.pregunta.id];
    return paso.pregunta.options.some((o) => o.id === valor) ? undefined : "Elige una de las opciones.";
  }
  return undefined;
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

/** Índice del paso al que pertenece un error de campo de la API (`id de la pregunta` o `name`). */
export function pasoDelCampo(campo: string, pasos: PasoAsistente[]): number {
  const i = pasos.findIndex((p) => p.id === campo || (campo === "name" && p.id === "nombre"));
  return i >= 0 ? i : pasos.length - 1;
}

/** Texto de «Paso X de N» para el indicador visible y el lector de pantalla. */
export function textoDeAvance(indice: number, total: number): string {
  return `Paso ${indice + 1} de ${total}`;
}

/** Texto de la respuesta elegida, para el resumen final. */
export function textoDeRespuesta(pregunta: Question, estado: EstadoDelAsistente): string {
  return pregunta.options.find((o) => o.id === estado.respuestas[pregunta.id])?.text ?? "—";
}
