import { Badge } from "@/components/ui/badge";

type Variant = "neutral" | "success" | "warning" | "danger" | "accent";

export type StatusMap = Record<string, { label: string; variant: Variant }>;

/** Mapa estado→etiqueta/variante por dominio (una sola fuente por concepto). */
export const CONVERSATION_STATUS: StatusMap = {
  open: { label: "Abierta", variant: "accent" },
  escalated: { label: "Escalada", variant: "warning" },
  closed: { label: "Cerrada", variant: "neutral" },
};

export const ESCALATION_STATUS: StatusMap = {
  pendiente: { label: "Pendiente", variant: "warning" },
  asignada: { label: "Asignada", variant: "accent" },
  resuelta: { label: "Resuelta", variant: "success" },
};

export const PLUGIN_STATUS: StatusMap = {
  active: { label: "Activa", variant: "success" },
  configured: { label: "Configurada", variant: "accent" },
  error: { label: "Error", variant: "danger" },
  detected: { label: "Disponible", variant: "neutral" },
};

export const TENANT_STATUS: StatusMap = {
  active: { label: "Activo", variant: "success" },
  suspended: { label: "Suspendido", variant: "warning" },
};

export const PAYMENT_STATUS: StatusMap = {
  approved: { label: "Aprobado", variant: "success" },
  paid: { label: "Pagado", variant: "success" },
  pending: { label: "Pendiente", variant: "warning" },
  declined: { label: "Rechazado", variant: "danger" },
  failed: { label: "Fallido", variant: "danger" },
  // Pagos del plan (`subscription_payments`, ADR-0123): el backend los manda en español.
  aprobado: { label: "Aprobado", variant: "success" },
  pendiente: { label: "Pendiente", variant: "warning" },
  rechazado: { label: "Rechazado", variant: "danger" },
  anulado: { label: "Anulado", variant: "neutral" },
  duplicado: { label: "Pago doble", variant: "danger" },
};

/**
 * Estado de la suscripción de un cliente (`pack_subscriptions`, ADR-0106). `trialing` es la prueba
 * del plan Free; `vencida` = un cobro quedó sin pagar pasados los días de gracia.
 */
export const SUBSCRIPTION_STATUS: StatusMap = {
  pendiente_pago: { label: "Pendiente de pago", variant: "warning" },
  activa: { label: "Activa", variant: "success" },
  trialing: { label: "En prueba", variant: "accent" },
  pausada: { label: "Pausada", variant: "warning" },
  vencida: { label: "Vencida", variant: "danger" },
  cancelada: { label: "Cancelada", variant: "neutral" },
};

/**
 * Estado de un cobro de suscripción. No reutiliza `PAYMENT_STATUS`: el cobro solo es
 * `pendiente`, `pagado` o `anulado` (reemplazado por otro cambio de plan); no hay «rechazado».
 */
export const CHARGE_STATUS: StatusMap = {
  pendiente: { label: "Pendiente", variant: "warning" },
  pagado: { label: "Pagado", variant: "success" },
  anulado: { label: "Anulado", variant: "neutral" },
};

/** Estado de una conexión de Meta (`meta_connections.status`, SPEC-08). */
export const META_CONNECTION_STATUS: StatusMap = {
  draft: { label: "Borrador", variant: "neutral" },
  pending: { label: "Pendiente", variant: "warning" },
  connected: { label: "Conectada", variant: "success" },
  degraded: { label: "Degradada", variant: "warning" },
  revoked: { label: "Pausada", variant: "neutral" },
  error: { label: "Error", variant: "danger" },
};

export function StatusBadge({
  value,
  map,
  fallbackVariant = "neutral",
}: {
  value: string;
  map: StatusMap;
  fallbackVariant?: Variant;
}) {
  const entry = map[value];
  return <Badge variant={entry?.variant ?? fallbackVariant}>{entry?.label ?? value}</Badge>;
}

/** Estado binario activo/inactivo con etiquetas propias del dominio. */
export function BinaryBadge({
  active,
  activeLabel = "Activo",
  inactiveLabel = "Inactivo",
  tone = "success",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  tone?: Variant;
}) {
  return (
    <Badge variant={active ? tone : "neutral"}>{active ? activeLabel : inactiveLabel}</Badge>
  );
}
