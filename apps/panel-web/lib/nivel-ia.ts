import type { AgentDetail } from "@/lib/api/types";

/**
 * Nivel de IA por agente (HU-BILL-24, ADR-0210; panel en HU-BILL-27). El negocio elige Estándar o
 * Avanzado y nunca ve qué modelo corre: aquí solo hay el nombre del nivel y su gasto aproximado.
 */
export type NivelIa = AgentDetail["nivel_ia"];

/**
 * Créditos aproximados por conversación de cada nivel, calibrados en HU-BILL-29. Son una guía para
 * elegir, no un precio: el gasto real depende de cada conversación.
 */
export const CREDITOS_POR_CONVERSACION: Record<NivelIa, number> = { estandar: 11, avanzado: 45 };

export const NIVELES_IA: readonly { value: NivelIa; label: string; descripcion: string }[] = [
  { value: "estandar", label: "Estándar", descripcion: "Responde bien la mayoría de las conversaciones." },
  { value: "avanzado", label: "Avanzado", descripcion: "Razona mejor los casos difíciles y gasta más crédito." },
];

/** «≈ 11 créditos por conversación». */
export function creditosEnPalabras(nivel: NivelIa): string {
  return `≈ ${CREDITOS_POR_CONVERSACION[nivel]} créditos por conversación`;
}

/** El aviso que acompaña al selector: el cambio no corre hasta publicar. */
export const SE_APLICA_AL_PUBLICAR = "Se aplica al publicar: hasta entonces tus clientes siguen con el nivel actual.";

/**
 * ¿El plan actual incluye el nivel Avanzado? `null` si no se sabe (el plan no se pudo leer, p. ej. un
 * colaborador sin la sección Plan): entonces no se bloquea y decide la API con su 409.
 */
export function incluyeAvanzado(funciones: Record<string, unknown> | null): boolean | null {
  if (!funciones) return null;
  return funciones.nivel_ia === "avanzado";
}
