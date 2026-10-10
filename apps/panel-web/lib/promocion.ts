/**
 * "Pasar a producción" de una conexión BYOK (HU-CONN-06): el paso en el que va la guía y cuántos
 * chequeos bloquean. Los chequeos son los del checklist por conexión (HU-CONN-07) y llegan con su
 * etiqueta desde el backend.
 */

export type PasoPromocion = { key: string; label: string; done: boolean; detail?: string };

/** Primer paso sin hacer (la guía lo abre); `null` si están todos. */
export function pasoActual(pasos: PasoPromocion[]): string | null {
  return pasos.find((p) => !p.done)?.key ?? null;
}

/** Un chequeo bloquea solo si dio `false`; `null` es "no se pudo evaluar". */
export function bloquean(checks: { ok?: boolean | null }[]): number {
  return checks.filter((c) => c.ok === false).length;
}
