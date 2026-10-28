/**
 * Aviso de tratamiento de datos (HU-CRM-16): lógica pura de la tarjeta de Configuración y de la ficha del
 * cliente. El texto del aviso se muestra en el chat; lo que el cliente responde queda como consentimiento
 * con la versión del texto. Nada de esto afirma cumplimiento de ninguna ley: el texto debe revisarlo quien
 * asesora legalmente al negocio.
 */
import type { components } from "@/lib/api/schema";

export type AvisoDatos = components["schemas"]["AvisoDatosOut"];
export type ConsentimientoDatos = components["schemas"]["ConsentimientoDatosOut"];
export type EstadoAviso = ConsentimientoDatos["estado"];

export const MAX_TEXTO_AVISO = 1000;

export const ESTADO_AVISO: Record<EstadoAviso, { etiqueta: string; tono: "success" | "danger" | "neutral" | "warning" }> = {
  sin_aviso: { etiqueta: "Aún sin aviso", tono: "neutral" },
  informado: { etiqueta: "Informado, sin respuesta", tono: "warning" },
  otorgado: { etiqueta: "Aceptó el tratamiento de datos", tono: "success" },
  revocado: { etiqueta: "No autoriza guardar sus datos", tono: "danger" },
};

export const ORIGEN_AVISO: Record<string, string> = {
  aviso_en_chat: "en el chat",
  ficha: "desde la ficha",
};

/** Cuerpo del PUT del aviso. `confirmo` solo importa al activarlo: el backend exige la revisión legal. */
export function cuerpoDelAviso(activo: boolean, texto: string, confirmo: boolean) {
  return { activo, texto: texto.trim(), confirmo_revision_legal: activo ? confirmo : false };
}

/** ¿Puede activar? Necesita confirmar la revisión legal y, si va a usar texto propio, que no esté vacío. */
export function puedeActivar(texto: string, confirmo: boolean, esBorrador: boolean): boolean {
  if (!confirmo) return false;
  return texto.trim().length > 0 || esBorrador;
}

/** Mensaje claro para un error del backend al guardar el aviso. */
export function mensajeDeErrorAviso(status: number | undefined, error?: string): string {
  if (status === 403) return "No tienes permiso para cambiar esto. Pídele acceso a quien administra el negocio.";
  if (status === 422) return error && error.trim() ? error : "Revisa el texto del aviso e inténtalo de nuevo.";
  return error && error.trim() ? error : "No se pudo guardar el aviso.";
}

/** ¿Vale la pena mostrar este bloque en la ficha? Solo con el aviso activo o si ya hay historia. */
export function mostrarEnFicha(datos: ConsentimientoDatos | null): boolean {
  return Boolean(datos && (datos.aviso_activo || datos.historial.length > 0));
}

/** El dueño puede retirar los datos mientras no estén ya retirados. */
export function puedeRetirarDatos(datos: ConsentimientoDatos | null): boolean {
  return Boolean(datos) && datos?.estado !== "revocado";
}

/** Mensaje claro para un error al retirar los datos (solo dueño o master). */
export function mensajeDeErrorAlRetirar(status: number | undefined, error?: string): string {
  if (status === 403) return "Solo el propietario del negocio puede retirar los datos de un cliente.";
  return error && error.trim() ? error : "No se pudieron retirar los datos.";
}
