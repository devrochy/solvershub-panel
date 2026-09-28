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
