import type { SubscriptionProviderSettings } from "@/lib/api/types";

/** Recurrencia del plan en el formulario de producto (HU-SUB-09): vacío = venta única. */
export const COBROS = [
  { value: "", label: "Venta única" },
  { value: "mensual", label: "Plan mensual" },
  { value: "trimestral", label: "Plan trimestral" },
  { value: "anual", label: "Plan anual" },
] as const;

/** Cuerpo que espera la API: `billing_period` "" = no recurrente; prueba vacía = sin cambio. */
export function cuerpoDelPlan(data: FormData): { billing_period: string; trial_days: number | null } {
  const prueba = String(data.get("trial_days") ?? "").trim();
  return {
    billing_period: String(data.get("billing_period") ?? ""),
    trial_days: prueba === "" ? null : Number(prueba),
  };
}

/** Texto del estado del proveedor de suscripciones del negocio. */
export function textoEstado(s: SubscriptionProviderSettings): string {
  if (s.estado === "ok") {
    const label = s.habilitados.find((h) => h.id === s.efectivo)?.label ?? s.efectivo ?? "";
    return `Los planes se cobran con ${label}.`;
  }
  return s.mensaje;
}
