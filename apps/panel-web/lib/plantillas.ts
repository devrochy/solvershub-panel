/**
 * Plantillas de WhatsApp por evento (HU-ARCH-13, ADR-0108): lógica pura del editor
 * y del selector del operador.
 */

/** Etiqueta de un evento del catálogo. */
export const EVENTO: Record<string, string> = {
  "subscription.charge_created": "Cargo de suscripción generado",
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
