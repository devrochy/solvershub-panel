import type { AgentOverviewItem, AgentTemplate } from "@/lib/api/types";
import type { TipoDeNegocio } from "@/lib/onboarding";
import { nombreSugeridoDelTipo } from "@/lib/ruta-de-lanzamiento";

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

// ------------------------------------------------------------------ tipo ocupado (HU-AOS-86, D-SPEC-49-3)

/** Lo que hace falta de cada agente del negocio (`AgentOverviewItem` de `/admin/agents/overview`). */
export type AgenteDelNegocio = Pick<AgentOverviewItem, "id" | "key" | "name" | "status" | "virtual">;

/** El agente que ya ocupa el tipo de la plantilla: activo (se edita) o archivado (se desarchiva). */
export type Ocupado = { id: string; nombre: string; archivado: boolean };

/**
 * El agente que ya tiene la `key` de la plantilla, o `null`. La regla del backend (`_agente_por_key`)
 * cuenta todo agente no borrado, archivado incluido; los virtuales no son agentes del negocio. Si hay
 * uno activo y otro archivado, manda el activo (es el que se edita).
 */
export function ocupadoDe(plantillaKey: string, agentes: readonly AgenteDelNegocio[]): Ocupado | null {
  const delTipo = agentes.filter((a) => a.key === plantillaKey && !a.virtual && a.id);
  const elegido = delTipo.find((a) => a.status !== "archived") ?? delTipo[0];
  if (!elegido?.id) return null;
  return { id: elegido.id, nombre: elegido.name.trim() || plantillaKey, archivado: elegido.status === "archived" };
}

/** El texto de la tarjeta ocupada (el mismo del 409 `key_taken` del backend). */
export function textoDeOcupado(nombreDelTipo: string, archivado: boolean): string {
  return archivado
    ? `Ya tienes un agente «${nombreDelTipo}», pero está archivado.`
    : `Ya tienes un agente «${nombreDelTipo}»: edítalo en vez de crear otro.`;
}

/** Una plantilla se puede elegir si está en el servicio y nadie ocupa su tipo. */
export function sePuedeElegir(plantilla: AgentTemplate, agentes: readonly AgenteDelNegocio[]): boolean {
  return plantilla.available && ocupadoDe(plantilla.key, agentes) === null;
}

/** El tipo recomendado: el primero libre y disponible, en el orden de la API. `null` si no queda ninguno. */
export function primerTipoLibre(plantillas: readonly AgentTemplate[], agentes: readonly AgenteDelNegocio[]): AgentTemplate | null {
  return plantillas.find((p) => sePuedeElegir(p, agentes)) ?? null;
}

const TIPOS = new Set<TipoDeNegocio>(["ventas", "agenda", "cobranza", "suscripciones"]);

/** El tipo de negocio de una plantilla (para el nombre sugerido y el chat simulado), o `null` si no es uno de los 4. */
export function tipoDeLaPlantilla(key: string | null | undefined): TipoDeNegocio | null {
  return key && TIPOS.has(key as TipoDeNegocio) ? (key as TipoDeNegocio) : null;
}

/** El nombre sugerido de una plantilla: el primero del tipo («Tomás» en Agenda) o, si no es uno de los 4, su nombre. */
export function nombreSugeridoDe(plantilla: AgentTemplate): string {
  const tipo = tipoDeLaPlantilla(plantilla.key);
  return tipo ? nombreSugeridoDelTipo(tipo) : plantilla.name;
}

/** Estado recomendado de la estación 1: el tipo libre, su guion por defecto y su nombre sugerido. */
export function estadoRecomendado(plantillas: readonly AgentTemplate[], agentes: readonly AgenteDelNegocio[]): EstadoDelAsistente {
  const libre = primerTipoLibre(plantillas, agentes);
  return libre ? { ...elegirTipo(libre), nombre: nombreSugeridoDe(libre) } : ESTADO_INICIAL;
}
