/**
 * Plantillas de WhatsApp por evento (HU-ARCH-13, ADR-0108): lógica pura del editor
 * y del selector del operador.
 */

/** Etiqueta de un evento del catálogo. */
export const EVENTO: Record<string, string> = {
  "subscription.charge_created": "Cargo de suscripción generado",
  "subscription.charge_reminder": "Recordatorio de pago de suscripción",
  "subscription.paused": "Suscripción pausada por mora",
  "subscription.trial_ending": "Fin de la prueba gratis",
  "appointment.confirmed": "Cita agendada desde el panel",
  "appointment.reminder": "Recordatorio de cita",
  "appointment.no_show": "Cita perdida: oferta de reagendar",
};

export function eventoLabel(evento: string): string {
  return EVENTO[evento] ?? evento;
}

/** Cuerpo con los `{{n}}`/`{{nombre}}` reemplazados; lo que falta queda como `[n]`. */
export function rellenarCuerpo(cuerpo: string, valores: Record<string, string>): string {
  return cuerpo.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_m, nombre: string) => {
    const valor = valores[nombre]?.trim();
    return valor ? valor : `[${nombre}]`;
  });
}

/** Mapeo placeholder → ruta, en la forma que espera la API (lista o con nombre). */
export function mapeoParaApi(
  variables: string[],
  named: boolean,
  rutas: Record<string, string>,
): string[] | Record<string, string> {
  if (named) return Object.fromEntries(variables.map((v) => [v, rutas[v] ?? ""]));
  return variables.map((v) => rutas[v] ?? "");
}

/** Rutas actuales de un mapeo guardado, por placeholder. */
export function rutasDesdeApi(
  variables: string[],
  guardado: string[] | Record<string, string> | undefined,
): Record<string, string> {
  if (!guardado) return {};
  if (Array.isArray(guardado)) {
    return Object.fromEntries(variables.map((v, i) => [v, guardado[i] ?? ""]));
  }
  return Object.fromEntries(variables.map((v) => [v, guardado[v] ?? ""]));
}

/** Placeholders sin completar (para no dejar enviar ni guardar a medias). */
export function faltantes(variables: string[], valores: Record<string, string>): string[] {
  return variables.filter((v) => !valores[v]?.trim());
}

/** Clave estable de una plantilla en un `<select>`. */
export function claveDePlantilla(nombre: string, idioma: string): string {
  return `${nombre}|${idioma}`;
}

/**
 * Avisos sin plantilla de los últimos 7 días, separados por origen (SPEC-40): los de un evento se arreglan en
 * «Plantillas por evento»; los de una plantilla con opciones, en «Plantillas con opciones». Un backend que
 * todavía no manda el desglose (o lo manda en cero con un total) cuenta todo como evento, como antes.
 */
export function desglosarFaltantes(datos: {
  total_7d: number;
  total_eventos_7d?: number | null;
  total_opciones_7d?: number | null;
  recent?: { tipo?: string | null; clave?: string | null }[] | null;
}): { eventos: number; opciones: number; clavesDeOpciones: string[] } {
  const opciones = Math.max(0, datos.total_opciones_7d ?? 0);
  const conDesglose = (datos.total_eventos_7d ?? 0) + opciones > 0;
  const eventos = conDesglose ? Math.max(0, datos.total_eventos_7d ?? 0) : datos.total_7d;
  const claves: string[] = [];
  for (const item of datos.recent ?? []) {
    if (item.tipo === "opcion" && item.clave && !claves.includes(item.clave)) claves.push(item.clave);
  }
  return { eventos, opciones: conDesglose ? opciones : 0, clavesDeOpciones: claves.slice(0, 3) };
}
