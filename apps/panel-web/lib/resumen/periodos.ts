/**
 * Ventanas del Resumen (ADR-0171, adenda): 7, 15 o 30 días. La preferencia vive en la URL
 * (`/dashboard?dias=15`) para que el enlace se pueda compartir y el servidor haga el fetch.
 */

export const DIAS_DEL_RESUMEN = [7, 15, 30] as const;
export type DiasDelResumen = (typeof DIAS_DEL_RESUMEN)[number];
export const DIAS_POR_DEFECTO: DiasDelResumen = 7;

export function diasValidos(valor: string | undefined): DiasDelResumen {
  const n = Number(valor);
  return DIAS_DEL_RESUMEN.find((d) => d === n) ?? DIAS_POR_DEFECTO;
}

export function etiquetaDeDias(dias: number): string {
  return `${dias} días`;
}

/** «los 15 días anteriores», para cuando el backend no manda `versus`. */
export function versusDeDias(dias: number): string {
  return `los ${dias} días anteriores`;
}

const fecha = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "UTC" });

/** «20 oct – 28 oct»: el rango que cubre la ventana, sin repetir el año. */
export function rangoDePeriodo(periodo: { desde: string; hasta: string }): string {
  if (!periodo.desde || !periodo.hasta) return "";
  const desde = fecha.format(new Date(periodo.desde));
  const hasta = fecha.format(new Date(periodo.hasta));
  return `${desde} – ${hasta}`;
}
