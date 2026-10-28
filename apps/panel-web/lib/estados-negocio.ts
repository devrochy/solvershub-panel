import type { PlatformTenant } from "@/lib/api/types";

export type VarianteDePlan = "neutral" | "success" | "warning" | "danger" | "accent";

export interface EstadoDelPlan {
  label: string;
  variant: VarianteDePlan;
}

/**
 * Estado de la suscripción de un negocio (`/admin/platform/tenants`). El backend usa
 * `active`, `trialing`, `past_due`, `expired` y `canceled`; un negocio sin suscripción
 * llega como `sin_suscripcion`. «Vigente» evita confundirlo con el estado del negocio.
 */
export const ESTADOS_DEL_PLAN: Record<string, { label: string; variant: VarianteDePlan }> = {
  active: { label: "Vigente", variant: "success" },
  trialing: { label: "En prueba", variant: "accent" },
  past_due: { label: "Pago pendiente", variant: "warning" },
  expired: { label: "Vencida", variant: "danger" },
  canceled: { label: "Cancelada", variant: "neutral" },
  sin_suscripcion: { label: "Sin plan", variant: "neutral" },
};

/** Plan y estado de suscripción listos para el badge de la fila. */
export function estadoDelPlan(
  tenant: Pick<PlatformTenant, "status" | "plan_name" | "plan_status" | "operational">,
): EstadoDelPlan {
  const sinPlan =
    !tenant.plan_name ||
    tenant.plan_name === "—" ||
    tenant.plan_status === "sin_suscripcion";
  if (sinPlan) return { label: "Sin plan", variant: "neutral" };

  const estado = ESTADOS_DEL_PLAN[tenant.plan_status] ?? {
    label: tenant.plan_status || "Sin plan",
    variant: "neutral" as const,
  };

  if (
    tenant.status === "active" &&
    !tenant.operational &&
    (tenant.plan_status === "active" || tenant.plan_status === "trialing")
  ) {
    return { label: `${tenant.plan_name} · Sin operar`, variant: "warning" };
  }

  return { label: `${tenant.plan_name} · ${estado.label}`, variant: estado.variant };
}
