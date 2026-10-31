import type { SubscriptionProviderSettings } from "@/lib/api/types";

/** Texto del estado del proveedor de suscripciones del negocio. */
export function textoEstado(s: SubscriptionProviderSettings): string {
  if (s.estado === "ok") {
    const label = s.habilitados.find((h) => h.id === s.efectivo)?.label ?? s.efectivo ?? "";
    return `Los planes se cobran con ${label}.`;
  }
  return s.mensaje;
}
