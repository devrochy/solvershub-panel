import { Badge } from "@/components/ui/badge";

type Variant = "neutral" | "success" | "warning" | "danger" | "accent";

export type StatusMap = Record<string, { label: string; variant: Variant }>;

/** Mapa estado→etiqueta/variante por dominio (una sola fuente por concepto). */
export const CONVERSATION_STATUS: StatusMap = {
  open: { label: "Abierta", variant: "accent" },
  escalated: { label: "Escalada", variant: "warning" },
  closed: { label: "Cerrada", variant: "neutral" },
  resolved: { label: "Resuelta", variant: "neutral" },
};

export const ESCALATION_STATUS: StatusMap = {
  pendiente: { label: "Pendiente", variant: "warning" },
  asignada: { label: "Asignada", variant: "accent" },
  resuelta: { label: "Resuelta", variant: "success" },
  pending: { label: "Pendiente", variant: "warning" },
  assigned: { label: "Asignada", variant: "accent" },
  resolved: { label: "Resuelta", variant: "success" },
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

/** Lo que ve el negocio de una suscripción (SUS-06): un solo estado, la pausa por mora incluida. */
export const SUBSCRIPTION_SITUATION: StatusMap = {
  ...SUBSCRIPTION_STATUS,
  pendiente_pago: { label: "Esperando el primer pago", variant: "warning" },
  pausada_mora: { label: "Pausada por mora", variant: "warning" },
  pausada_negocio: { label: "Pausada por el negocio", variant: "warning" },
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

/**
 * Estado de un cron de la plataforma (ADR-0183). «Sin historial» = el cron no guarda sus
 * ejecuciones exitosas (latido, outbox): no es «nunca corrió».
 */
export const CRON_STATUS: StatusMap = {
  ok: { label: "Al día", variant: "success" },
  running: { label: "Ejecutando", variant: "accent" },
  failing: { label: "Con fallo", variant: "danger" },
  paused: { label: "Pausado", variant: "warning" },
  never: { label: "Sin ejecutar", variant: "neutral" },
  untracked: { label: "Sin historial", variant: "neutral" },
};

/** Resultado de una ejecución de un cron (`cron_runs.status`). */
export const CRON_RUN_STATUS: StatusMap = {
  success: { label: "Exitosa", variant: "success" },
  failed: { label: "Fallida", variant: "danger" },
  running: { label: "En curso", variant: "accent" },
  skipped: { label: "Omitida", variant: "neutral" },
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

const ESTADO_COMUN: Record<string, string> = {
  open: "Abierta",
  closed: "Cerrada",
  escalated: "Escalada",
  resolved: "Resuelta",
  pending: "Pendiente",
  assigned: "Asignada",
  active: "Activa",
  failed: "Fallida",
};

/** Texto para un estado fuera del mapa de su dominio: nunca se muestra el enum crudo. */
export function estadoLegible(value: string): string {
  const comun = ESTADO_COMUN[value];
  if (comun) return comun;
  const texto = value.replace(/[_-]+/g, " ").trim();
  return texto ? `${texto[0].toUpperCase()}${texto.slice(1)}` : "Sin estado";
}

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
  if (!entry && process.env.NODE_ENV === "development") {
    console.warn(`StatusBadge: falta «${value}» en el mapa de estados.`);
  }
  return <Badge variant={entry?.variant ?? fallbackVariant}>{entry?.label ?? estadoLegible(value)}</Badge>;
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
