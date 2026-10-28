/**
 * Interruptor «Avisos por canal» por negocio (ADR-0178 D2, ADR-0108).
 *
 * La bandera `tenants.settings.avisos_por_canal` nace apagada en cada negocio y solo la fija el master
 * (`GET|PUT /admin/platform/tenants/{id}/avisos-por-canal`). Con ella encendida, los avisos por evento también salen
 * como texto por QR, chat web, Messenger e Instagram, con el texto que el dueño escribió en Plantillas por evento.
 * El cuerpo válido del BFF y las reglas de permiso son las del interruptor de opciones directas.
 */
export { UUID, cuerpoValido, esMasterDePlataforma, esReintentable } from "@/lib/opciones-directas-bandera";

export const TITULO = "Avisos por canal";
export const DESCRIPCION =
  "Los avisos por evento (cobros, recordatorios, citas) también salen como texto por QR, chat web, Messenger e Instagram, con el texto que el negocio escribió para cada canal. Apagado de fábrica en cada negocio.";

export const ESTADO = { encendida: "Encendidos", apagada: "Apagados" } as const;

/** Qué se confirma al encender: qué envía, qué políticas siguen y cómo se apaga. */
export function confirmarEncender(negocio: string) {
  return {
    title: `¿Encender los avisos por canal en ${negocio}?`,
    description:
      "Esto habilita en este negocio el envío real, a clientes finales, de los avisos por evento como texto por QR, " +
      "chat web, Messenger e Instagram, cuando el negocio escribió un texto para ese canal. Por QR solo salen si la " +
      "conexión permite escribir primero y hay cupo del día; por Messenger e Instagram, solo dentro de las 24 horas; " +
      "los avisos de cobro no salen por QR. Enciéndelos primero en un negocio de prueba. " +
      "Para apagarlos, vuelve a este interruptor: es inmediato y no hay nada que limpiar.",
    confirmLabel: "Encender",
    destructive: false,
  };
}

/** Apagar es más liviano: avisa qué deja de pasar. */
export function confirmarApagar(negocio: string) {
  return {
    title: `¿Apagar los avisos por canal en ${negocio}?`,
    description:
      "Los avisos por evento vuelven a salir solo por WhatsApp, como siempre. Los textos por canal que escribió el " +
      "negocio se conservan.",
    confirmLabel: "Apagar",
    destructive: false,
  };
}

export function avisoDeExito(habilitada: boolean, negocio: string): string {
  return habilitada ? `Avisos por canal encendidos en ${negocio}.` : `Avisos por canal apagados en ${negocio}.`;
}

/** Mensaje de un error de la API para el master, sin lenguaje técnico. `0` = no hubo respuesta. */
export function mensajeDeError(status: number): string {
  if (status === 401) return "Tu sesión terminó. Vuelve a iniciar sesión.";
  if (status === 403) return "No tienes permiso para esto: solo el admin de plataforma puede encender o apagar los avisos por canal.";
  if (status === 404) return "No encontramos este negocio. Puede que ya se haya eliminado: actualiza la lista de tenants.";
  return "No se pudo contactar el servidor. Revisa tu conexión y vuelve a intentarlo.";
}
