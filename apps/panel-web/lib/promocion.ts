/**
 * "Pasar a producción" de una conexión BYOK (HU-CONN-06): nombres de los chequeos que corre
 * el backend con la app del negocio y el paso en el que va la guía.
 */

const NOMBRES: Record<string, string> = {
  own_app: "Tu app de Meta",
  token_valid: "Token de acceso",
  app_subscription_active: "Webhook de tu app",
  real_number: "Número real",
  number_registered: "Número registrado",
  waba_subscribed_to_own_app: "WABA suscrita a tu app",
  templates: "Plantillas aprobadas",
};

export function nombreCheckPromocion(key: string): string {
  return NOMBRES[key] ?? key;
}

export type PasoPromocion = { key: string; label: string; done: boolean; detail?: string };

/** Primer paso sin hacer (la guía lo abre); `null` si están todos. */
export function pasoActual(pasos: PasoPromocion[]): string | null {
  return pasos.find((p) => !p.done)?.key ?? null;
}

/** Un chequeo bloquea solo si dio `false`; `null` es "no se pudo evaluar". */
export function bloquean(checks: { ok: boolean | null }[]): number {
  return checks.filter((c) => c.ok === false).length;
}
