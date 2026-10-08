/**
 * Checks de salud de una conexión Meta (HU-CONN-04): nombre legible y reparación de cada uno.
 *
 * El backend manda en `repair_action` un id corto, nunca una ruta; acá se traduce a un enlace
 * o a una acción de `/api/meta/health/{id}`.
 */
import type { components } from "@/lib/api/schema";

export type HealthCheck = components["schemas"]["HealthCheck"];

const NOMBRES: Record<string, string> = {
  token_valid: "Token de acceso",
  app_subscription_active: "Suscripción de la app",
  own_app_subscribed: "WABA suscrita a tu app",
  webhook_subscribed: "Suscripción de la WABA",
  number_registered: "Número registrado",
  webhook_override: "Webhook del número",
  templates: "Plantillas",
  billing: "Facturación",
};

/** `number_registered:<id>` (con varios números) → "Número registrado (<id>)". */
export function nombreDelCheck(key: string): string {
  const [base, numero] = key.split(":", 2);
  const nombre = NOMBRES[base] ?? base;
  return numero ? `${nombre} (${numero})` : nombre;
}

export type Reparacion =
  | { tipo: "enlace"; href: string; label: string }
  | { tipo: "accion"; accion: "resubscribe" | "extend_token"; label: string };

/** Ancla de la sección de suscripciones de webhook en la misma página. */
export const ANCLA_WEBHOOKS = "suscripciones-webhook";

/** Ancla del selector de facturación manual de una conexión. */
export function anclaFacturacion(connectionId: string): string {
  return `facturacion-${connectionId}`;
}

export function reparacion(action: string | null | undefined, connectionId: string): Reparacion | null {
  switch (action) {
    case "reauthorize":
      return { tipo: "enlace", href: "/conexiones/whatsapp", label: "Reconectar" };
    case "refresh_token":
      return { tipo: "accion", accion: "extend_token", label: "Extender token" };
    case "subscribe_waba":
      return { tipo: "accion", accion: "resubscribe", label: "Re-suscribir WABA" };
    case "resubscribe_app":
      return { tipo: "enlace", href: `#${ANCLA_WEBHOOKS}`, label: "Registrar webhook" };
    case "sync_templates":
      return { tipo: "enlace", href: `/conexiones/meta/${connectionId}/plantillas`, label: "Ver plantillas" };
    case "configure_billing":
      return { tipo: "enlace", href: `#${anclaFacturacion(connectionId)}`, label: "Marcar facturación" };
    default:
      return null;
  }
}

/**
 * Un check fallido muestra su reparación. Uno que no se pudo evaluar (`ok: null`) también,
 * salvo facturación, que siempre es manual y ya tiene su selector en la tarjeta.
 */
export function muestraReparacion(check: HealthCheck): boolean {
  if (check.ok === true) return false;
  if (check.ok === null || check.ok === undefined) return check.key !== "billing";
  return true;
}
